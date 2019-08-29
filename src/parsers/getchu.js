const log = require('../util/logger');
const moment = require('moment');
const html = require('../util/html');
const { parseSite } = require('../util/html');
const { removeUndefined } = require('../util/objects');
const vndb = require('../util/vndb');
const SiteStrategy = require('./siteStrategy');

const GETCHU_ID_REGEX = /\d{6,8}/gi;
const STRATEGY_NAME = 'getchu';

class GetchuStrategy extends SiteStrategy {
    constructor(settings) {
        super(STRATEGY_NAME, settings);
    }

    async fetchGameData(gameId, game) {
        log.debug(`Fetching game ${gameId} with strategy ${this.name}`);

        const sourceMissing = game ? game.sourceMissingJp : undefined;
        const jpnResult = await getJapaneseSite(gameId, sourceMissing);
        const jpn = jpnResult ? jpnResult : {};
        let eng = {};
        let reviews = {};
        if (jpn.nameJp) {
            log.debug(`Getting english site for ${jpn.nameJp}`);
            const engResult = await vndb.getVNByName(jpn.nameJp);
            if (engResult) {
                eng = engResult;
            }

            reviews = await getReviews(gameId);
        }

        const result = {};
        Object.assign(result, removeUndefined(jpn));
        Object.assign(result, removeUndefined(eng));
        Object.assign(result, removeUndefined(reviews));
        return result;
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(/\d{6,}/gi);
        return matches && matches[0].length <= 8 ? matches[0] : '';
    }

    async callFindGame(name) {
        const uri = `http://www.getchu.com/php/search.phtml?search_keyword=${encodeURIComponent(
            name
        )}&list_count=30&sort=sales&sort2=down&search_title=&search_brand=&search_person=&search_jan=&search_isbn=&genre=pc_soft&start_date=&end_date=&age=&list_type=list&gc=gc&search=search`;
        log.debug('Uri called for search', uri);
        return html.callPage(uri);
    }

    async findGame(name) {
        const reply = await this.callFindGame(name);
        const query = parseSite(reply);
        return query('.blueb')
            .map((i, e) => ({
                workno:
                    query(e).attr('href') &&
                    query(e)
                        .attr('href')
                        .match(GETCHU_ID_REGEX)
                        ? query(e)
                              .attr('href')
                              .match(GETCHU_ID_REGEX)[0]
                        : undefined,
                work_name: query(e)
                    .text()
                    .trim(),
            }))
            .get()
            .filter(b => b.workno);
    }

    async getAdditionalImages(id) {
        const result = await getJapaneseSite(id);
        return result.additionalImages;
    }

    shouldUse(gameId) {
        return !!gameId.match(/^\d{6,8}$/gi);
    }

