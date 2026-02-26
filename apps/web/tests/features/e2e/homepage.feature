Feature: Homepage
  As a retail user
  I want to see the list of properties
  So that I can browse and select one to view details

  Scenario: User visits homepage
    Given the app is running
    When I navigate to the homepage
    Then I should see "Property Assets" in the page
    And I should see a "Connect Wallet" button or connected address

  Scenario: User sees property list when properties exist
    Given the app is running
    When I navigate to the homepage
    Then I should see either the property list or an empty state message
