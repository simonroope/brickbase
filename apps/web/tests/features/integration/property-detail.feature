Feature: Property detail page
  As a user
  I want to view property details and purchase options
  So that I can explore tokenized properties and buy shares

  Background:
    Given the app is running

  Scenario: User can view property details page
    When I navigate to the property detail page for asset 1
    Then I should see the app shell
    And I should see the back to properties link
    And I should see property details or property name

  Scenario: When property exists, BuyShares shows connect-to-purchase
    When I navigate to the property detail page for asset 1
    Then I should see the app shell
    And I should see the back to properties link
    And I should see "Capital Value" in the page
    And I should see "Connect your wallet to purchase" in the page

  Scenario: Property not found for non-existent asset
    When I navigate to the property detail page for asset 999
    Then I should see the app shell
    And I should see the property not found message
