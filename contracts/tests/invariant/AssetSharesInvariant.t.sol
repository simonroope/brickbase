// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../lib/forge-std/src/Test.sol";
import "../../contracts/core/AssetShares.sol";
import "../../contracts/core/AssetUserAllowList.sol";
import "../../contracts/mocks/MockERC20.sol";

/**
 * @title AssetSharesHandler
 * @notice Handler contract for guided fuzzing of AssetShares
 */
contract AssetSharesHandler is Test {
    AssetShares public assetShares;
    AssetUserAllowList public allowList;
    MockERC20 public usdc;

    address[] public actors;
    uint256[] public createdAssetIds;
    mapping(uint256 => uint256) public originalTotalSupply;

    uint256 public constant MAX_SHARES = 1_000_000;
    uint256 public constant MIN_PRICE = 1e6; // 1 USDC
    uint256 public constant MAX_PRICE = 1_000_000e6; // 1M USDC

    constructor(
        AssetShares _assetShares,
        AssetUserAllowList _allowList,
        MockERC20 _usdc,
        address[] memory _actors
    ) {
        assetShares = _assetShares;
        allowList = _allowList;
        usdc = _usdc;
        actors = _actors;
    }

    function createAsset(uint256 assetId, uint256 totalShares, uint256 sharePrice) external {
        assetId = bound(assetId, 1, 1000);
        totalShares = bound(totalShares, 1, MAX_SHARES);
        sharePrice = bound(sharePrice, MIN_PRICE, MAX_PRICE);

        // Skip if asset already exists
        (uint256 existingSupply, , , , , ) = assetShares.shareInfo(assetId);
        if (existingSupply > 0) return;

        assetShares.createAssetShares(assetId, totalShares, sharePrice);
        createdAssetIds.push(assetId);
        originalTotalSupply[assetId] = totalShares;
    }

    function freezeTokens(uint256 actorSeed, uint256 assetIdSeed, uint256 amount) external {
        if (createdAssetIds.length == 0) return;

        address actor = actors[actorSeed % actors.length];
        uint256 assetId = createdAssetIds[assetIdSeed % createdAssetIds.length];
        uint256 balance = assetShares.balanceOf(actor, assetId);

        amount = bound(amount, 0, balance);
        assetShares.setFrozenTokens(actor, assetId, amount);
    }

    function updateSharePrice(uint256 assetIdSeed, uint256 newPrice) external {
        if (createdAssetIds.length == 0) return;

        uint256 assetId = createdAssetIds[assetIdSeed % createdAssetIds.length];
        newPrice = bound(newPrice, MIN_PRICE, MAX_PRICE);

        assetShares.updateSharePrice(assetId, newPrice);
    }

    function purchaseShares(uint256 actorSeed, uint256 assetIdSeed, uint256 amount) external {
        if (createdAssetIds.length == 0 || actors.length == 0) return;

        address actor = actors[actorSeed % actors.length];
        uint256 assetId = createdAssetIds[assetIdSeed % createdAssetIds.length];
        (, uint256 available, uint256 sharePrice, , , ) = assetShares.shareInfo(assetId);
        if (available == 0) return;

        amount = bound(amount, 1, available);
        uint256 totalCost = (amount * sharePrice) / (10 ** 18);

        vm.startPrank(actor);
        usdc.approve(address(assetShares), totalCost);
        assetShares.purchaseAssetShares(assetId, amount);
        vm.stopPrank();
    }

    function getCreatedAssetIds() external view returns (uint256[] memory) {
        return createdAssetIds;
    }

    function getActors() external view returns (address[] memory) {
        return actors;
    }
}

/**
 * @title AssetSharesInvariantTest
 * @notice Foundry invariant tests for AssetShares contract
 */
