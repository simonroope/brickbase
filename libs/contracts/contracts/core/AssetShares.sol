// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./AssetUserAllowList.sol";

interface IERC7943MultiToken {
    event Frozen(address indexed user, uint256 indexed tokenId, uint256 amount);
    event ForcedTransfer(address indexed from, address indexed to, uint256 indexed tokenId, uint256 amount);

    function isUserAllowed(address user) external view returns (bool);
    function canTransact(address user, uint256 tokenId, uint256 amount) external view returns (bool);
    function canTransfer(address from, address to, uint256 tokenId, uint256 amount) external view returns (bool);
    function getFrozenTokens(address user, uint256 tokenId) external view returns (uint256);
    function setFrozenTokens(address user, uint256 tokenId, uint256 amount) external;
    function forcedTransfer(address from, address to, uint256 tokenId, uint256 amount) external;
}

error ERC7943InsufficientUnfrozenBalance(address user, uint256 tokenId, uint256 available, uint256 required);

contract AssetShares is ERC1155, IERC1155Receiver, IERC7943MultiToken, AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public immutable USDC;
    address public immutable assetVault;
    AssetUserAllowList public immutable userAllowList;
    address public pauser; // Multisig address with pause/unpause capability
    bool private _pauserInitialized;

    struct ShareInfo {
        uint256 totalSupply;
        uint256 availableSupply;
        uint256 sharePrice;
        bool tradingEnabled;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(uint256 => ShareInfo) public shareInfo;
    mapping(address => mapping(uint256 => uint256)) private _frozenBalances;
    mapping(address => mapping(uint256 => uint256)) public purchasePrice;

    event AssetSharesCreated(uint256 indexed assetId, uint256 totalShares, uint256 sharePrice, uint256 createdAt);
    event SharesPurchased(address indexed buyer, uint256 indexed assetId, uint256 amount, uint256 pricePerShare, uint256 totalCost);
    event SharesTraded(address indexed seller, address indexed buyer, uint256 indexed assetId, uint256 amount, uint256 pricePerShare);
    event SharePriceUpdated(
        uint256 indexed assetId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 updatedAt
    );
    event TradingStatusChanged(uint256 indexed assetId, bool enabled);
    event PauserSet(address indexed pauser);

    constructor(address _usdcAddress, address _assetVault, address _userAllowList, string memory uri) ERC1155(uri) {
        require(_usdcAddress != address(0), "Invalid USDC address");
        require(_assetVault != address(0), "Invalid property contract");
        require(_userAllowList != address(0), "Invalid allowlist address");
        USDC = IERC20(_usdcAddress);
        assetVault = _assetVault;
        userAllowList = AssetUserAllowList(_userAllowList);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ASSET_MANAGER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, _assetVault);
        // PAUSER_ROLE will be granted to multisig address via setPauser()
    }

    /**
     * @notice Set the pauser address (multisig) - can only be called once by admin
     * @param _pauser The address of the multisig that will control pause/unpause
     */
    function setPauser(address _pauser) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!_pauserInitialized, "Pauser already set");
        require(_pauser != address(0), "Invalid pauser address");
        pauser = _pauser;
        _grantRole(PAUSER_ROLE, _pauser);
        _pauserInitialized = true;
        emit PauserSet(_pauser);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal virtual override whenNotPaused {
        super._update(from, to, ids, values);
    }

    // Helper function to convert single values to arrays for _update
    function _asSingletonArray(uint256 element) private pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = element;
        return array;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, IERC165, AccessControl) returns (bool) {
        return ERC1155.supportsInterface(interfaceId) || AccessControl.supportsInterface(interfaceId);
    }

    // IERC1155Receiver implementation - required for minting to this contract
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    // ERC7943MultiToken implementation
    function isUserAllowed(address user) public view override returns (bool) {
        return userAllowList.isUserAllowed(user);
    }

    function canTransact(address user, uint256 tokenId, uint256 amount) public view override returns (bool) {
        if (!userAllowList.isUserAllowed(user) || paused()) {
            return false;
        }
        uint256 balance = balanceOf(user, tokenId);
        uint256 frozen = _frozenBalances[user][tokenId];
        return balance >= frozen + amount;
    }

    function canTransfer(address from, address to, uint256 tokenId, uint256 amount) public view override returns (bool) {
        if (!userAllowList.isUserAllowed(from) || !userAllowList.isUserAllowed(to) || paused()) {
            return false;
        }
        uint256 balance = balanceOf(from, tokenId);
        uint256 frozen = _frozenBalances[from][tokenId];
        return balance >= frozen + amount;
    }

    function getFrozenTokens(address user, uint256 tokenId) public view override returns (uint256) {
        return _frozenBalances[user][tokenId];
    }

    function setFrozenTokens(address user, uint256 tokenId, uint256 amount) public override onlyRole(COMPLIANCE_OFFICER_ROLE) {
        _frozenBalances[user][tokenId] = amount;
        emit Frozen(user, tokenId, amount);
    }

    function forcedTransfer(address from, address to, uint256 tokenId, uint256 amount) public override onlyRole(COMPLIANCE_OFFICER_ROLE) nonReentrant {
        require(balanceOf(from, tokenId) >= amount, "Insufficient balance");
        _safeTransferFrom(from, to, tokenId, amount, "");
        emit ForcedTransfer(from, to, tokenId, amount);
    }

    // Allowlist management - delegates to shared AssetUserAllowList contract
    function setUserAllowed(address user, bool allowed) public onlyRole(COMPLIANCE_OFFICER_ROLE) {
        userAllowList.setUserAllowed(user, allowed);
    }

    // Asset shares creation and management
    /**
     * @notice Create shares for a property asset.
     * @param assetId The asset ID to create shares for.
     * @param totalSupply_ The total number of shares to mint for this asset.
     * @param sharePrice_ The initial price per share (in USDC decimals, typically 6).
     * @dev Only MINTER_ROLE (AssetVault) can create shares. Mints all shares to this contract initially.
     */
    function createAssetShares(
        uint256 assetId,
        uint256 totalSupply_,
        uint256 sharePrice_
    ) external onlyRole(MINTER_ROLE) {
        require(shareInfo[assetId].totalSupply == 0, "Asset shares already exist");
        require(totalSupply_ > 0, "Total supply must be greater than zero");
        require(sharePrice_ > 0, "Share price must be greater than zero");

        // Initialize shareInfo - shares will be minted directly to buyers via purchaseShares
        shareInfo[assetId] = ShareInfo({
            totalSupply: totalSupply_,
            availableSupply: totalSupply_,
            sharePrice: sharePrice_,
            tradingEnabled: false, // Trading disabled by default, can be enabled later
            createdAt: block.timestamp,
            updatedAt: 0
        });

        emit AssetSharesCreated(assetId, totalSupply_, sharePrice_, block.timestamp);
    }

    /**
     * @notice Enable or disable trading for a given asset ID.
     * @param assetId The asset ID to update trading status for.
     * @param enabled Whether trading should be enabled.
     * @dev Only ASSET_MANAGER_ROLE can update trading status. Asset must exist.
     */
    function setTradingEnabled(uint256 assetId, bool enabled) external onlyRole(ASSET_MANAGER_ROLE) {
        require(shareInfo[assetId].totalSupply > 0, "Asset does not exist");
        shareInfo[assetId].tradingEnabled = enabled;
        emit TradingStatusChanged(assetId, enabled);
    }

    // Share price management
    /**
     * @notice Update the share price for a given asset ID.
     * @param assetId The asset ID to update the share price for.
     * @param newPrice The new share price (in USDC decimals, typically 6).
     * @dev Only ASSET_MANAGER_ROLE can update share prices. Asset must exist.
     */
    function updateSharePrice(uint256 assetId, uint256 newPrice) external onlyRole(ASSET_MANAGER_ROLE) {
        require(shareInfo[assetId].totalSupply > 0, "Asset does not exist");
        uint256 oldPrice = shareInfo[assetId].sharePrice;
        require(newPrice != oldPrice, "New price must differ from current price");
        
        shareInfo[assetId].sharePrice = newPrice;
        emit SharePriceUpdated(assetId, oldPrice, newPrice, block.timestamp);
    }

    // Share purchasing and trading
    /**
     * @notice Purchase shares directly from the contract.
     * @param assetId The asset ID to purchase shares for.
     * @param amount The number of shares to purchase.
     * @dev User must be on allowlist, asset must exist, and sufficient availableSupply must exist.
     */
    function purchaseShares(uint256 assetId, uint256 amount) external nonReentrant whenNotPaused {
        require(userAllowList.isUserAllowed(msg.sender), "User not allowed");
        require(shareInfo[assetId].totalSupply > 0, "Asset does not exist");
        require(amount > 0, "Amount must be greater than zero");
        require(shareInfo[assetId].availableSupply >= amount, "Insufficient available supply");

        uint256 pricePerShare = shareInfo[assetId].sharePrice;
        uint256 totalCost = (amount * pricePerShare) / (10 ** 18); // Adjust for 18-decimal shares and 6-decimal USDC

        // Transfer USDC from buyer to this contract
        require(USDC.transferFrom(msg.sender, address(this), totalCost), "USDC transfer failed");

        // Mint shares directly to buyer
        // Use _update to bypass ERC1155 receiver check - EOAs don't need it, and contract recipients
        // would need IERC1155Receiver anyway. Primary market purchases are always to EOAs.
        _update(address(0), msg.sender, _asSingletonArray(assetId), _asSingletonArray(amount));

        // Update available supply
        shareInfo[assetId].availableSupply -= amount;

        // Record purchase price for this user
        purchasePrice[msg.sender][assetId] = pricePerShare;

        emit SharesPurchased(msg.sender, assetId, amount, pricePerShare, totalCost);
    }

    /**
     * @notice Trade shares between users (secondary market).
     * @param assetId The asset ID to trade shares for.
     * @param seller The address selling the shares.
     * @param amount The number of shares to trade.
     * @param pricePerShare The price per share for this trade (in USDC decimals, typically 6).
     * @dev Both users must be on allowlist, trading must be enabled, and seller must have sufficient balance.
     */
    function tradeShares(
        uint256 assetId,
        address seller,
        uint256 amount,
        uint256 pricePerShare
    ) external nonReentrant whenNotPaused {
        require(userAllowList.isUserAllowed(msg.sender), "Buyer not allowed");
        require(userAllowList.isUserAllowed(seller), "Seller not allowed");
        require(shareInfo[assetId].totalSupply > 0, "Asset does not exist");
        require(shareInfo[assetId].tradingEnabled, "Trading not enabled for this asset");
        require(amount > 0, "Amount must be greater than zero");
        require(seller != msg.sender, "Cannot trade with yourself");
        require(balanceOf(seller, assetId) >= amount, "Seller has insufficient balance");

        // Check seller has enough unfrozen balance
        uint256 sellerBalance = balanceOf(seller, assetId);
        uint256 sellerFrozen = _frozenBalances[seller][assetId];
        require(sellerBalance >= sellerFrozen + amount, "Insufficient unfrozen balance");

        uint256 totalCost = (amount * pricePerShare) / (10 ** 18); // Adjust for 18-decimal shares and 6-decimal USDC

        // Transfer USDC from buyer to seller
        require(USDC.transferFrom(msg.sender, seller, totalCost), "USDC transfer failed");

        // Transfer shares from seller to buyer
        _safeTransferFrom(seller, msg.sender, assetId, amount, "");

        // Record purchase price for buyer
        purchasePrice[msg.sender][assetId] = pricePerShare;

        emit SharesTraded(seller, msg.sender, assetId, amount, pricePerShare);
    }

    // Frontend helpers

    /**
     * @notice Returns high-level share info for a given asset ID.
     * @dev Convenience wrapper around the public shareInfo mapping for frontend use.
     */
    function getAssetShares(uint256 assetId)
        external
        view
        returns (
            uint256 totalSupply_,
            uint256 availableSupply_,
            uint256 sharePrice_,
            bool tradingEnabled_
        )
    {
        ShareInfo storage info = shareInfo[assetId];
        return (info.totalSupply, info.availableSupply, info.sharePrice, info.tradingEnabled);
    }

    /**
     * @notice Returns share info and user position for a given asset ID and user.
     * @dev Single call for frontend display; combines asset-level share info with user's balance and purchase price.
     */
    function getUserShares(address user, uint256 assetId)
        external
        view
        returns (
            uint256 totalSupply_,
            uint256 availableSupply_,
            uint256 sharePrice_,
            bool tradingEnabled_,
            uint256 balance_,
            uint256 frozen_,
            uint256 unfrozen_,
            uint256 recordedPurchasePrice_
        )
    {
        ShareInfo storage info = shareInfo[assetId];
        uint256 bal = balanceOf(user, assetId);
        uint256 frozenAmt = _frozenBalances[user][assetId];
        uint256 unfrozenAmt = bal > frozenAmt ? bal - frozenAmt : 0;
        
        totalSupply_ = info.totalSupply;
        availableSupply_ = info.availableSupply;
        sharePrice_ = info.sharePrice;
        tradingEnabled_ = info.tradingEnabled;
        balance_ = bal;
        frozen_ = frozenAmt;
        unfrozen_ = unfrozenAmt;
        recordedPurchasePrice_ = purchasePrice[user][assetId];
    }
}

