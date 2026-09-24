**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [unused-return](#unused-return) (4 results) (Medium)
## unused-return
Impact: Medium
Confidence: Medium
 - [ ] ID-0
[OracleRouter.getFtse100Value()](contracts/periphery/OracleRouter.sol#L70-L73) ignores return value by [(None,answer,None,timestamp,None) = ftse100Feed.latestRoundData()](contracts/periphery/OracleRouter.sol#L71)

contracts/periphery/OracleRouter.sol#L70-L73


 - [ ] ID-1
[OracleRouter.getEthUsdPrice()](contracts/periphery/OracleRouter.sol#L40-L43) ignores return value by [(None,answer,None,timestamp,None) = ethUsdFeed.latestRoundData()](contracts/periphery/OracleRouter.sol#L41)

contracts/periphery/OracleRouter.sol#L40-L43


 - [ ] ID-2
[OracleRouter.getGbpUsdPrice()](contracts/periphery/OracleRouter.sol#L50-L53) ignores return value by [(None,answer,None,timestamp,None) = gbpUsdFeed.latestRoundData()](contracts/periphery/OracleRouter.sol#L51)

contracts/periphery/OracleRouter.sol#L50-L53


 - [ ] ID-3
[OracleRouter.getGoldUsdPrice()](contracts/periphery/OracleRouter.sol#L60-L63) ignores return value by [(None,answer,None,timestamp,None) = goldUsdFeed.latestRoundData()](contracts/periphery/OracleRouter.sol#L61)

contracts/periphery/OracleRouter.sol#L60-L63


