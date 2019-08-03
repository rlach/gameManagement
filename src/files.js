const {promisify} = require('util');

const find = require('fs-find');
const fs = require('fs');
const asyncFind = promisify(find);
const settings = require('./settings');

class Files {
    async findExecutables(path) {
        return asyncFind(path, {
            file: f => hasProperExtension(f) && !isBanned(f),
            depth: settings.exeSearchDepth,
            followLinks: true
        });
    }

    removeTagsAndMetadata(name) {
        let improvedName = name.replace(/\[([^\]]+)\]/g, ''); //remove []
        improvedName = improvedName.replace(/\(([^)]+)\)/g, ''); //remove ()
        improvedName = improvedName.replace(/Ver.*/gi, ''); //remove versions
        improvedName = improvedName.trim();

        return improvedName;
    }

    async recognizeGameType(file) {
        const basePath = `${file.path}/${file.name}`;
        const subdirectories = fs.readdirSync(basePath, {withFileTypes: true})
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        if (subdirectories.length === 0) {
            return;
        }

        const versionPath = `${basePath}/${subdirectories[0]}`;

        const gameRelatedFiles = await asyncFind(versionPath, {
            file: (_, f) => {
                return f.matcher.toLowerCase().startsWith('guruguru') //Wolf
                    || f.matcher.toLowerCase() === 'package.json' //RPG MV
                    || f.matcher.toLowerCase() === 'game_boxed.exe' //RPG MV
                    || f.matcher.toLowerCase() === 'game.exe' //RPG MV
                    || f.matcher.toLowerCase() === 'resources.pak' //RPG MV
                    || f.matcher.toLowerCase().endsWith('rgss3a') //RPG VX Ace
                    || f.matcher.toLowerCase().endsWith('rgssad') //RPG XP & VX
                    || f.matcher.toLowerCase().endsWith('rgss2a') //RPG XP & VX
                    || f.matcher.toLowerCase() === 'game.ini'  //RPG XP & VX
                    || f.matcher.toLowerCase().includes('siglus') //Siglus engine
                    || f.matcher.toLowerCase() === 'gameexe.dat' //Siglus engine
                    || f.matcher.toLowerCase() === 'scene.pck' //Siglus engine
                    || f.matcher.toLowerCase() === 'data.xp3' //KiriKiri
                    || f.matcher.toLowerCase().endsWith('.ns2') // ????
                    || f.matcher.toLowerCase() === 'ams.cfg' // Bruns Engine
                    || f.matcher.toLowerCase().endsWith('.ypf') // YU-RIS
                    || f.matcher.toLowerCase().endsWith('.iar') // sol-fa-soft
                    || f.matcher.toLowerCase().endsWith('.sec5') // sol-fa-soft
                    || f.matcher.toLowerCase().endsWith('.swf') // Flash
                    || f.matcher.toLowerCase() === 'eagles.dll' // E.A.G.L.S
                    || f.matcher.toLowerCase() === 'mono.dll' // Unity
                    || f.matcher.toLowerCase().endsWith('.noa')// Cotopha
                    || f.matcher.toLowerCase() === 'yanesdk.dll' //Yane@AkabeiSoft2Try
                    || f.matcher.toLowerCase() === 'anex86.exe' // Anex86
                    || f.matcher.toLowerCase().endsWith('.aos')// AOS
                    || f.matcher.toLowerCase().startsWith('arc.a')// Apricot
                    || f.matcher.toLowerCase().endsWith('.pfs')// Artemis Engine
                    || f.matcher.toLowerCase() === 'message.dat' // Atelier Kaguya
                    || f.matcher.toLowerCase().startsWith('bgi.')// BGI
                    || f.matcher.toLowerCase() === 'c4.exe' // C4
                    || f.matcher.toLowerCase() === 'xex.exe' // C4
                    || f.matcher.toLowerCase().endsWith('.bin')// Caramel
                    || f.matcher.toLowerCase().endsWith('.fpk')// SystemC@CandySoft
                    || f.matcher.toLowerCase().endsWith('.int')// CatSystem2
                    || f.matcher.toLowerCase().endsWith('.cpz')// CMVS
                    || f.matcher.toLowerCase() === 'cmvs32.exe' // C4
                    || f.matcher.toLowerCase() === 'cmvs64.exe' // CMVS
                    || f.matcher.toLowerCase() === 'bmp.bak' // Debonosu
                    || f.matcher.toLowerCase() === 'dsetup.dll' // Debonosu
                    || f.matcher.toLowerCase() === 'emecfg.ecf' // EmonEngine
                    || f.matcher.toLowerCase() === 'agerc.dll' // Eushully
                    || f.matcher.toLowerCase().endsWith('.szs')// Gsen18
                    || f.matcher.toLowerCase().endsWith('.gxp')// GXP
                    || f.matcher.toLowerCase() === 'live.dll' // Live
                    || f.matcher.toLowerCase() === 'malie.ini' // Malie@light
                    || f.matcher.toLowerCase() === 'saisys.exe' // Marine Heart
                    || f.matcher.toLowerCase().endsWith('.mbl')// MBL
                    || f.matcher.toLowerCase().endsWith('.med')// MED
                    || f.matcher.toLowerCase() === 'thumbnail.pac' // NeXAS
                    || f.matcher.toLowerCase() === 'ainfo.db' // NEXTON
                    || f.matcher.toLowerCase().endsWith('.npa')// NitroPlus
                    || f.matcher.toLowerCase() === 'psetup.exe' // Pensil
                    || f.matcher.toLowerCase() === 'rai7.exe' // Rai7puk
                    || f.matcher.toLowerCase() === 'gd.dat' // Rejet
                    || f.matcher.toLowerCase() === 'pf.dat' // Rejet
                    || f.matcher.toLowerCase() === 'sd.dat' // Rejet
                    || f.matcher.toLowerCase() === 'rugp.exe' // rUGP
                    || f.matcher.toLowerCase() === 'resident.dll' // Retouch
                    || f.matcher.toLowerCase() === 'rrecfg.rcf' // RunrunEngine
                    || f.matcher.toLowerCase() === 'rio.ini' // ShinaRio
                    || f.matcher.toLowerCase() === 'silky.exe' // elf
                    || f.matcher.toLowerCase() === 'alicestart.ini' // System43@AliceSoft
                    || f.matcher.toLowerCase().endsWith('.tak')// Tanuki
                    || f.matcher.toLowerCase() === 'taskforce2.exe' // Taskforce2
                    || f.matcher.toLowerCase() === 'check.mdx' // Tenco
                    || f.matcher.toLowerCase() === 'execle.exe' // Triangle
                    || f.matcher.toLowerCase().endsWith('.ykc')// YukaSystem2
                    || f.matcher.toLowerCase() === 'rio.arc' // WillPlus
                    || f.matcher.toLowerCase() === 'igs_sample.exe' // IroneGameSystem
                    || f.matcher.toLowerCase().endsWith('.lpk')// Lucifen@Navel
                    || f.matcher.toLowerCase() === '_checksum.exe' // Ryokucha
                    || f.matcher.toLowerCase().startsWith('reallive') // RealLive
                    || f.matcher.toLowerCase().endsWith('.vfs') // SoftHouse
                    || f.matcher.toLowerCase().endsWith('.mpk')// Stuff
                    || f.matcher.toLowerCase() === 'arc00.dat' // TinkerBell
                    || f.matcher.toLowerCase() === 'cg.pak' // WAFFLE
            },
            depth: Math.max(settings.exeSearchDepth, 1)
        });

        if (gameRelatedFiles.length > 0) {
            if (isWolfGame(gameRelatedFiles)) {
                return 'wolf';
            }
            if (isRPGVXAce(gameRelatedFiles)) {
                return 'rpgMakerAceVX'
            }
            const vxOrXp = isRPGVxOrXp(gameRelatedFiles);
            if (vxOrXp) {
                return vxOrXp;
            }
            if (isSiglusEngine(gameRelatedFiles)) {
                return 'sigulusEngine';
            }
            if (isRPGMV(gameRelatedFiles)) {
                return 'rpgMakerMv'
            }
            if (isKiriKiri(gameRelatedFiles)) {
                return 'kiriKiri';
            }
            if (gameRelatedFiles.find(f => f.name.toLowerCase().endsWith('.ns2'))) {
                return '????';
            }
            if (gameRelatedFiles.find(f => f.name.toLowerCase() === 'mono.dll')) {
                return 'unity';
            }
            if (gameRelatedFiles.find(f => f.name.toLowerCase() === 'eagles.dll')) {
                return 'EAGLS';
            }
            if (gameRelatedFiles.find(f => f.name.toLowerCase().endsWith('.iar')) && gameRelatedFiles.find(f => f.name.toLowerCase().endsWith('sec5'))) {
                return 'sol-fa-soft';
            }
            if (gameRelatedFiles.find(f => f.name.toLowerCase().endsWith('.ypf'))) {
                return 'YU-RIS';
            }
            if (gameRelatedFiles.find(f => f.name.toLowerCase().endsWith('.noa'))) {
                return 'Cotopha';
            }
            if (gameRelatedFiles.find(f => isYaneAkabeiSoft2Try(f))) {
                return 'YaneAkabeiSoft2Try'
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'anex86.exe')) {
                return 'Anex86';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.aos'))) {
                return 'AOS';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().startsWith('arc.a'))) {
                return 'Apricot';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.pfs'))) {
                return 'ArtemisEngine';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'message.dat')) {
                return 'AtelierKaguya';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().startsWith('bgi.'))) {
                return 'BGI';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'c4.exe' || f.matcher.toLowerCase() === 'xex.exe')) {
                return 'C4';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.bin'))) {
                return 'Caramel';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.fpk'))) {
                return 'SystemC@CandySoft';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.int'))) {
                return 'CatSystem2';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.cpz') || f.matcher.toLowerCase() === 'cmvs32.exe' || f.matcher.toLowerCase() === 'cmvs64.exe')) {
                return 'CMVS';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'bmp.bak' || f.matcher.toLowerCase() === 'dsetup.dll')) {
                return 'Debonosu';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'emecfg.ecf')) {
                return 'EmonEngine';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'agerc.dll')) {
                return 'Eushully';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.szs'))) {
                return 'Gsen18';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.gxp'))) {
                return 'GXP';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'live.dll')) {
                return 'Live';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'malie.ini')) {
                return 'Malie@light';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'saisys.exe')) {
                return 'MarineHeart';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.mbl'))) {
                return 'MBL';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.med'))) {
                return 'MED';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'thumbnail.pac')) {
                return 'NeXAS';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'ainfo.db')) {
                return 'NEXTON';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.npa'))) {
                return 'NitroPlus';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'psetup.exe')) {
                return 'Pensil';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'rai7.exe')) {
                return 'Rai7puk';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'gd.dat' || f.matcher.toLowerCase() === 'pf.dat' || f.matcher.toLowerCase() === 'sd.dat')) {
                return 'Rejet';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'rugp.exe')) {
                return 'rUGP';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'resident.dll')) {
                return 'Retouch';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'rrecfg.rcf')) {
                return 'RunrunEngine';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'rio.ini')) {
                return 'ShinaRio';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'silky.exe')) {
                return 'elf';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'alicestart.ini')) {
                return 'System43@AliceSoft';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.tak'))) {
                return 'Tanuki';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'taskforce2.exe')) {
                return 'Taskforce2';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'check.mdx')) {
                return 'Tenco';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'execle.exe')) {
                return 'Triangle';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.ykc'))) {
                return 'YukaSystem2';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'rio.arc')) {
                return 'WillPlus';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'igs_sample.exe')) {
                return 'IroneGameSystem';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.lpk'))) {
                return 'Lucifen@Navel';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === '_checksum.exe')) {
                return 'Ryokucha';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().startsWith('reallive'))) {
                return 'RealLive';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.vfs'))) {
                return 'SoftHouse';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.mpk'))) {
                return 'Stuff';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'arc00.dat')) {
                return 'TinkerBell';
            }
            if (gameRelatedFiles.find(f => f.matcher.toLowerCase() === 'cg.pak')) {
                return 'WAFFLE';
            }

            if (gameRelatedFiles.find(f => f.name.toLowerCase() === 'ams.cfg')) {
                const otherFiles = await asyncFind(versionPath, {
                    file: (_, f) => {
                        return f.matcher.toLowerCase().endsWith('.bso') || f.matcher.toLowerCase().startsWith('bruns')
                    },
                    depth: Math.max(settings.exeSearchDepth, 1)
                });
                if (otherFiles.length > 0) {
                    return 'bruns'
                }
            }

            if (gameRelatedFiles.find(f => f.matcher.toLowerCase().endsWith('.swf'))) { // Keep flash low to avoid random flash files
                return 'Flash';
            }
        }
    }
}