    /* istanbul ignore next */
    async selfTest() {
        const fetchGameData = await getJapaneseSite('671747');

        const expectedGameData = {
            nameJp: 'ツンデレ★S乙女 -sweet sweet sweet-',
            releaseDate: '2010-04-16T00:00:00+02:00',
            descriptionJp:
                '気が弱く引っ込み思案だった主人公・月城いおり。\r\n初めて付き合った男に捨てられ、どん底に落とされたいおりは整形とダイエットで自分を変え、男の子の注目を浴びる大学生活を送ることを決心する。\r\n\r\n無事、希望大学に合格したいおりだが、見た目は変わっても中身は引っ込み思案で弱気なままの女の子。\r\n強気な性格になりたくてモテ本を頼りに悪戦苦闘の日々を送っていく。\r\n\r\nある日いおりは、女子学生憧れのイケメンが在籍するというサークル 『スリーS同好会』 に入部することができれば、ステータスを得ることができるという情報を入手する。\r\n顧問・奈木秀介が認めないと入部ができないという 『スリーS同好会』。\r\nこれまで数々の女子学生がメンバーを攻略するためチャレンジしたが、玉砕し続けてきたという伝説の入部試験を受けると、なぜかすんなり入部が許されてしまう。\r\n\r\nせっかく入部できた 『スリーS同好会』 の活動内容は、なぜか阿波踊りや戦隊モノのショーをするなど、首を傾げるようなものばかり。\r\nだが、次第に 『スリーS同好会』 には特殊能力を持ったメンバーが集まっていることが明らかになっていく。\r\n実は 『スリーS同好会』 の目的はタイムリープを実現するためのものだった。\r\n\r\nいおりには特殊能力があって、愛する人の悩みの原因となった時間に7日間だけ帰ることが出来るという。\r\n\r\n――整形なんてしなくても本当の愛や、幸せを掴むことができた？\r\n\r\nタイムリープを繰り返す中でいおりの中に葛藤が生まれ、次第に整形前に戻りたいと思うようになっていく。\r\n\r\n『スリーS同好会』 の顧問で、変人として有名な顧問・奈木秀介。\r\nその弟で、大学の学長であり神父の奈木颯也。\r\nお笑いタレントの鷺森逸馬、今売り出し中の俳優・乙坂辰男と、名門政治家の息子・一條院誉。\r\nそれぞれの個性的なキャラが絡み合って物語が織り成されていく。\r\n―――果たして、大学生活をエンジョイするために整形までした いおりは幸せになれるのだろうか？',
            makerJp: '美蕾（みらい）',
            imageUrlJp:
                'http://www.getchu.com/brandnew/671747/c671747package.jpg',
            additionalImages: [
                'http://www.getchu.com/brandnew/671747/c671747sample1.jpg',
                'http://www.getchu.com/brandnew/671747/c671747sample2.jpg',
            ],
        };

        return [super.test('get game data', fetchGameData, expectedGameData)];
    }
}

module.exports = GetchuStrategy;

function getGameMetadataJp(query) {
    try {
        let releaseDayText = query('#tooltip-day').text();
        let images = getImages(query);

        return removeUndefined({
            nameJp: query('#soft-title')
                .children()
                .remove()
                .end()
                .text()
                .trim(),
            releaseDate: releaseDayText
                ? moment(releaseDayText, 'YYYY/MM/DD').format()
                : undefined,
            descriptionJp: query('.tablebody')
                .text()
                .trim(),
            makerJp: query('.glance').text(),
            imageUrlJp: images.find(image => image.includes('package')),
            additionalImages: images.filter(image => image.includes('sample')),
        });
    } catch (e) {
        log.debug('Metadata parsing failure', e);
    }
}

function getImages(query) {
    return query('a.highslide')
        .filter(
            (i, e) =>
                query(e).attr('href') &&
                (query(e)
                    .attr('href')
                    .includes('sample') ||
                    query(e)
                        .attr('href')
                        .includes('package'))
        )
        .map((i, e) =>
            query(e)
                .attr('href')
                .startsWith('./')
                ? query(e)
                      .attr('href')
                      .replace('./', 'http://www.getchu.com/')
                : query(e)
                      .attr('href')
                      .replace('/', 'http://www.getchu.com/')
        )
        .get();
}

async function getJapaneseSite(id, missingSource) {
    if (missingSource) {
        return undefined;
    }
    try {
        let reply = await html.callPage(
            `http://www.getchu.com/soft.phtml?id=${encodeURIComponent(
                id
            )}&gc=gc`
        );
        if (reply.trim().length === 0) {
            // Getchu returns 200 with empty response when id is wrong
            return {
                sourceMissingJp: true,
            };
        }
        const root = parseSite(reply);
        return getGameMetadataJp(root);
    } catch (e) {
        log.debug(`Error getting ${id} from ${STRATEGY_NAME}`, e);
        return undefined;
    }
}

async function getReviews(id) {
    try {
        let reply = await html.callPage(
            `http://www.getchu.com/review/item_review.php?action=list&id=${encodeURIComponent(
                id
            )}`
        );
        const query = parseSite(reply);

        let averageRatingText = query('.r_ave').text();

        averageRatingText = averageRatingText ? averageRatingText : '0.00';

        return {
            communityStars: Number.parseFloat(
                averageRatingText.match(/\d\.\d\d/)[0]
            ),
        };
    } catch (e) {
        log.debug(`Error getting reviews for ${id} from ${STRATEGY_NAME}`);
        return undefined;
    }
}
