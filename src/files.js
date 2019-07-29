const { promisify } = require('util');

const find = require('fs-find');
const asyncFind = promisify(find);
const settings = require('./settings');

const bannedExeFileNames = [
    'セーブデータ場所設定ツール',
    'ファイル破損チェックツール',
    'unins',
    'conf',
    'setup',
    'setting',
    'install',
    'check',
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
];

const executableExtensions = ['.exe', '.swf'];

class Files {
    async findExecutables(path) {
        return asyncFind(path, {
            file: f => hasProperExtension(f) && !isBaned(f),
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
}

let files = new Files();
module.exports = files;

function hasProperExtension(fileName) {
    return executableExtensions.findIndex(extension => fileName.toLowerCase().endsWith(extension)) > -1;
}

function isBaned(fileName) {
    return bannedExeFileNames.findIndex(bannedName => fileName.toLowerCase().includes(bannedName)) > -1;
}
