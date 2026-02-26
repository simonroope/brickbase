// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOracleRouter
 * @notice Interface for routing price feed queries to Chainlink aggregators
 */
interface IOracleRouter {
    /**
     * @notice Get the latest ETH/USD price
     * @return price The latest ETH/USD price (scaled by feed decimals)
     * @return updatedAt Timestamp of the last update
     */
    function getEthUsdPrice() external view returns (int256 price, uint256 updatedAt);

    /**
     * @notice Get the latest GBP/USD price
     * @return price The latest GBP/USD price (scaled by feed decimals)
     * @return updatedAt Timestamp of the last update
     */
    function getGbpUsdPrice() external view returns (int256 price, uint256 updatedAt);

    /**
     * @notice Get the latest Gold/USD price
     * @return price The latest Gold/USD price (scaled by feed decimals)
     * @return updatedAt Timestamp of the last update
     */
    function getGoldUsdPrice() external view returns (int256 price, uint256 updatedAt);

    /**
     * @notice Get the latest FTSE 100 index value
     * @return value The latest FTSE 100 index value (scaled by feed decimals)
     * @return updatedAt Timestamp of the last update
     */
    function getFtse100Value() external view returns (int256 value, uint256 updatedAt);
}
