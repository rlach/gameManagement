const settings = require('./settings');
const log = require('./logger');
const {promisify} = require('util');

const fs = require('fs');
const find = require('fs-find');
const fsAsync = {
    readdir: promisify(fs.readdir),
    writeFile: promisify(fs.writeFile)
};
// const wsAsyncCreate = promisify(ws.create);
const asyncFind = promisify(find);

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
    async readDir(path) {
        return fsAsync.readdir(path);
    }

    async findExecutables(path) {
        return asyncFind(path, {
            file: f => hasProperExtension(f) && !isBaned(f),
            depth: 2,
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

    async writeFile(path, content) {
        await fsAsync.writeFile(path, content);
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
