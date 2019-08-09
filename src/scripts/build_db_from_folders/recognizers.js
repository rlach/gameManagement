const fs = require('fs');

class Recognizer {
    constructor(engine, rules, customValidator) {
        this.engine = engine;
        this.rules = rules;
        this.customValidator = customValidator;
    }
}

function isBruns(gameRelatedFiles) {
    return (
        gameRelatedFiles.some(f => f.name.toLowerCase() === 'ams.cfg') &&
        gameRelatedFiles.some(
            f =>
                f.name.toLowerCase().endsWith('.bso') ||
                f.name.toLowerCase().startsWith('bruns')
        )
    );
}

function isRPGVXAce(gameRelatedFiles) {
    if (gameRelatedFiles.find(f => f.name.toLowerCase().endsWith('rgss3a'))) {
        return true;
    }
    const gameIni = gameRelatedFiles.find(
        f => f.name.toLowerCase() === 'game.ini'
    );
    if (gameIni) {
        const gameIniText = fs
            .readFileSync(gameIni.file)
            .toString()
            .toLowerCase();
        if (gameIniText.toLowerCase().includes('rpgvxace')) {
            return true;
        }
    }
}

function isRPGVxOrXp(gameRelatedFiles) {
    if (
        gameRelatedFiles.find(
            f =>
                f.name.toLowerCase() === 'game.exe' ||
                f.name.toLowerCase().endsWith('rgssad') ||
                f.name.toLowerCase().endsWith('rgss2a')
        )
    ) {
        const gameIni = gameRelatedFiles.find(f =>
            f.name.toLowerCase().endsWith('game.ini')
        );
        if (gameIni) {
            const gameIniText = fs
                .readFileSync(gameIni.file)
                .toString()
                .toLowerCase();
            if (
                gameIniText.includes('rpgvx') ||
                gameIniText.includes('rvdata')
            ) {
                return 'rpgMakerVX';
            } else if (gameIniText.includes('rxdata')) {
                return 'rpgMakerXP';
            }
        }
    }
}

function isRPGVx(gameRelatedFiles) {
    return isRPGVxOrXp(gameRelatedFiles) === 'rpgMakerVX';
}

function isRPGXp(gameRelatedFiles) {
    return isRPGVxOrXp(gameRelatedFiles) === 'rpgMakerXP';
}

function isRPGMV(gameRelatedFiles) {
    const packageJson = gameRelatedFiles.find(
        f => f.name.toLowerCase() === 'package.json'
    );
    if (packageJson) {
        const file = fs.readFileSync(packageJson.file);
        if (file.includes('RPGMV')) {
            return true;
        } else if (
            gameRelatedFiles.find(
                f => f.name.toLowerCase() === 'resources.pak'
            ) ||
            gameRelatedFiles.find(f => f.name.toLowerCase() === 'game.exe')
        ) {
            return true;
        }
    } else if (
        gameRelatedFiles.find(f => f.name.toLowerCase() === 'game_boxed.exe')
    ) {
        return true;
    }
}

