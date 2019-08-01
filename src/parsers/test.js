const moment = require('moment');
const htmlparser = require('htmlparser');
const log = require('../logger');
const fs = require('fs');
const select = require('soupselect').select;

async function main() {
    log.info('start');
    const file = fs.readFileSync('./sample/dmm.html');

    const root = parseSite(file);

    const images = select(root, '.fn-colorbox')
        .map(a => (a.attribs ? a.attribs.href : ''))
        .filter(a => a !== '');
    const mainImage = images.splice(0, 1);
    const informationList = getInformationList(root);

    log.info('fields', {
        name: getTitle(root),
        genres: getGenres(root),
        images: mainImage,
        additionalImages: images,
        description: select(root, '.summary__txt')
            .pop()
            .children.filter(c => c.type === 'text')
            .map(c => c.data.trim())
            .join('\n'),
        releaseDate: informationList['配信開始日']
            ? moment(informationList['配信開始日'], 'YYYY-MM-DD HH:mm').format()
            : undefined,
        series: informationList['シリーズ'] === '----' ? undefined : informationList['シリーズ'],
        tags: informationList['ゲームジャンル'],
        maker: getMaker(root),
        video: getVideo(root),
        communityStars: getCommunityStars(root),
        communityStarVotes: getCommunityVotes(root)
    });
}

main().catch(e => log.debug('Error in main process', e));

function getInformationList(root) {
    const informationList = {};
    select(root, '.informationList').forEach(il => {
        try {
            let keyElement = il.children.find(c => c.attribs && c.attribs.class.includes('informationList__ttl'));
            let valueElement = il.children.find(c => c.attribs && c.attribs.class.includes('informationList__txt'));
            if (keyElement && valueElement) {
                let foundKey = keyElement.children.find(c => c.type === 'text').data.trim();
                let foundValue = valueElement.children.find(c => c.type === 'text').data.trim();
                informationList[foundKey] = foundValue;
            }
        } catch (e) {
            log.debug('Could not get information list');
        }
    });
    return informationList;
}

function getCommunityVotes(root) {
    try {
        return Number.parseInt(
            select(root, '.d-review__evaluates strong')[0]
                .children.find(c => c.type === 'text')
                .data.trim()
                .match(/\d+/)[0]
        );
    } catch (e) {
        log.debug('Could not get community star votes');
    }
}

function getCommunityStars(root) {
    try {
        return Number.parseFloat(
            select(root, '.d-review__average strong')[0]
                .children.find(c => c.type === 'text')
                .data.trim()
                .match(/(\d+(\.\d+)?)/)[0]
        );
    } catch (e) {
        log.debug('Could not get community stars');
    }
}

function getGenres(root) {
    return select(root, '.genreTag__txt')
        .map(t => {
            try {
                return t.children.find(c => c.type === 'text').data.trim();
            } catch (e) {
                log.debug('Genres could not be mapped');
            }
        })
        .filter(g => g !== '');
}

function getMaker(root) {
    try {
        return select(root, '.circleName__txt')[0]
            .children.find(c => c.type === 'text')
            .data.trim();
    } catch (e) {
        log.debug('Maker not found or wrong');
    }
}

function getTitle(root) {
    try {
        return select(root, 'meta[property="og:title"]')[0].attribs.content;
    } catch (e) {
        log.debug('Og:title meta property not found or wrong');
    }
}

function getVideo(root) {
    try {
        return select(root, '.productPreview__item source')[0].attribs.src;
    } catch (e) {
        log.debug('Could not get video source');
    }
}

function parseSite(rawHtml) {
    const handler = new htmlparser.DefaultHandler(function(error, dom) {
        if (error) {
            log.debug('Error parsing html', error);
        } else {
            log.debug('Parsing done!');
        }
    });
    const parser = new htmlparser.Parser(handler);
    parser.parseComplete(rawHtml);
    log.debug('Dom parsed!');
    return handler.dom;
}
