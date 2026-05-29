// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Wrapped OPN
/// @notice Minimal WETH-style wrapper so native OPN can be used as an ERC-20
///         asset by ArticleVault (ERC-4626) and other DeFi primitives.
/// @dev    Deposits return WOPN 1:1. Withdrawals burn WOPN and return native OPN.
contract WOPN is ERC20 {
    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    error WithdrawFailed();

    constructor() ERC20("Wrapped OPN", "WOPN") {}

    receive() external payable {
        deposit();
    }

    /// @notice Deposit native OPN, mint WOPN 1:1.
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Burn WOPN and receive native OPN 1:1.
    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert WithdrawFailed();
        emit Withdrawal(msg.sender, amount);
    }
}
