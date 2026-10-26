// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/AssetShares.sol";

/**
 * @title AssetSharesTestHelper
 * @notice Test helper that allows populating shareInfo and minting tokens for unit tests.
 * @dev Only for use in test environments - shareInfo is normally populated by asset creation flow.
 */
contract AssetSharesTestHelper is AssetShares {
    address private _hook;
    bytes private _hookData;

    constructor(address _usdcAddress, address _assetVault, address _userAllowList, string memory uri)
        AssetShares(_usdcAddress, _assetVault, _userAllowList, uri)
    {}

    function setReenterHook(address hook, bytes calldata data) external {
        _hook = hook;
        _hookData = data;
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        super._update(from, to, ids, values);
        if (_hook != address(0)) {
            address hook = _hook;
            bytes memory data = _hookData;
            _hook = address(0);
            (bool ok, bytes memory ret) = hook.call(data);
            if (!ok) {
                assembly {
                    revert(add(ret, 32), mload(ret))
                }
            }
        }
    }

    /**
     * @notice Set shareInfo for testing (ASSET_MANAGER_ROLE only).
     */
    function setShareInfoForTest(
        uint256 assetId,
        uint256 totalSupply_,
        uint256 availableSupply_,
        uint256 sharePrice_,
        bool tradingEnabled_
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        shareInfo[assetId] = ShareInfo({
            totalSupply: totalSupply_,
            availableSupply: availableSupply_,
            sharePrice: sharePrice_,
            tradingEnabled: tradingEnabled_,
            createdAt: block.timestamp,
            updatedAt: 0
        });
    }

    /**
     * @notice Mint shares to a user for testing (ASSET_MANAGER_ROLE only).
     */
    function mintSharesForTest(
        address to,
        uint256 assetId,
        uint256 amount
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        _mint(to, assetId, amount, "");
    }

    /**
     * @notice Set purchase price for testing (ASSET_MANAGER_ROLE only).
     */
    function setPurchasePriceForTest(
        address user,
        uint256 assetId,
        uint256 price
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        purchasePrice[user][assetId] = price;
    }
}
