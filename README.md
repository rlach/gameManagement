# Hisho86

[![Build Status](https://travis-ci.org/rlach/gameManagement.svg?branch=master)](https://travis-ci.org/rlach/gameManagement)
[![Coverage Status](https://coveralls.io/repos/github/rlach/gameManagement/badge.svg?branch=master)](https://coveralls.io/github/rlach/gameManagement?branch=master)

Hisho86 is a tool intended to help with organization and management of japanese games in [Launchbox game launcher](https://www.launchbox-app.com). This includes, but is not limited to, professional games, doujins, rpg maker based games, visual novels etc.

Hisho86 requires you to keep your games in proper directory structure and uses external resources from multiple storefronts and databases to fill up Launchbox with relevant information. It also provides a tool to help you organize disorganized games into proper directory structure.

This project is NOT endorsed by or in any way supported by Launchbox developers. You can treat it as unofficial plugin, except it's not being plugged in into Launchbox itself.

## Main utility

Description incoming

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