contract AssetSharesInvariantTest is Test {
    AssetShares public assetShares;
    AssetUserAllowList public allowList;
    MockERC20 public usdc;
    AssetSharesHandler public handler;

    address public constant VAULT = address(0x1000);
    address[] public actors;

    function setUp() public {
        // Deploy infrastructure
        allowList = new AssetUserAllowList();
        usdc = new MockERC20("USD Coin", "USDC", 6, 0);

        // Deploy AssetShares with test contract as vault
        assetShares = new AssetShares(
            address(usdc),
            address(this),
            address(allowList),
            "https://api.brickbase.io/metadata/"
        );

        // Setup allowlist
        allowList.setAuthorizedCaller(address(assetShares), true);
        allowList.setAuthorizedCaller(address(this), true);

        // Create actors
        for (uint256 i = 1; i <= 5; i++) {
            address actor = address(uint160(0x1000 + i));
            actors.push(actor);
            allowList.setUserAllowed(actor, true);
            usdc.mint(actor, 1_000_000_000e6);
        }

        // Deploy handler
        handler = new AssetSharesHandler(assetShares, allowList, usdc, actors);

        // Grant handler necessary roles
        assetShares.grantRole(assetShares.MINTER_ROLE(), address(handler));
        assetShares.grantRole(assetShares.COMPLIANCE_OFFICER_ROLE(), address(handler));
        assetShares.grantRole(assetShares.ASSET_MANAGER_ROLE(), address(handler));

        // Target only the handler for fuzzing
        targetContract(address(handler));
    }

    /// @notice Available supply should never exceed total supply
    function invariant_availableSupplyLteTotalSupply() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        for (uint256 i = 0; i < assetIds.length; i++) {
            (uint256 totalSupply, uint256 availableSupply, , , , ) = assetShares.shareInfo(assetIds[i]);
            assertLe(availableSupply, totalSupply, "Available > Total");
        }
    }

    /// @notice Total supply should never increase after creation
    function invariant_totalSupplyImmutable() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        for (uint256 i = 0; i < assetIds.length; i++) {
            uint256 assetId = assetIds[i];
            (uint256 totalSupply, , , , , ) = assetShares.shareInfo(assetId);
            assertLe(totalSupply, handler.originalTotalSupply(assetId), "Total supply increased");
        }
    }

    /// @notice Frozen balance should never exceed user's actual balance
    function invariant_frozenBalanceLteBalance() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        address[] memory actorList = handler.getActors();

        for (uint256 i = 0; i < assetIds.length; i++) {
            for (uint256 j = 0; j < actorList.length; j++) {
                uint256 balance = assetShares.balanceOf(actorList[j], assetIds[i]);
                uint256 frozen = assetShares.getFrozenTokens(actorList[j], assetIds[i]);
                assertLe(frozen, balance, "Frozen > Balance");
            }
        }
    }

    /// @notice Share price should always be positive for created assets
    function invariant_sharePricePositive() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        for (uint256 i = 0; i < assetIds.length; i++) {
            (, , uint256 sharePrice, , , ) = assetShares.shareInfo(assetIds[i]);
            assertGt(sharePrice, 0, "Share price is zero");
        }
    }

    /// @notice Unsold shares are not escrowed; minted + available == total
    function invariant_availablePlusMintedEqualsTotal() public view {
        uint256[] memory assetIds = handler.getCreatedAssetIds();
        address[] memory actorList = handler.getActors();

        for (uint256 i = 0; i < assetIds.length; i++) {
            uint256 assetId = assetIds[i];
            (uint256 totalSupply, uint256 availableSupply, , , , ) = assetShares.shareInfo(assetId);

            assertEq(
                assetShares.balanceOf(address(assetShares), assetId),
                0,
                "Contract must not hold escrowed shares"
            );

            uint256 minted;
            for (uint256 j = 0; j < actorList.length; j++) {
                minted += assetShares.balanceOf(actorList[j], assetId);
            }
            assertEq(minted + availableSupply, totalSupply, "Minted + available != total");
        }
    }
}
