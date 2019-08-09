module.exports = {
    logLevel: 'info',
    externalIdField: 'SortTitle', //Suggested: SortTitle, Source, Status or CustomField
    downloadImages: true,
    launchboxPlatform: 'WINDOWS',
    preferredLanguage: 'en',
    preferredImageSource: 'en',
    onlyUpdateNewer: true,
    database: {
        database: 'nedb', //'nedb' or 'mongodb'
        nedbFilename: 'games.db',
        mongoUri: 'mongodb://localhost/test',
    },
    organizeDirectories: {
        shouldAsk: true,
        maxResultsToSuggest: 6,
        minimumScoreToAsk: 2,
        minimumScoreToAccept: 6
    },
    exeSearchDepth: 3,
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
    },
    executableExtensions: ['.exe', '.swf'],
    bannedFilenames: [
        'セーブデータ場所設定ツール',
        'ファイル破損チェックツール',
        'unins',
        'conf',
        'setup',
        'setting',
        'inst',
        'signup',
        'check',
        'update',
        'alpharomdie',
        'セーブデータフォルダを開く',
        'unity',
        'アンインストール',
        '設定',
        'delfile',
        '結合ナビ',
        'acmp.exe',
        'courier.exe',
        'courier_i.exe'
    ]
};
