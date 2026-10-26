// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../core/AssetShares.sol";

/// @dev Test-only buyer that reenters AssetShares.tradeShares on ERC-1155 receipt.
contract ReenterShareReceiver is IERC1155Receiver {
    AssetShares public immutable shares;
    uint256 public assetId;
    address public seller;
    uint256 public amount;
    uint256 public pricePerShare;
    bool public forceOnReceive;

    constructor(AssetShares shares_) {
        shares = shares_;
    }

    function arm(uint256 assetId_, address seller_, uint256 amount_, uint256 pricePerShare_) external {
        assetId = assetId_;
        seller = seller_;
        amount = amount_;
        pricePerShare = pricePerShare_;
    }

    function approveUsdc(IERC20 usdc, uint256 value) external {
        usdc.approve(address(shares), value);
    }

    function buy() external {
        shares.tradeShares(assetId, seller, amount, pricePerShare);
    }

    function purchase(uint256 id, uint256 value) external {
        shares.purchaseAssetShares(id, value);
    }

    function enableForceOnReceive() external {
        forceOnReceive = true;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external override returns (bytes4) {
        if (forceOnReceive) {
            shares.forcedTransfer(seller, address(this), assetId, amount);
        } else {
            shares.tradeShares(assetId, seller, amount, pricePerShare);
        }
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
