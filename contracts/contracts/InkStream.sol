// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title  InkStream
/// @notice Per-second subscription streaming. A reader funds a stream to a
///         writer at a fixed `ratePerSecond`. The writer can withdraw
///         continuously; the reader can top up or cancel at any time and get
///         the unstreamed remainder back.
/// @dev    OPN Chain's ~1s block time is what makes per-second streams
///         actually feel real-time. Inspired by Sablier v1, simplified for the
///         creator-economy use case (single asset, open-ended duration).
contract InkStream is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset; // WOPN

    struct Stream {
        address sender;
        address recipient;
        uint128 deposited; // total ever deposited (for accounting)
        uint128 withdrawn; // total ever withdrawn by recipient
        uint128 ratePerSecond;
        uint64 startedAt;
        uint64 stoppedAt; // 0 while active
    }

    uint256 public nextStreamId;
    mapping(uint256 => Stream) public streams;

    event StreamOpened(
        uint256 indexed id,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        uint256 ratePerSecond
    );
    event StreamFunded(uint256 indexed id, address indexed funder, uint256 amount);
    event StreamWithdrawn(uint256 indexed id, address indexed recipient, uint256 amount);
    event StreamCancelled(
        uint256 indexed id,
        uint256 senderRefund,
        uint256 recipientPayout
    );

    error ZeroRate();
    error ZeroDeposit();
    error InvalidRecipient();
    error NotSender();
    error NotRecipient();
    error StreamInactive();
    error NothingStreamed();

    constructor(IERC20 _asset) {
        asset = _asset;
    }

    // -------------------------------------------------------------------
    // Open / fund / cancel  (sender side)
    // -------------------------------------------------------------------

    /// @notice Open a new stream from `msg.sender` to `recipient`.
    /// @dev    Sender must have approved `deposit` of `asset` to this contract.
    function open(
        address recipient,
        uint256 deposit,
        uint256 ratePerSecond
    ) external nonReentrant returns (uint256 id) {
        if (recipient == address(0) || recipient == msg.sender)
            revert InvalidRecipient();
        if (ratePerSecond == 0) revert ZeroRate();
        if (deposit == 0) revert ZeroDeposit();

        asset.safeTransferFrom(msg.sender, address(this), deposit);

        id = ++nextStreamId;
        streams[id] = Stream({
            sender: msg.sender,
            recipient: recipient,
            deposited: uint128(deposit),
            withdrawn: 0,
            ratePerSecond: uint128(ratePerSecond),
            startedAt: uint64(block.timestamp),
            stoppedAt: 0
        });

        emit StreamOpened(id, msg.sender, recipient, deposit, ratePerSecond);
    }

    /// @notice Top up an existing active stream.
    function fund(uint256 id, uint256 amount) external nonReentrant {
        Stream storage s = streams[id];
        if (s.stoppedAt != 0) revert StreamInactive();
        if (amount == 0) revert ZeroDeposit();
        asset.safeTransferFrom(msg.sender, address(this), amount);
        s.deposited += uint128(amount);
        emit StreamFunded(id, msg.sender, amount);
    }

    /// @notice Cancel a stream. Sender gets the unstreamed remainder back, the
    ///         recipient receives any owed-but-unwithdrawn portion.
    function cancel(uint256 id) external nonReentrant {
        Stream storage s = streams[id];
        if (s.stoppedAt != 0) revert StreamInactive();
        if (msg.sender != s.sender) revert NotSender();

        uint256 streamed = _streamedSoFar(s);
        uint256 owed = streamed - s.withdrawn; // to recipient
        uint256 leftover = uint256(s.deposited) - streamed; // to sender

        s.stoppedAt = uint64(block.timestamp);
        if (owed > 0) {
            s.withdrawn += uint128(owed);
            asset.safeTransfer(s.recipient, owed);
        }
        if (leftover > 0) {
            asset.safeTransfer(s.sender, leftover);
        }
        emit StreamCancelled(id, leftover, owed);
    }

    // -------------------------------------------------------------------
    // Withdraw  (recipient side)
    // -------------------------------------------------------------------

    /// @notice Withdraw streamed-but-unwithdrawn balance to recipient.
    function withdraw(uint256 id) external nonReentrant returns (uint256) {
        Stream storage s = streams[id];
        if (msg.sender != s.recipient) revert NotRecipient();

        uint256 streamed = _streamedSoFar(s);
        uint256 owed = streamed - s.withdrawn;
        if (owed == 0) revert NothingStreamed();

        s.withdrawn += uint128(owed);
        // If stream is dry, mark as stopped so future cancel/withdraw revert clean.
        if (s.stoppedAt == 0 && streamed >= s.deposited) {
            s.stoppedAt = uint64(block.timestamp);
        }
        asset.safeTransfer(s.recipient, owed);
        emit StreamWithdrawn(id, s.recipient, owed);
        return owed;
    }

    // -------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------

    function streamedSoFar(uint256 id) external view returns (uint256) {
        return _streamedSoFar(streams[id]);
    }

    function withdrawable(uint256 id) external view returns (uint256) {
        Stream memory s = streams[id];
        return _streamedSoFar(s) - s.withdrawn;
    }

    function remaining(uint256 id) external view returns (uint256) {
        Stream memory s = streams[id];
        uint256 streamed = _streamedSoFar(s);
        return streamed >= s.deposited ? 0 : uint256(s.deposited) - streamed;
    }

    function _streamedSoFar(Stream memory s) private view returns (uint256) {
        if (s.startedAt == 0) return 0;
        uint256 endTs = s.stoppedAt == 0 ? block.timestamp : s.stoppedAt;
        if (endTs <= s.startedAt) return 0;
        uint256 elapsed = endTs - s.startedAt;
        uint256 streamed = elapsed * uint256(s.ratePerSecond);
        if (streamed > s.deposited) streamed = s.deposited;
        return streamed;
    }
}
