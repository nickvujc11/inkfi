// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {WOPN} from "./WOPN.sol";
import {ArticleNFT} from "./ArticleNFT.sol";
import {ArticleVaultPool} from "./ArticleVaultPool.sol";

/// @title  TippingRouter
/// @notice Single entrypoint for tips to articles. Splits each tip three ways:
///           - writerBps  (default 7000) -> article writer
///           - stakerBps  (default 2500) -> ArticleVaultPool reward
///           - treasuryBps (default  500) -> protocol treasury
///         Sum must be 10_000. Readers can tip in native OPN (msg.value) or
///         in WOPN directly.
contract TippingRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant BPS_DENOM = 10_000;

    WOPN public immutable wopn;
    ArticleNFT public immutable articles;
    ArticleVaultPool public immutable vaultPool;

    address public treasury;
    uint16 public writerBps = 7_000;
    uint16 public stakerBps = 2_500;
    uint16 public treasuryBps = 500;

    event Tipped(
        uint256 indexed articleId,
        address indexed from,
        address indexed writer,
        uint256 total,
        uint256 toWriter,
        uint256 toStakers,
        uint256 toTreasury,
        string memo
    );
    event SplitsUpdated(uint16 writerBps, uint16 stakerBps, uint16 treasuryBps);
    event TreasuryUpdated(address indexed treasury);

    error UnknownArticle();
    error ZeroTip();
    error InvalidSplits();

    constructor(
        WOPN _wopn,
        ArticleNFT _articles,
        ArticleVaultPool _vaultPool,
        address _treasury
    ) Ownable(msg.sender) {
        wopn = _wopn;
        articles = _articles;
        vaultPool = _vaultPool;
        treasury = _treasury;
    }

    // -------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------

    function setSplits(
        uint16 _writerBps,
        uint16 _stakerBps,
        uint16 _treasuryBps
    ) external onlyOwner {
        if (
            uint256(_writerBps) + _stakerBps + _treasuryBps != BPS_DENOM
        ) revert InvalidSplits();
        writerBps = _writerBps;
        stakerBps = _stakerBps;
        treasuryBps = _treasuryBps;
        emit SplitsUpdated(_writerBps, _stakerBps, _treasuryBps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    // -------------------------------------------------------------------
    // Tipping
    // -------------------------------------------------------------------

    /// @notice Tip an article with native OPN. Amount = msg.value.
    function tipNative(
        uint256 articleId,
        string calldata memo
    ) external payable nonReentrant {
        if (msg.value == 0) revert ZeroTip();
        // Wrap native OPN to WOPN held by this router
        wopn.deposit{value: msg.value}();
        _routeTip(articleId, msg.sender, msg.value, memo);
    }

    /// @notice Tip an article using WOPN. Caller must approve `amount` to this contract.
    function tipWOPN(
        uint256 articleId,
        uint256 amount,
        string calldata memo
    ) external nonReentrant {
        if (amount == 0) revert ZeroTip();
        IERC20(address(wopn)).safeTransferFrom(msg.sender, address(this), amount);
        _routeTip(articleId, msg.sender, amount, memo);
    }

    function _routeTip(
        uint256 articleId,
        address from,
        uint256 amount,
        string calldata memo
    ) private {
        address writer = articles.writerOf(articleId);
        if (writer == address(0)) revert UnknownArticle();

        uint256 toWriter = (amount * writerBps) / BPS_DENOM;
        uint256 toStakers = (amount * stakerBps) / BPS_DENOM;
        uint256 toTreasury = amount - toWriter - toStakers; // dust safe

        // 2. stakers (via vault pool). If no stakers exist for this article,
        //    redirect the staker share to the writer so funds never stuck.
        if (toStakers > 0) {
            if (vaultPool.totalStaked(articleId) == 0) {
                toWriter += toStakers;
                toStakers = 0;
            } else {
                IERC20(address(wopn)).safeTransfer(
                    address(vaultPool),
                    toStakers
                );
                vaultPool.notifyReward(articleId, toStakers);
            }
        }

        // 1. writer
        if (toWriter > 0) {
            IERC20(address(wopn)).safeTransfer(writer, toWriter);
        }

        // 3. treasury
        if (toTreasury > 0) {
            IERC20(address(wopn)).safeTransfer(treasury, toTreasury);
        }

        emit Tipped(
            articleId,
            from,
            writer,
            amount,
            toWriter,
            toStakers,
            toTreasury,
            memo
        );
    }

    receive() external payable {
        revert("use tipNative");
    }
}
