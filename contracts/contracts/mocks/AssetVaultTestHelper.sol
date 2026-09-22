// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/AssetVault.sol";

/**
 * @title AssetVaultTestHelper
 * @notice Test helper that allows populating assets for unit tests.
 * @dev Only for use in test environments - assets mapping is normally populated by vault flow.
 */
contract AssetVaultTestHelper is AssetVault {
    constructor(address _userAllowList) AssetVault(_userAllowList) {}
    /**
     * @notice Set asset data for testing (ASSET_MANAGER_ROLE only).
     */
    function setAssetForTest(
        uint256 assetId,
        AssetStatus status_,
        uint256 capitalValue_,
        uint256 incomeValue_,
        string calldata metadataURI_
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        _assets[assetId] = Asset({
            status: status_,
            capitalValue: capitalValue_,
            incomeValue: incomeValue_,
            metadataURI: metadataURI_,
            createdAt: block.timestamp,
            updatedAt: 0
        });
    }
}
