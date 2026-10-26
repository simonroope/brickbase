// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/AssetVault.sol";

/**
 * @title AssetVaultTestHelper
 * @notice Test helper that allows populating assets for unit tests.
 * @dev Only for use in test environments - assets mapping is normally populated by vault flow.
 */
contract AssetVaultTestHelper is AssetVault {
    address private _hook;
    bytes private _hookData;

    constructor(address _userAllowList) AssetVault(_userAllowList) {}

    function setReenterHook(address hook, bytes calldata data) external {
        _hook = hook;
        _hookData = data;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
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
        return from;
    }
    /**
     * @notice Set asset data for testing (ASSET_MANAGER_ROLE only).
     */
    function mintForTest(address to, uint256 tokenId) external onlyRole(ASSET_MANAGER_ROLE) {
        _mint(to, tokenId);
    }

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