let files = new Files();
module.exports = files;

function isYaneAkabeiSoft2Try(f) {
    return f.matcher.toLowerCase() === 'yanesdk.dll';
}

function isKiriKiri(gameRelatedFiles) {
    if (gameRelatedFiles.find(f => f.name.toLowerCase() === 'data.xp3')) {
        return true;
    }
}

function isWolfGame(gameRelatedFiles) {
    if (gameRelatedFiles.find(f => f.name.toLowerCase().startsWith('guruguru'))) {
        return true;
    }
}

function isSiglusEngine(gameRelatedFiles) {
    if (gameRelatedFiles.find(f => f.name.toLowerCase().includes('siglus') || f.name.toLowerCase() === 'gameexe.dat' || f.name.toLowerCase() === 'scene.pck')) {
        return true;
    }
}

function isRPGVXAce(gameRelatedFiles) {
    if (gameRelatedFiles.find(f => f.name.toLowerCase().endsWith('rgss3a'))) {
        return true;
    }
    const gameIni = gameRelatedFiles.find(f => f.name.toLowerCase() === 'game.ini');
    if (gameIni) {
        const gameIniText = fs.readFileSync(gameIni.file).toString().toLowerCase();
        if (gameIniText.toLowerCase().includes('rpgvxace')) {
            return true;
        }
    }

}

