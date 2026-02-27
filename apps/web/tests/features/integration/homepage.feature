Feature: Homepage
  As a retail user
  I want to see the list of properties
  So that I can browse and select one to view details

  Scenario: User visits homepage
    Given the app is running
    When I navigate to the homepage
    Then I should see the app shell
    And I should see "Property Assets" in the page
    And I should see "Commercial Real Estate" in the page
    And I should see a "Connect Wallet" button or connected address
    And I should see navigation links "Properties" and "Admin"

  Scenario: User sees property list when properties exist
    Given the app is running
    When I navigate to the homepage
    Then I should see the app shell
    And I should see either the property list or an empty state message
    And I should see "Lyons House" in the page
