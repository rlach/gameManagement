# Hisho86

[![Build Status](https://travis-ci.org/rlach/gameManagement.svg?branch=master)](https://travis-ci.org/rlach/gameManagement)
[![Coverage Status](https://coveralls.io/repos/github/rlach/gameManagement/badge.svg?branch=master)](https://coveralls.io/github/rlach/gameManagement?branch=master)

Hisho86 is a tool intended to help with organization and management of japanese games in [Launchbox game launcher](https://www.launchbox-app.com). This includes, but is not limited to, professional games, doujins, rpg maker based games, visual novels etc.

Hisho86 requires you to keep your games in proper directory structure and uses external resources from multiple storefronts and databases to fill up Launchbox with relevant information. It also provides a tool to help you organize disorganized games into proper directory structure.

This project is NOT endorsed by or in any way supported by Launchbox developers. You can treat it as unofficial plugin, except it's not being plugged in into Launchbox itself.

## Main utility

Hisho86 can be used to scan selected folder(s) for games and send them as a single platform to Launchbox. The Launchbox platform will be created if it doesn't exist. You can then use Launchbox as normal, and next time you perform sync changes you made will be kept, while new games etc. will be added.

The result:

[screenshots here]

## Using the program

### Configuration

Launch the `.exe` file and `settings.json` file will be created in the same directory. Edit it with your favorite text editor to setup your folders. All folders you set there need to exist already.

This is the section that needs to be edited:

```yaml
sample here
```

You can use relative paths starting with a dot. For example `./sample` will be the subdirectory where you ran the .exe. It's best to just use full paths starting with drive letter if you don't know what to do.

You also should set the name of Launchbox Platform you want to use. You can also check other settings and change them if you wish.

Once you are happy with your settings run the application again.

### Synchronisation process

When you run application you will be met with list of options which you can perform. Usually you will want to schoose `Sync everything` option. This performs the following (in order):

1. Tries to find what games are in your unorganized folder
2. Organizes folders automatically or semi-automatically into your target sort folder
3. Scans your main folders in search of executable files, checks if games were deleted, recognizes game engine
4. Downloads metadata for games from vndb and store sites
5. Saves the details into Launchbox platform
6. Downloads the boxes, screenshots and backdrops for the games

The process can take from few seconds to few hours depending on how many new games you added, how many images there are to download, how fast your network is etc.

Don't worry, you can close the application at any time - it will not perform most of slow operations once it completed them once, so it will pretty much pick up where it stopped.

#### Folder organization

Hisho86 forces your main folders to be organized as follows:

```text
> main directory
    > GAME_CODE
        > GAME_VERSION1
            game.exe
            other game files
        > GAME_VERSION2
            version2.exe
            other version2 files
    > GAME_CODE2
        > GAME_VERSION
            game.exe
            game files
```

Game codes should ids assigned by storefronts and/or vndb. Supported storefronts are:

-   DLsite - sample codes: `RJ123456`, `VJ123456`, `RE123456`
-   Getchu - sample codes: `123456`, `12345678`
-   VNDB - sample codes: `v1`, `v123456`
-   DMM - sample codes: `d_12345`, `next_12345`, `a_something12345`

##### Manual organization

If you want to organize directories manually use your favorite storefront, find the game there and copy the relevant code from page URL.

The Game version folders can be named anything except for the word `DELETED`. If you have folder with this name it will be treated as deleted game.

Directly under game version folder should be the executable file. If it's deeper the game will still be added to launchbox but your .exe file won't be found and you will have to set it manually in launchbox when trying to run the game.

For example this would be proper setup:

```text
> My doujin games
    > RE258506
        > Touhou Shoujo: Tale of Beautiful Memories [ver 1.0] (The N Main Shop)
            (game files here)
```

And it would create entry in Launchbox for game found in https://www.dlsite.com/eng-touch/work/=/product_id/RE258506.html

If your game is from patreon etc. and is not sold anywhere you can use codes starting with word other and followed by number, for example `other1`. They will be added to your library, but only name will be filled in.

##### Automatic organization

If you have sizeable amount of games and they are not organized in proper manner you can use help of Hisho86. When run Hisho86 will try to find the game on all sources based on folder filename.

For example if your game is in folder named `Touhou Shoujo: Tale of Beautiful Memories [ver 1.0] (The N Main Shop)` Hisho86 will remove tags in [] and () brackets and most probably will find the game on DLSITE.

Then Hisho will try to score the results when comparing to original filename and select best match. In the case of this example name Hisho86 would decide code `RE258506` is best match.

Depending on how close found name is to the folder name one of 3 things will happen:

1. Game will be automatically moved to proper folder
2. You will be asked which of the results is actually right (ordered from what Hisho86 thinks is the best)
3. It will automatically be rejected

This behaviour depends on the score game got and following settings:

```text
    "organizeDirectories": {
        "shouldAsk": true,
        "maxResultsToSuggest": 6,
        "minimumScoreToAsk": 2,
        "minimumScoreToAccept": 6
    },
```

If should ask is set to `false` Hisho86 will only choose games that have score of 6+. You can also adjust score limits and how many games will Hisho86 suggest when it asks.

With test of over 2000 folders with different game names and settings as above Hisho86 had about 100 questions for me, could not find 300 games(that's what you get when you call folders with your games `a`) and from 1600 games it determined automatically only 15 were mismatches. Your results might vary.

As for search results performed by Hisho86 they will be stored in folder with the game in file !foundCodes.txt. You can set minimum score to accept to 1000, should ask to false and Hisho86 will only save those results in game folders. Then you can use that data to help you decide, if you rather don't want to risk Hisho86 making a mistake.

Although I suggest just going for that - worst case scenario you'll spot mistakes easily. See box of a comic book or game you never saw? Yeah, probably a mistake. Just move it into proper folder manually.

## Optional utilities

### Finding possible duplicates

You can run script `find possible duplicates` by using argument `script=findDuplicates` or selecting appropriate option from visual menu.

The script will find all directories defined in your main paths and generate `duplicates.txt` file that lists:

-   directories that have no subdirectories
-   directories that have more than 1 subdirectory

Each listing will have a number which represent how many possible duplicates there are. If you have 2 subdirectories it will be 1, 3 will give you 2.

If there are no subdirectories the number associated will be -1.

If you want to have multiple versions of the game in the directory and not be notified about them in the future you can add a file `versions.txt` under relevant path.

For example if you have this folder structure:

```text
-RJ123456
---version1
---some other version
```

you can create file `RJ123456/versions.txt` with contents:

```text
version1
some other version
```

and all those versions will count as one. You will be notified about possible duplicates only if you add 3rd subdirectory.

### Forcing database update

You can run script `force update` by using argument `script=setForceUpdate` or selecting appropriate option from visual menu.

This will guide you trough few questions on which data you want update and in which games. The script is mostly to help quickly update items during development or fix data after relevant bugs were resolved.

If all goes well you will never use this.
