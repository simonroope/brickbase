// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../interfaces/IOracleRouter.sol";

/**
 * @title OracleRouter
 * @notice Routes price feed queries to Chainlink aggregators for ETH/USD, USD/GBP, USD/Gold, and FTSE 100
 * @dev Placeholder implementation - can be extended with additional price conversion logic
 */
contract OracleRouter is IOracleRouter {
    AggregatorV3Interface public immutable ethUsdFeed;
    AggregatorV3Interface public immutable gbpUsdFeed;
    AggregatorV3Interface public immutable goldUsdFeed;
    AggregatorV3Interface public immutable ftse100Feed;

    constructor(
        address _ethUsdFeed,
        address _gbpUsdFeed,
        address _goldUsdFeed,
        address _ftse100Feed
    ) {
        require(_ethUsdFeed != address(0), "Invalid ETH/USD feed");
        require(_gbpUsdFeed != address(0), "Invalid GBP/USD feed");
        require(_goldUsdFeed != address(0), "Invalid Gold/USD feed");
        require(_ftse100Feed != address(0), "Invalid FTSE 100 feed");

        ethUsdFeed = AggregatorV3Interface(_ethUsdFeed);
        gbpUsdFeed = AggregatorV3Interface(_gbpUsdFeed);
        goldUsdFeed = AggregatorV3Interface(_goldUsdFeed);
        ftse100Feed = AggregatorV3Interface(_ftse100Feed);
    }

    /**
     * @notice Get the latest ETH/USD price
     * @return price The latest ETH/USD price (scaled by feed decimals)
     * @return updatedAt Timestamp of the last update
     */
    function getEthUsdPrice() external view returns (int256 price, uint256 updatedAt) {
        (, int256 answer, , uint256 timestamp, ) = ethUsdFeed.latestRoundData();
        return (answer, timestamp);
    }

    /**
     * @notice Get the latest USD/GBP price
     * @return price The latest USD/GBP price (scaled by feed decimals)
     * @return updatedAt Timestamp of the last update
     */
    function getGbpUsdPrice() external view returns (int256 price, uint256 updatedAt) {
        (, int256 answer, , uint256 timestamp, ) = gbpUsdFeed.latestRoundData();
        return (answer, timestamp);
    }

    /**
     * @notice Get the latest USD/Gold price
     * @return price The latest USD/Gold price (scaled by feed decimals)
     * @return updatedAt Timestamp of the last update
     */
    function getGoldUsdPrice() external view returns (int256 price, uint256 updatedAt) {
        (, int256 answer, , uint256 timestamp, ) = goldUsdFeed.latestRoundData();
        return (answer, timestamp);
    }

    /**
     * @notice Get the latest FTSE 100 index value
     * @return value The latest FTSE 100 index value (scaled by feed decimals)
     * @return updatedAt Timestamp of the last update
     */
    function getFtse100Value() external view returns (int256 value, uint256 updatedAt) {
        (, int256 answer, , uint256 timestamp, ) = ftse100Feed.latestRoundData();
        return (answer, timestamp);
    }
}
