// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../lib/forge-std/src/Test.sol";
import "../../contracts/core/AssetVault.sol";
import "../../contracts/core/AssetShares.sol";
import "../../contracts/core/AssetUserAllowList.sol";
import "../../contracts/mocks/MockERC20.sol";

/**
 * @title ComplianceHandler
 * @notice Handler contract for testing ERC-7943 compliance across contracts
 */
contract ComplianceHandler is Test {
    AssetVault public assetVault;
    AssetShares public assetShares;
    AssetUserAllowList public allowList;
    MockERC20 public usdc;

    address[] public allowedUsers;
    address[] public disallowedUsers;
    uint256[] public vaultedAssetIds;
    uint256[] public tokenizedAssetIds;

    mapping(address => bool) public userAllowedStatus;
    mapping(uint256 => bool) public assetFrozenStatus;

    uint256 private _assetCounter;

    constructor(
        AssetVault _assetVault,
        AssetShares _assetShares,
        AssetUserAllowList _allowList,
        MockERC20 _usdc,
        address[] memory _allowedUsers,
        address[] memory _disallowedUsers
    ) {
        assetVault = _assetVault;
        assetShares = _assetShares;
        allowList = _allowList;
        usdc = _usdc;
        allowedUsers = _allowedUsers;
        disallowedUsers = _disallowedUsers;

        for (uint256 i = 0; i < _allowedUsers.length; i++) {
            userAllowedStatus[_allowedUsers[i]] = true;
        }
    }

    function createNewAsset(uint256 capitalValue, uint256 incomeValue) external {
        capitalValue = bound(capitalValue, 1e6, 100_000_000e6);
        incomeValue = bound(incomeValue, 0, 10_000_000e6);

        string memory uri = string(abi.encodePacked("ipfs://compliance-", vm.toString(_assetCounter)));
        _assetCounter++;

        uint256 assetId = assetVault.createAsset(
            AssetVault.AssetStatus.Active,
            capitalValue,
            incomeValue,
            uri
        );
        vaultedAssetIds.push(assetId);
    }

    function tokenizeAsset(uint256 assetIdSeed, uint256 totalShares, uint256 sharePrice) external {
        if (vaultedAssetIds.length == 0) return;

        uint256 assetId = vaultedAssetIds[assetIdSeed % vaultedAssetIds.length];
        totalShares = bound(totalShares, 1, 1_000_000);
        sharePrice = bound(sharePrice, 1e6, 1_000_000e6);

        // Skip if already tokenized
        (uint256 existingSupply, , , , , ) = assetShares.shareInfo(assetId);
        if (existingSupply > 0) return;

        assetShares.createAssetShares(assetId, totalShares, sharePrice);
        tokenizedAssetIds.push(assetId);
    }

    function freezeVaultAsset(uint256 assetIdSeed) external {
        if (vaultedAssetIds.length == 0) return;

        uint256 assetId = vaultedAssetIds[assetIdSeed % vaultedAssetIds.length];
        assetVault.setFrozenToken(assetId, true);
        assetFrozenStatus[assetId] = true;
    }

    function unfreezeVaultAsset(uint256 assetIdSeed) external {
        if (vaultedAssetIds.length == 0) return;

        uint256 assetId = vaultedAssetIds[assetIdSeed % vaultedAssetIds.length];
        assetVault.setFrozenToken(assetId, false);
        assetFrozenStatus[assetId] = false;
    }

    function freezeUserShares(uint256 userSeed, uint256 assetIdSeed, uint256 amount) external {
        if (tokenizedAssetIds.length == 0 || allowedUsers.length == 0) return;

        address user = allowedUsers[userSeed % allowedUsers.length];
        uint256 assetId = tokenizedAssetIds[assetIdSeed % tokenizedAssetIds.length];
        uint256 balance = assetShares.balanceOf(user, assetId);

        amount = bound(amount, 0, balance);
        assetShares.setFrozenTokens(user, assetId, amount);
    }

    function toggleUserAllowlist(uint256 userSeed, bool allowed) external {
        if (allowedUsers.length == 0) return;

        address user = allowedUsers[userSeed % allowedUsers.length];
        allowList.setUserAllowed(user, allowed);
        userAllowedStatus[user] = allowed;
    }

    function getVaultedAssetIds() external view returns (uint256[] memory) {
        return vaultedAssetIds;
    }

    function getTokenizedAssetIds() external view returns (uint256[] memory) {
        return tokenizedAssetIds;
    }

    function getAllowedUsers() external view returns (address[] memory) {
        return allowedUsers;
    }

    function getDisallowedUsers() external view returns (address[] memory) {
        return disallowedUsers;
    }
}

