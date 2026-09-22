// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../lib/forge-std/src/Test.sol";
import "../../contracts/core/AssetVault.sol";
import "../../contracts/core/AssetUserAllowList.sol";

/**
 * @title AssetVaultHandler
 * @notice Handler contract for guided fuzzing of AssetVault
 */
contract AssetVaultHandler is Test {
    AssetVault public assetVault;
    AssetUserAllowList public allowList;

    address[] public actors;
    uint256[] public createdAssetIds;
    mapping(uint256 => bool) public assetFrozen;
    uint256 public lastAssetId;
    uint256 private _assetCounter;

    uint256 public constant MAX_VALUE = 100_000_000e6; // 100M

    constructor(AssetVault _assetVault, AssetUserAllowList _allowList, address[] memory _actors) {
        assetVault = _assetVault;
        allowList = _allowList;
        actors = _actors;
    }

    function createAsset(uint256 capitalValue, uint256 incomeValue) external returns (uint256) {
        capitalValue = bound(capitalValue, 1, MAX_VALUE);
        incomeValue = bound(incomeValue, 0, MAX_VALUE);

        // Generate unique URI
        string memory uri = string(abi.encodePacked("ipfs://handler-", vm.toString(_assetCounter)));
        _assetCounter++;

        uint256 assetId = assetVault.createAsset(
            AssetVault.AssetStatus.Active,
            capitalValue,
            incomeValue,
            uri
        );
        createdAssetIds.push(assetId);

        if (assetId > lastAssetId) {
            lastAssetId = assetId;
        }

        return assetId;
    }

    function freezeAsset(uint256 assetIdSeed) external {
        if (createdAssetIds.length == 0) return;

        uint256 assetId = createdAssetIds[assetIdSeed % createdAssetIds.length];
        assetVault.setFrozenToken(assetId, true);
        assetFrozen[assetId] = true;
    }

    function unfreezeAsset(uint256 assetIdSeed) external {
        if (createdAssetIds.length == 0) return;

        uint256 assetId = createdAssetIds[assetIdSeed % createdAssetIds.length];
        assetVault.setFrozenToken(assetId, false);
        assetFrozen[assetId] = false;
    }

    function transferAsset(uint256 assetIdSeed, uint256 fromSeed, uint256 toSeed) external {
        if (createdAssetIds.length == 0 || actors.length < 2) return;

        uint256 assetId = createdAssetIds[assetIdSeed % createdAssetIds.length];
        address from = actors[fromSeed % actors.length];
        address to = actors[toSeed % actors.length];

        if (from == to) return;

        // Check if from owns the asset
        try assetVault.ownerOf(assetId) returns (address owner) {
            if (owner != from) return;
        } catch {
            return;
        }

        // Check compliance
        if (!assetVault.canTransfer(from, to, assetId)) return;

        vm.prank(from);
        assetVault.transferFrom(from, to, assetId);
    }

    function getCreatedAssetIds() external view returns (uint256[] memory) {
        return createdAssetIds;
    }

    function getActors() external view returns (address[] memory) {
        return actors;
    }
}

/**
 * @title AssetVaultInvariantTest
 * @notice Foundry invariant tests for AssetVault contract
 */
contract AssetVaultInvariantTest is Test {
    AssetVault public assetVault;
    AssetUserAllowList public allowList;
    AssetVaultHandler public handler;

    address[] public actors;

    function setUp() public {
        // Deploy infrastructure
        allowList = new AssetUserAllowList();
        assetVault = new AssetVault(address(allowList));

        // Setup allowlist
        allowList.setAuthorizedCaller(address(assetVault), true);
        allowList.setAuthorizedCaller(address(this), true);

        // Create actors
        for (uint256 i = 1; i <= 5; i++) {
            address actor = address(uint160(0x2000 + i));
            actors.push(actor);
            allowList.setUserAllowed(actor, true);
        }
        // Also allow the test contract
        allowList.setUserAllowed(address(this), true);

        // Deploy handler
        handler = new AssetVaultHandler(assetVault, allowList, actors);

        // Grant handler necessary roles
        assetVault.grantRole(assetVault.ASSET_MANAGER_ROLE(), address(handler));
        assetVault.grantRole(assetVault.COMPLIANCE_OFFICER_ROLE(), address(handler));

        // Authorize handler on allowlist
        allowList.setAuthorizedCaller(address(handler), true);
        allowList.setUserAllowed(address(handler), true);

        // Target only the handler for fuzzing
        targetContract(address(handler));
    }

    /// @notice Asset IDs should be strictly increasing (sequential)
    function invariant_assetIdsSequential() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        for (uint256 i = 1; i < assetIds.length; i++) {
            assertGt(assetIds[i], assetIds[i - 1], "Asset IDs not sequential");
        }
    }

    /// @notice Asset IDs should start from 1 (not 0)
    function invariant_assetIdStartsFromOne() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        if (assetIds.length > 0) {
            assertGe(assetIds[0], 1, "First asset ID < 1");
        }
    }

    /// @notice Frozen assets should have valid owners
    function invariant_frozenAssetsHaveOwner() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        for (uint256 i = 0; i < assetIds.length; i++) {
            uint256 assetId = assetIds[i];
            if (assetVault.isFrozen(assetId)) {
                address owner = assetVault.ownerOf(assetId);
                assertTrue(owner != address(0), "Frozen asset has no owner");
            }
        }
    }

    /// @notice All assets should have valid status (enum 0-3)
    function invariant_validAssetStatus() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        for (uint256 i = 0; i < assetIds.length; i++) {
            AssetVault.Asset memory asset = assetVault.getAsset(assetIds[i]);
            assertTrue(uint8(asset.status) <= 3, "Invalid asset status");
        }
    }

    /// @notice createdAt should always be > 0
    function invariant_timestampsValid() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        for (uint256 i = 0; i < assetIds.length; i++) {
            AssetVault.Asset memory asset = assetVault.getAsset(assetIds[i]);
            assertGt(asset.createdAt, 0, "createdAt is zero");
        }
    }

    /// @notice ERC721 balance should equal count of owned assets
    function invariant_balanceConsistency() public view {
        address[] memory actorList = handler.getActors();
        uint256[] memory assetIds = handler.getCreatedAssetIds();

        for (uint256 j = 0; j < actorList.length; j++) {
            address actor = actorList[j];
            uint256 balance = assetVault.balanceOf(actor);

            uint256 ownedCount = 0;
            for (uint256 i = 0; i < assetIds.length; i++) {
                try assetVault.ownerOf(assetIds[i]) returns (address owner) {
                    if (owner == actor) {
                        ownedCount++;
                    }
                } catch {}
            }

            assertEq(balance, ownedCount, "Balance mismatch");
        }
    }

    /// @notice Frozen assets should block canTransact
    function invariant_frozenBlocksTransact() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        address[] memory actorList = handler.getActors();

        for (uint256 i = 0; i < assetIds.length; i++) {
            uint256 assetId = assetIds[i];
            if (handler.assetFrozen(assetId)) {
                for (uint256 j = 0; j < actorList.length; j++) {
                    assertFalse(
                        assetVault.canTransact(actorList[j], assetId),
                        "Frozen asset allows transact"
                    );
                }
            }
        }
    }
}