function isRPGVxOrXp(gameRelatedFiles) {
    if (gameRelatedFiles.find(f => f.name.toLowerCase() === 'game.exe' || f.name.toLowerCase().endsWith('rgssad') || f.name.toLowerCase().endsWith('rgss2a'))) {
        const gameIni = gameRelatedFiles.find(f => f.name.toLowerCase().endsWith('game.ini'));
        if (gameIni) {
            const gameIniText = fs.readFileSync(gameIni.file).toString().toLowerCase();
            if (gameIniText.includes('rpgvx') || gameIniText.includes('rvdata')) {
                return 'rpgMakerVX'
            } else if (gameIniText.includes('rxdata')) {
                return 'rpgMakerXP'
            }
        }
    }
}

function isRPGMV(gameRelatedFiles) {
    const packageJson = gameRelatedFiles.find(f => f.name.toLowerCase() === 'package.json');
    if (packageJson) {
        const file = fs.readFileSync(packageJson.file);
        if (file.includes('RPGMV')) {
            return true;
        } else if (gameRelatedFiles.find(f => f.name.toLowerCase() === 'resources.pak') || gameRelatedFiles.find(f => f.name.toLowerCase() === 'game.exe')) {
            return true;
        }
    } else if (gameRelatedFiles.find(f => f.name.toLowerCase() === 'game_boxed.exe')) {
        return true;
    }

}

function hasProperExtension(fileName) {
    return settings.executableExtensions.findIndex(extension => fileName.toLowerCase().endsWith(extension)) > -1;
}

function isBanned(fileName) {
    return settings.bannedFilenames.findIndex(bannedName => fileName.toLowerCase().includes(bannedName)) > -1;
}