const recognizers = [
    new Recognizer('YaneAkabeiSoft2Try', {
        equals: ['yanesdk.dll'],
    }),
    new Recognizer('Anex86', {
        equals: ['anex86.exe'],
    }),
    new Recognizer('AOS', {
        endsWith: ['.aos'],
    }),
    new Recognizer('Apricot', {
        startsWith: ['arc.a'],
    }),
    new Recognizer('ArtemisEngine', {
        endsWith: ['.pfs'],
    }),
    new Recognizer('AtelierKaguya', {
        equals: ['message.dat'],
    }),
    new Recognizer('BGI', {
        startsWith: ['bgi.'],
    }),
    new Recognizer(
        'bruns',
        {
            startsWith: ['bruns'],
            equals: ['ams.cfg'],
            endsWith: ['.bso'],
        },
        isBruns
    ),
    new Recognizer('C4', {
        equals: ['c4.exe', 'xex.exe'],
    }),
    new Recognizer('Caramel', {
        endsWith: ['.bin'],
    }),
    new Recognizer('SystemC@CandySoft', {
        endsWith: ['.fpk'],
    }),
    new Recognizer('CatSystem2', {
        endsWith: ['.int'],
    }),
    new Recognizer('CMVS', {
        equals: ['cmvs32.exe', 'cmvs64.exe'],
        endsWith: ['.cpz'],
    }),
    new Recognizer('Cotopha', {
        endsWith: ['.noa'],
    }),
    new Recognizer('Debonosu', {
        equals: ['bmp.bak', 'dsetup.dll'],
    }),
    new Recognizer('EAGLS', {
        equals: ['eagles.dll'],
    }),
    new Recognizer('EmonEngine', {
        equals: ['emecfg.ecf'],
    }),
    new Recognizer('Eushully', {
        equals: ['agerc.dll'],
    }),
    new Recognizer('Gsen18', {
        endsWith: ['.szs'],
    }),
    new Recognizer('GXP', {
        endsWith: ['.gxp'],
    }),
    new Recognizer('KiriKiri', {
        equals: ['data.xp3'],
    }),
    new Recognizer('Live', {
        equals: ['live.dll'],
    }),
    new Recognizer('Malie@light', {
        equals: ['malie.ini'],
    }),
    new Recognizer('MarineHeart', {
        equals: ['saisys.exe'],
    }),
    new Recognizer('MBL', {
        endsWith: ['.mbl'],
    }),
    new Recognizer('MED', {
        endsWith: ['.med'],
    }),
    new Recognizer('NeXAS', {
        equals: ['thumbnail.pac'],
    }),
    new Recognizer('NEXTON', {
        equals: ['ainfo.db'],
    }),
    new Recognizer('NitroPlus', {
        endsWith: ['.npa'],
    }),
    new Recognizer('NSCR2', {
        endsWith: ['.ns2'],
    }),
    new Recognizer('Pensil', {
        equals: ['psetup.exe'],
    }),
    new Recognizer('Rai7puk', {
        equals: ['rai7.exe'],
    }),
    new Recognizer('Rejet', {
        equals: ['gd.dat', 'pf.dat', 'sd.dat'],
    }),
    new Recognizer('Retouch', {
        equals: ['resident.dll'],
    }),
    new Recognizer(
        'rpgMakerMv',
        {
            equals: [
                'package.json',
                'game_boxed.exe',
                'game.exe',
                'resources.pak',
            ],
        },
        isRPGMV
    ),
    new Recognizer(
        'rpgMakerAceVX',
        {
            endsWith: ['rgss3a'],
        },
        isRPGVXAce
    ),
    new Recognizer(
        'rpgMakerVX',
        {
            endsWith: ['rgssad', 'rgss2a'],
            equals: ['game.ini'],
        },
        isRPGVx
    ),
    new Recognizer(
        'rpgMakerXP',
        {
            endsWith: ['rgssad', 'rgss2a'],
            equals: ['game.ini'],
        },
        isRPGXp
    ),
    new Recognizer('rUGP', {
        equals: ['rugp.exe'],
    }),
    new Recognizer('RunrunEngine', {
        equals: ['rrecfg.rcf'],
    }),
    new Recognizer('ShinaRio', {
        equals: ['rio.ini'],
    }),
    new Recognizer('sigulus', {
        startsWith: ['sigulus'],
        equals: ['gameexe.dat', 'scene.pck'],
    }),
    new Recognizer('sol-fa-soft', {
        endsWith: ['.iar', '.sec5'],
    }),
    new Recognizer('elf', {
        equals: ['silky.exe'],
    }),
    new Recognizer('System43@AliceSoft', {
        equals: ['alicestart.ini'],
    }),
    new Recognizer('Tanuki', {
        endsWith: ['.tak'],
    }),
    new Recognizer('Taskforce2', {
        equals: ['taskforce2.exe'],
    }),
    new Recognizer('Tenco', {
        equals: ['check.mdx'],
    }),
    new Recognizer('Triangle', {
        equals: ['execle.exe'],
    }),
    new Recognizer('unity', {
        equals: ['mono.dll'],
    }),
    new Recognizer('YukaSystem2', {
        endsWith: ['.ykc'],
    }),
    new Recognizer('YU-RIS', {
        endsWith: ['.ypf'],
    }),
    new Recognizer('WillPlus', {
        equals: ['rio.arc'],
    }),
    new Recognizer('wolf', {
        startsWith: ['guruguru'],
    }),
    new Recognizer('IroneGameSystem', {
        equals: ['igs_sample.exe'],
    }),
    new Recognizer('Lucifen@Navel', {
        endsWith: ['.lpk'],
    }),
    new Recognizer('Ryokucha', {
        equals: ['_checksum.exe'],
    }),
    new Recognizer('RealLive', {
        startsWith: ['reallive'],
    }),
    new Recognizer('SoftHouse', {
        endsWith: ['.vfs'],
    }),
    new Recognizer('Stuff', {
        endsWith: ['.mpk'],
    }),
    new Recognizer('TinkerBell', {
        equals: ['arc00.dat'],
    }),
    new Recognizer('WAFFLE', {
        equals: ['cg.pak'],
    }),
];

const allRules = {
    startsWith: [],
    equals: [],
    endsWith: [],
};
recognizers.forEach(r => {
    if (r.rules.startsWith) {
        allRules.startsWith.push(...r.rules.startsWith);
    }
    if (r.rules.equals) {
        allRules.equals.push(...r.rules.equals);
    }
    if (r.rules.endsWith) {
        allRules.startsWith.push(...r.rules.endsWith);
    }
});

module.exports = { recognizers, allRules };