/**
 * @title ComplianceInvariantTest
 * @notice Foundry invariant tests for ERC-7943 compliance across contracts
 */
contract ComplianceInvariantTest is Test {
    AssetVault public assetVault;
    AssetShares public assetShares;
    AssetUserAllowList public allowList;
    MockERC20 public usdc;
    ComplianceHandler public handler;

    address[] public allowedUsers;
    address[] public disallowedUsers;

    function setUp() public {
        // Deploy infrastructure
        allowList = new AssetUserAllowList();
        usdc = new MockERC20("USD Coin", "USDC", 6, 0);
        assetVault = new AssetVault(address(allowList));
        assetShares = new AssetShares(
            address(usdc),
            address(assetVault),
            address(allowList),
            "https://api.brickbase.io/metadata/"
        );

        // Configure AssetVault <-> AssetShares link
        assetVault.setAssetShares(address(assetShares));

        // Authorize contracts on allowlist
        allowList.setAuthorizedCaller(address(assetVault), true);
        allowList.setAuthorizedCaller(address(assetShares), true);
        allowList.setAuthorizedCaller(address(this), true);

        // Create allowed users
        for (uint256 i = 1; i <= 3; i++) {
            address user = address(uint160(0x3000 + i));
            allowedUsers.push(user);
            allowList.setUserAllowed(user, true);
            usdc.mint(user, 1_000_000_000e6);
        }

        // Create disallowed users
        for (uint256 i = 1; i <= 2; i++) {
            address user = address(uint160(0x4000 + i));
            disallowedUsers.push(user);
            // Explicitly NOT adding to allowlist
        }

        // Allow test contract
        allowList.setUserAllowed(address(this), true);

        // Deploy handler
        handler = new ComplianceHandler(
            assetVault,
            assetShares,
            allowList,
            usdc,
            allowedUsers,
            disallowedUsers
        );

        // Grant handler necessary roles
        assetVault.grantRole(assetVault.ASSET_MANAGER_ROLE(), address(handler));
        assetVault.grantRole(assetVault.COMPLIANCE_OFFICER_ROLE(), address(handler));
        assetShares.grantRole(assetShares.MINTER_ROLE(), address(handler));
        assetShares.grantRole(assetShares.COMPLIANCE_OFFICER_ROLE(), address(handler));
        assetShares.grantRole(assetShares.ASSET_MANAGER_ROLE(), address(handler));

        // Authorize handler on allowlist
        allowList.setAuthorizedCaller(address(handler), true);
        allowList.setUserAllowed(address(handler), true);

        // Target only the handler for fuzzing
        targetContract(address(handler));
    }

    /// @notice Disallowed users should never be able to transact on vault assets
    function invariant_disallowedCannotTransactVault() public view {
        uint256[] memory assetIds = handler.getVaultedAssetIds();
        address[] memory disallowed = handler.getDisallowedUsers();

        for (uint256 i = 0; i < assetIds.length; i++) {
            for (uint256 j = 0; j < disallowed.length; j++) {
                assertFalse(
                    assetVault.canTransact(disallowed[j], assetIds[i]),
                    "Disallowed user can transact vault"
                );
            }
        }
    }

    /// @notice Disallowed users should never be able to transfer vault assets
    function invariant_disallowedCannotTransferVault() public view {
        uint256[] memory assetIds = handler.getVaultedAssetIds();
        address[] memory allowed = handler.getAllowedUsers();
        address[] memory disallowed = handler.getDisallowedUsers();

        for (uint256 i = 0; i < assetIds.length; i++) {
            for (uint256 j = 0; j < disallowed.length; j++) {
                // Disallowed as sender
                if (allowed.length > 0) {
                    assertFalse(
                        assetVault.canTransfer(disallowed[j], allowed[0], assetIds[i]),
                        "Disallowed sender can transfer"
                    );
                }
                // Disallowed as receiver
                if (allowed.length > 0) {
                    assertFalse(
                        assetVault.canTransfer(allowed[0], disallowed[j], assetIds[i]),
                        "Disallowed receiver can receive"
                    );
                }
            }
        }
    }

    /// @notice Frozen vault assets should block canTransact for everyone
    function invariant_frozenVaultBlocksTransact() public view {
        uint256[] memory assetIds = handler.getVaultedAssetIds();
        address[] memory allowed = handler.getAllowedUsers();

        for (uint256 i = 0; i < assetIds.length; i++) {
            if (handler.assetFrozenStatus(assetIds[i])) {
                for (uint256 j = 0; j < allowed.length; j++) {
                    assertFalse(
                        assetVault.canTransact(allowed[j], assetIds[i]),
                        "Frozen asset allows transact"
                    );
                }
            }
        }
    }

    /// @notice Frozen vault assets should block canTransfer for everyone
    function invariant_frozenVaultBlocksTransfer() public view {
        uint256[] memory assetIds = handler.getVaultedAssetIds();
        address[] memory allowed = handler.getAllowedUsers();

        if (allowed.length < 2) return;

        for (uint256 i = 0; i < assetIds.length; i++) {
            if (handler.assetFrozenStatus(assetIds[i])) {
                assertFalse(
                    assetVault.canTransfer(allowed[0], allowed[1], assetIds[i]),
                    "Frozen asset allows transfer"
                );
            }
        }
    }

    /// @notice isUserAllowed should be consistent between Vault and Shares
    function invariant_allowlistConsistency() public view {
        address[] memory allowed = handler.getAllowedUsers();
        address[] memory disallowed = handler.getDisallowedUsers();

        for (uint256 i = 0; i < allowed.length; i++) {
            bool vaultResult = assetVault.isUserAllowed(allowed[i]);
            bool sharesResult = assetShares.isUserAllowed(allowed[i]);
            assertEq(vaultResult, sharesResult, "Allowlist inconsistent");
        }

        for (uint256 i = 0; i < disallowed.length; i++) {
            bool vaultResult = assetVault.isUserAllowed(disallowed[i]);
            bool sharesResult = assetShares.isUserAllowed(disallowed[i]);
            assertEq(vaultResult, sharesResult, "Disallowed list inconsistent");
        }
    }

    /// @notice Frozen share amounts should never exceed balance
    function invariant_frozenSharesWithinBalance() public view {
        uint256[] memory assetIds = handler.getTokenizedAssetIds();
        address[] memory allowed = handler.getAllowedUsers();

        for (uint256 i = 0; i < assetIds.length; i++) {
            for (uint256 j = 0; j < allowed.length; j++) {
                uint256 balance = assetShares.balanceOf(allowed[j], assetIds[i]);
                uint256 frozen = assetShares.getFrozenTokens(allowed[j], assetIds[i]);
                assertLe(frozen, balance, "Frozen > balance");
            }
        }
    }

    /// @notice Contracts should be properly linked
    function invariant_contractsProperlyLinked() public view {
        // AssetShares references correct AssetVault
        assertEq(assetShares.assetVault(), address(assetVault), "Wrong vault in shares");

        // AssetVault references correct AssetShares
        assertEq(assetVault.assetShares(), address(assetShares), "Wrong shares in vault");

        // Both use same allowlist
        assertEq(address(assetVault.userAllowList()), address(allowList), "Vault wrong allowlist");
        assertEq(address(assetShares.userAllowList()), address(allowList), "Shares wrong allowlist");
    }

    /// @notice Allowed owners of minted, unfrozen assets can transact
    function invariant_allowedUsersCanTransactUnfrozen() public view {
        uint256[] memory assetIds = handler.getVaultedAssetIds();

        for (uint256 i = 0; i < assetIds.length; i++) {
            if (handler.assetFrozenStatus(assetIds[i])) continue;

            // createAsset records metadata only; skip IDs that have not been minted
            try assetVault.ownerOf(assetIds[i]) returns (address owner) {
                if (handler.userAllowedStatus(owner)) {
                    assertTrue(
                        assetVault.canTransact(owner, assetIds[i]),
                        "Allowed owner cannot transact unfrozen"
                    );
                }
            } catch {}
        }
    }
}
