Feature: E2E placeholder
  E2E tests run against real deployed contracts (no mock data).
  Add scenarios here when contracts are deployed and seeded.

  Scenario: E2E smoke - app loads
    Given the app is running
    When I navigate to the homepage
    Then I should see "Property Assets" in the page
