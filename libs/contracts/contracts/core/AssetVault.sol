// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./AssetUserAllowList.sol";

interface IERC7943NonFungible {
    event Frozen(address indexed user, uint256 indexed tokenId);
    event ForcedTransfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function isUserAllowed(address user) external view returns (bool);
    function canTransact(address user, uint256 tokenId) external view returns (bool);
    function canTransfer(address from, address to, uint256 tokenId) external view returns (bool);
    function isFrozen(uint256 tokenId) external view returns (bool);
    function setFrozenToken(uint256 tokenId, bool frozen) external;
    function forcedTransfer(address from, address to, uint256 tokenId) external;
}

error ERC7943NotAllowedUser(address user);
error ERC7943TokenFrozen(uint256 tokenId);

contract AssetVault is ERC721, IERC7943NonFungible, AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    address public assetShares;
    bool private _assetSharesInitialized;
    address public pauser; // Multisig address with pause/unpause capability
    bool private _pauserInitialized;
    AssetUserAllowList public immutable userAllowList;
    uint256 private _nextAssetId = 1;

    struct Asset {
        AssetStatus status;
        uint256 capitalValue;
        uint256 incomeValue;
        string metadataURI; // URI pointing to JSON containing address, purchasePrice, area, images, documents, etc.
        uint256 createdAt;
        uint256 updatedAt;
    }

    enum AssetStatus {
        Active,
        UnderContract,
        Sold,
        Suspended
    }

    mapping(uint256 => Asset) internal _assets;
    mapping(uint256 => bool) private _frozenTokens;

    event AssetVaulted(
        uint256 indexed assetId,
        AssetStatus status,
        uint256 capitalValue,
        uint256 incomeValue,
        uint256 timestamp
    );

    event AssetStatusChanged(
        uint256 indexed assetId,
        AssetStatus oldStatus,
        AssetStatus newStatus
    );

    event AssetSharesSet(address indexed assetShares);
    event PauserSet(address indexed pauser);

    constructor(address _userAllowList) ERC721("Asset Vault", "VAULT") {
        require(_userAllowList != address(0), "Invalid allowlist address");
        userAllowList = AssetUserAllowList(_userAllowList);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ASSET_MANAGER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER_ROLE, msg.sender);
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

    function _update(address to, uint256 tokenId, address auth) internal virtual override whenNotPaused returns (address) {
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Set the AssetShares contract address (can only be called once)
     * @param _assetShares The address of the AssetShares contract
     */
    function setAssetShares(address _assetShares) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!_assetSharesInitialized, "AssetShares already set");
        require(_assetShares != address(0), "Invalid share token");
        assetShares = _assetShares;
        _assetSharesInitialized = true;
        emit AssetSharesSet(_assetShares);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return ERC721.supportsInterface(interfaceId) || AccessControl.supportsInterface(interfaceId);
    }

    // ERC7943NonFungible implementation
    function isUserAllowed(address user) public view override returns (bool) {
        return userAllowList.isUserAllowed(user);
    }

    function canTransact(address user, uint256 tokenId) public view override returns (bool) {
        if (!userAllowList.isUserAllowed(user) || paused() || _frozenTokens[tokenId]) {
            return false;
        }
        return ownerOf(tokenId) == user;
    }

    function canTransfer(address from, address to, uint256 tokenId) public view override returns (bool) {
        if (!userAllowList.isUserAllowed(from) || !userAllowList.isUserAllowed(to) || paused() || _frozenTokens[tokenId]) {
            return false;
        }
        return ownerOf(tokenId) == from;
    }

    function isFrozen(uint256 tokenId) public view override returns (bool) {
        return _frozenTokens[tokenId];
    }

    function setFrozenToken(uint256 tokenId, bool frozen) public override onlyRole(COMPLIANCE_OFFICER_ROLE) {
        _frozenTokens[tokenId] = frozen;
        address owner = ownerOf(tokenId);
        emit Frozen(owner, tokenId);
    }

    function forcedTransfer(address from, address to, uint256 tokenId) public override onlyRole(COMPLIANCE_OFFICER_ROLE) nonReentrant {
        require(ownerOf(tokenId) == from, "Token not owned by from");
        _transfer(from, to, tokenId);
        emit ForcedTransfer(from, to, tokenId);
    }

    // Allowlist management - delegates to shared AssetUserAllowList contract
    function setUserAllowed(address user, bool allowed) public onlyRole(COMPLIANCE_OFFICER_ROLE) {
        userAllowList.setUserAllowed(user, allowed);
    }

    /**
     * @notice Create an asset with metadata (ASSET_MANAGER_ROLE only).
     * @param assetId The asset ID to create.
     * @param status_ The asset status (Active, UnderContract, Sold, Suspended).
     * @param capitalValue_ Capital value in USDC decimals (typically 6).
     * @param incomeValue_ Income value in USDC decimals (typically 6).
     * @param metadataURI_ URI pointing to JSON containing address, purchasePrice, area, images, documents, etc.
     */
    function createAsset(
        uint256 assetId,
        AssetStatus status_,
        uint256 capitalValue_,
        uint256 incomeValue_,
        string calldata metadataURI_
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        require(_assets[assetId].createdAt == 0, "Asset already exists");
        _assets[assetId] = Asset({
            status: status_,
            capitalValue: capitalValue_,
            incomeValue: incomeValue_,
            metadataURI: metadataURI_,
            createdAt: block.timestamp,
            updatedAt: 0
        });

        emit AssetVaulted(assetId, status_, capitalValue_, incomeValue_, block.timestamp);
    }

    // Frontend helpers

    /**
     * @notice Returns full details for a given asset.
     * @dev totalShares and sharePrice from AssetShares.getAssetShares(assetId).
     *      metadataURI points to JSON with address, purchasePrice, area, images, documents, etc.
     */
    function getAsset(uint256 assetId) external view returns (Asset memory) {
        return  _assets[assetId];
    }


    function getAllAssets(uint256[] calldata assetIds) 
        external 
        view 
        returns (Asset[] memory) 
    {
        Asset[] memory results = new Asset[](assetIds.length);
        for (uint256 i = 0; i < assetIds.length; i++) {
            results[i] = _assets[assetIds[i]];
        }
        return results;
    }
}

