module.exports = {
    logLevel: 'info',
    forceSourceRefresh: false,
    forceExecutableRefresh: false,
    downloadImages: true,
    launchboxPlatform: 'WINDOWS',
    preferredLanguage: 'en',
    onlyUpdateNewer: true,
    organizeDirectories: {
        shouldAsk: true,
        minimumScoreToAsk: 1,
        minimumScoreToAccept: 4
    },
    advanced: {
      scores: {
          resultExists: 1,
          onlyOneResultExists: 1,
          extractedDlsiteCode: 3,
          matchForExtractedDlsiteCode: 3,
          exactMatch: 3,
          noSpaceExactMatch: 3,
          noSpaceSimilarMatch: 2,
          noSpaceSimilarMatchSecondSide: 2,
          similarMatch: 2,
          similarMatchSecondSide: 2
      }
    },
    paths: {
        backup: './sample/launchbox',
        launchbox: 'C:\\Users\\Alein\\LaunchBox',
        unsortedGames: 'J:\\!NEWORDER\\!',
        main: ['J:\\!NEWORDER\\GETCHU', 'J:\\!NEWORDER\\DLSITE']
        // main: ['./sample/games/getchu']
        // main: ['./sample/games/dlsite']
    }
};
