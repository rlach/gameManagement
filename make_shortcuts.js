const fs = require('fs');
const find = require('fs-find');
const ws = require('windows-shortcuts');
const { promisify } = require('util')
const fsAsync = {
    readdir: promisify(fs.readdir)
}
const wsAsyncCreate = promisify(ws.create);
const asyncFind = promisify(find);

const mainPath = `J:/!NEWORDER\/DLSITE`;
const shortcutsPath = `J:/!NEWORDER/Shortcuts`;
const targetPath = `^%windir^%/explorer.exe`;

const bannedFileNames = ['セーブデータ場所設定ツール', 'ファイル破損チェックツール', 'unins', 'conf', 'setup', 'settings', 'install', 'check', 'alpharomdie', 'セーブデータフォルダを開く', 'unity', 'アンインストール', '設定', 'delfile', '結合ナビ'];

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  main();
});

var gameId = { type: String, index: { unique: true }}
var gameSchema = new mongoose.Schema({
    id: gameId,
    nameEn: String,
    nameJp: String,
    descriptionEn: String,
    descriptionJp: String,
    genresEn: [String],
    genresJp: [String],
    tagsEn: [String],
    tagsJp: [String],
    makerEn: String,
    makerJp: String,
    imageUrlJp: String,
    imageUrlEn: String,
    shortcutExists: Boolean
  });

var Game = mongoose.model('Game', gameSchema);

async function saveGame(gameData) {
    console.log('Saving game');
    var game = new Game(gameData);
    return game.save();
}

async function findGame(id) {
    return Game.findOne({
        id
    }).exec();
}

function notIn(f, strings) {
    for(const str of strings) {
        if(f.indexOf(str) > -1) {
            return false;
        }
    }
    return true;
}

async function makeLink(name, target, game) {
    console.log(`making link to ${target}`);
    try {
        await wsAsyncCreate(`${shortcutsPath}/${name}.lnk`, {
            target: targetPath,
            args: `..\\DLSITE\\${target}`
        });
        game.shortcutExists = true;
        await game.save();
    } catch (e) {
        console.log(`File ${name} sucks - ${e}`);
    }
}

async function main() {
    console.log(mainPath);
    const files = await fsAsync.readdir(mainPath);

    for(const file of files) {
        let game = await findGame(file);
        if(!game) {
            game = await saveGame({
                id: file
            });
        }
        if(game.shortcutExists) {
            console.log(`Skipping ${file}`);
        } else {
            console.log(`Processing ${file}`);
            if(!game.nameEn && !game.nameJp) {
                const gameData = await fetchGameData(file);
                Object.assign( game, gameData );
    
                await game.save();
            }
            const foundFiles = await(asyncFind(`${mainPath}/${file}`, {
                file: (f) => (f.toLowerCase().endsWith('.exe') || f.toLowerCase().endsWith('.swf')) && notIn(f.toLowerCase(), bannedFileNames),
                depth: 2,
                followLinks: true
            }));
    
            const wrongChars = /[\\\/:*?\"<>|]/gi
            let linkName = file;
            if(game.nameEn || game.nameJp) {
                const name = game.nameEn ? game.nameEn.replace(wrongChars, '') : game.nameJp.replace(wrongChars, '');
                let maker = '';
                try {
                    maker = game.makerEn ? game.makerEn.replace(wrongChars, '').replace(/ /gi, '_') : game.makerJp.replace(wrongChars, '').replace(/ /gi, '_');
                } catch(e) {
                    console.log('Unknown maker');
                }
                const genres = game.genresEn ? game.genresEn.map(g => g.replace(/ /gi, '_').replace(/\//gi, '+')).join(' ') : '';
                linkName = `${name} [${maker} ${genres}]`;
            }
    
            if(foundFiles.length == 0) {
                console.log(`${file} has no exe`);
                const subfiles = await fsAsync.readdir(`${mainPath}/${file}`);
                if(subfiles.find(f => f === 'DELETED')) {
                    console.log('Game was deleted');
                } else {
                    if(subfiles > 0) {
                        await makeLink(linkName, `${file}\\${subfiles[0]}`, game);
                    } else {
                        await makeLink(linkName, `${file}`, game)
                    }
                }
            } else if (foundFiles.length === 1) {
                await makeLink(linkName, `${file}\\${foundFiles[0].relative}`, game);
            } else {
                let gameExe = foundFiles.find(t => t.name.toLowerCase().startsWith('game'));
                if(!gameExe) {
                    gameExe = foundFiles.find(t => t.name.toLowerCase().endsWith('exe'));
                }
                if(!gameExe) {
                    gameExe = foundFiles[0];
                }
    
                await makeLink(linkName, `${file}\\${gameExe.relative}`, game);
            }
        }                    
    }

    db.close();
}

const htmlParser = require('node-html-parser');
const request = require("request-promise");

function getOptions(id) {
    return {
      method: 'GET',
      uri: `https://www.dlsite.com/maniax/work/=/product_id/${id}.html`
    };
  }
  
  function getOptionsEn(id) {
    return {
      method: 'GET',
      uri: `https://www.dlsite.com/ecchi-eng/work/=/product_id/${id}.html`
    }
  }

  function getGameMetadata(root) {
      try {
        return {
            name: root.querySelector('#work_name').text.trim(),
            description: root.querySelector('.work_article').text.trim(),
            genres: root.querySelector('.main_genre').childNodes.map(node => node.text.trim()).filter(n => n !== ''),
            tags: root.querySelector('.work_genre').childNodes.map(node => node.text.trim()).filter(n => n !== ''),
            maker: root.querySelector('.maker_name').text.trim(),
            image: root.querySelector('.slider_item').firstChild.attributes.src
        };
      } catch(e) {
          console.log('!!!!!!!');
          console.log(e.message);
          console.log(e)
      }
  }
  
  async function getEnglishSite(id) {
    if(id.startsWith('VJ')) {
        return undefined;
    }

    const idEn = id.replace('RJ', 'RE');
  
    try {
      const reply = await request.get(getOptionsEn(idEn));
      const root = htmlParser.parse(reply);
      return getGameMetadata(root);
    } catch (e) {
      console.log(`Error getting ${idEn}`);
      return undefined;
    }
  }
  
  async function getSite(id) {
    try {
        let reply;
        try {
            reply = await request.get(getOptions(id));
        } catch (e) {
            reply = await request.get({
                method: 'GET',
                uri: `https://www.dlsite.com/pro/announce/=/product_id/${id}.html`
              });
        }
        const root = htmlParser.parse(reply);
        return getGameMetadata(root);
    } catch (e) {
        console.log(`Error getting ${id}`);
        return undefined;
    }
  }

async function fetchGameData(file) {
    console.log(`Fetching game ${file}`);
    const sites = await Promise.all([getSite(file), getEnglishSite(file)]);
    const jpn = sites[0] ? sites[0] : {};
    const eng = sites[1] ? sites[1] : {};
    return {
        nameEn: eng.name,
        nameJp: jpn.name,
        descriptionEn: eng.description,
        descriptionJp: jpn.description,
        genresEn: eng.genres,
        genresJp: jpn.genres,
        tagsEn: eng.tags,
        tagsJp: jpn.tags,
        makerEn: eng.maker,
        makerJp: jpn.maker,
        imageUrlJp: jpn.image,
        imageUrlEn: eng.image
        
    }
}