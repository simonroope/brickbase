// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

error ERC7943NotAllowedUser(address user);
error ERC7943TokenFrozen(uint256 tokenId);
error ERC7943InsufficientUnfrozenBalance(address user, uint256 tokenId, uint256 available, uint256 required);

