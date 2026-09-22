// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AssetUserAllowList
 * @notice Centralized allowlist management for AssetVault and AssetShares contracts
 * @dev Access restricted to authorized caller contracts only. Compliance checks occur at the caller level.
 */
contract AssetUserAllowList is AccessControl {
    mapping(address => bool) private _allowedUsers;
    mapping(address => bool) private _authorizedCallers;

    event UserAllowlistUpdated(address indexed user, bool allowed);
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);

    error OnlyAuthorizedCaller(address caller);

    modifier onlyAuthorizedCaller() {
        if (!_authorizedCallers[msg.sender]) {
            revert OnlyAuthorizedCaller(msg.sender);
        }
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Add or remove an authorized caller (AssetVault, AssetShares, etc.)
     * @param caller The contract address to authorize or revoke
     * @param authorized Whether the caller should be authorized
     * @dev Only DEFAULT_ADMIN_ROLE. Call after deploying AssetVault and AssetShares.
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(caller != address(0), "Invalid caller address");
        _authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
    }

    /**
     * @notice Check if an address is an authorized caller
     * @param caller The address to check
     */
    function isAuthorizedCaller(address caller) external view returns (bool) {
        return _authorizedCallers[caller];
    }

    /**
     * @notice Check if a user is allowed
     * @param user The address to check
     * @return true if the user is allowed, false otherwise
     * @dev Only callable by AssetVault and AssetShares (authorized callers)
     */
    function isUserAllowed(address user) external view onlyAuthorizedCaller returns (bool) {
        return _allowedUsers[user];
    }

    /**
     * @notice Set whether a user is allowed or not
     * @param user The address to update
     * @param allowed Whether the user should be allowed
     * @dev Only callable by AssetVault and AssetShares (authorized callers). Caller must enforce COMPLIANCE_OFFICER_ROLE.
     */
    function setUserAllowed(address user, bool allowed) external onlyAuthorizedCaller {
        _allowedUsers[user] = allowed;
        emit UserAllowlistUpdated(user, allowed);
    }

    /**
     * @notice Batch update multiple users' allowlist status
     * @param users Array of user addresses to update
     * @param allowed Array of allowed statuses (must match users array length)
     * @dev Only callable by AssetVault and AssetShares (authorized callers)
     */
    function setUsersAllowed(address[] calldata users, bool[] calldata allowed) external onlyAuthorizedCaller {
        require(users.length == allowed.length, "Arrays length mismatch");
        for (uint256 i = 0; i < users.length; i++) {
            _allowedUsers[users[i]] = allowed[i];
            emit UserAllowlistUpdated(users[i], allowed[i]);
        }
    }
}
