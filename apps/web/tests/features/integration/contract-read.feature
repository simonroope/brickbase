Feature: Contract read integration
  As the application
  I need to read from blockchain contracts
  So that users can view property data and oracle prices

  Scenario: Fetch properties when contracts are configured
    Given the app has valid contract addresses
    When the homepage loads
    Then the app should attempt to fetch properties from AssetVault and AssetShares

  Scenario: Fetch oracle prices when OracleRouter is configured
    Given the app has a valid OracleRouter address
    When the header loads
    Then the app should display ETH/USD, USD/GBP, USD/Gold, and FTSE 100 prices
