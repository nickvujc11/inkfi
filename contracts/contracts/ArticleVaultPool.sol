// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ArticleNFT} from "./ArticleNFT.sol";

/// @title  ArticleVaultPool
/// @notice Per-article staking pools where readers stake WOPN on articles
///         they believe in. When the article is tipped, the staker share of
///         the tip is distributed pro-rata to active stakers using the
///         classic accumulator (rewardPerToken) pattern popularised by
///         Synthetix StakingRewards and SushiSwap MasterChef.
/// @dev    Single contract, many pools (one per articleId). Reward token is
///         the same as the staking token (WOPN), making this a self-yielding
///         vault. Stakers can withdraw principal at any time and claim
///         accrued rewards independently.
contract ArticleVaultPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @dev 1e18 precision for accumulator math.
    uint256 private constant ACC_PRECISION = 1e18;

    IERC20 public immutable asset; // WOPN
    ArticleNFT public immutable articles;

    /// @notice Authorised callers of `notifyReward` (TippingRouter, etc).
    mapping(address => bool) public rewardNotifier;

    struct PoolInfo {
        uint128 totalStaked;
        uint128 accRewardPerShare; // scaled by ACC_PRECISION
    }

    struct UserInfo {
        uint128 staked;
        uint128 rewardDebt; // accRewardPerShare * staked / 1e18 at last update
        uint128 pending; // crystallised but unclaimed rewards
    }

    /// @dev articleId => pool
    mapping(uint256 => PoolInfo) public pools;
    /// @dev articleId => user => stake info
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    event Staked(uint256 indexed articleId, address indexed user, uint256 amount);
    event Unstaked(uint256 indexed articleId, address indexed user, uint256 amount);
    event RewardClaimed(uint256 indexed articleId, address indexed user, uint256 amount);
    event RewardNotified(uint256 indexed articleId, address indexed from, uint256 amount);
    event NotifierUpdated(address indexed who, bool allowed);

    error UnknownArticle();
    error ZeroAmount();
    error NotNotifier();
    error InsufficientStake();
    error NoStakers();

    constructor(IERC20 _asset, ArticleNFT _articles) Ownable(msg.sender) {
        asset = _asset;
        articles = _articles;
    }

    // -------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------

    function setNotifier(address who, bool allowed) external onlyOwner {
        rewardNotifier[who] = allowed;
        emit NotifierUpdated(who, allowed);
    }

    // -------------------------------------------------------------------
    // Staking
    // -------------------------------------------------------------------

    /// @notice Stake `amount` of WOPN on article `articleId`.
    function stake(uint256 articleId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (articles.writerOf(articleId) == address(0)) revert UnknownArticle();

        _crystallise(articleId, msg.sender);
        asset.safeTransferFrom(msg.sender, address(this), amount);

        UserInfo storage u = userInfo[articleId][msg.sender];
        PoolInfo storage p = pools[articleId];
        u.staked += uint128(amount);
        p.totalStaked += uint128(amount);
        u.rewardDebt = uint128(
            (uint256(u.staked) * p.accRewardPerShare) / ACC_PRECISION
        );

        emit Staked(articleId, msg.sender, amount);
    }

    /// @notice Withdraw `amount` of staked WOPN from article `articleId`.
    function unstake(uint256 articleId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        UserInfo storage u = userInfo[articleId][msg.sender];
        if (u.staked < amount) revert InsufficientStake();

        _crystallise(articleId, msg.sender);

        PoolInfo storage p = pools[articleId];
        u.staked -= uint128(amount);
        p.totalStaked -= uint128(amount);
        u.rewardDebt = uint128(
            (uint256(u.staked) * p.accRewardPerShare) / ACC_PRECISION
        );

        asset.safeTransfer(msg.sender, amount);
        emit Unstaked(articleId, msg.sender, amount);
    }

    /// @notice Claim accrued rewards for article `articleId`.
    function claim(uint256 articleId) external nonReentrant returns (uint256) {
        _crystallise(articleId, msg.sender);
        UserInfo storage u = userInfo[articleId][msg.sender];
        uint256 amount = u.pending;
        if (amount == 0) return 0;
        u.pending = 0;
        asset.safeTransfer(msg.sender, amount);
        emit RewardClaimed(articleId, msg.sender, amount);
        return amount;
    }

    // -------------------------------------------------------------------
    // Reward notification (called by TippingRouter)
    // -------------------------------------------------------------------

    /// @notice Push `amount` of WOPN as reward to article `articleId`'s pool.
    /// @dev    Caller must have already transferred `amount` to this contract.
    ///         Reverts if there are no stakers — caller is expected to check
    ///         `pools(articleId).totalStaked` first and route elsewhere.
    function notifyReward(uint256 articleId, uint256 amount) external {
        if (!rewardNotifier[msg.sender]) revert NotNotifier();
        PoolInfo storage p = pools[articleId];
        if (p.totalStaked == 0) revert NoStakers();
        p.accRewardPerShare += uint128(
            (amount * ACC_PRECISION) / p.totalStaked
        );
        emit RewardNotified(articleId, msg.sender, amount);
    }

    /// @notice Returns the total staked for an article (used by callers to
    ///         decide whether to call `notifyReward` or fallback-route).
    function totalStaked(uint256 articleId) external view returns (uint256) {
        return pools[articleId].totalStaked;
    }

    // -------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------

    function pendingReward(
        uint256 articleId,
        address user
    ) external view returns (uint256) {
        UserInfo memory u = userInfo[articleId][user];
        PoolInfo memory p = pools[articleId];
        uint256 acc = (uint256(u.staked) * p.accRewardPerShare) /
            ACC_PRECISION;
        return uint256(u.pending) + (acc - u.rewardDebt);
    }

    // -------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------

    function _crystallise(uint256 articleId, address user) private {
        UserInfo storage u = userInfo[articleId][user];
        PoolInfo storage p = pools[articleId];
        if (u.staked > 0) {
            uint256 acc = (uint256(u.staked) * p.accRewardPerShare) /
                ACC_PRECISION;
            uint256 owed = acc - u.rewardDebt;
            if (owed > 0) {
                u.pending += uint128(owed);
            }
            u.rewardDebt = uint128(acc);
        }
    }
}
