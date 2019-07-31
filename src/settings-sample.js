module.exports = {
    logLevel: 'info',
    externalIdField: 'SortTitle', //Suggested: SortTitle, Source, Status or CustomField
    forceSourceRefresh: false,
    forceExecutableRefresh: false,
    forceAdditionalImagesRefresh: false,
    downloadImages: true,
    launchboxPlatform: 'WINDOWS',
    preferredLanguage: 'en',
    onlyUpdateNewer: true,
    organizeDirectories: {
        shouldAsk: true,
        minimumScoreToAsk: 1,
        minimumScoreToAccept: 4
    },
    exeSearchDepth: 2,
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
        targetSortFolder: './sample/games/dlsite',
        launchbox: './sample/launchbox',
        unsortedGames: './sample/games/unsorted',
        main: ['./sample/games/dlsite', './sample/games/getchu']
    }
};
