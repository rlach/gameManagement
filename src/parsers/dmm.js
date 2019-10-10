const request = require('request-promise');
const { parseSite } = require('../util/html');
const vndb = require('../util/vndb');
const moment = require('moment');
const { removeUndefined } = require('../util/objects');
const log = require('../util/logger');
const SiteStrategy = require('./siteStrategy');

const DMM_ID_REGEX = new RegExp(/[a-z]+_[a-z]*\d+/gi);

class DmmStrategy extends SiteStrategy {
    constructor(settings) {
        super('dmm', settings);
    }

    async fetchGameData(gameId, game) {
        const sourceMissing = game ? game.sourceMissingJp : undefined;
        const jpn = await this.getSite(gameId, sourceMissing);
        let eng;

        if (jpn && jpn.nameJp) {
            log.debug(`Getting english site for ${jpn.nameJp}`);
            eng = await vndb.getVNByName(jpn.nameJp);
        }

        const result = {};
        Object.assign(result, removeUndefined(jpn));
        Object.assign(result, removeUndefined(eng));
        return result;
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(DMM_ID_REGEX);
        return matches ? matches[0] : '';
    }

    async findGame(name) {
        const results = await Promise.all([
            getDoujinResults(name),
            getProResults(name),
        ]);

        return [...results[0], ...results[1]];
    }

    async getAdditionalImages(id) {
        const site = await this.getSite(id);
        return site.additionalImages;
    }

    async getSite(id, sourceMissing) {
        if (sourceMissing) {
            return undefined;
        }
        let uri;
        let method;
        if (id.match(/d_\d+/)) {
            uri = `https://www.dmm.co.jp/dc/doujin/-/detail/=/cid=${id}/`;
            method = getDoujinMetadata;
        } else if (id.match(/d_[a-z]+\d+/)) {
            uri = `https://www.dmm.co.jp/mono/doujin/-/detail/=/cid=${id}/`;
            method = getMonoGameMetadata;
        } else {
            uri = `https://dlsoft.dmm.co.jp/detail/${id}/`;
            method = getProMetadata;
        }

        try {
            let reply = await request.get({
                method: 'GET',
                uri: uri,
            });
            return method(parseSite(reply));
        } catch (e) {
            log.debug(`Error getting ${id} from ${this.name}`, {
                name: e.name,
                statusCode: e.statusCode,
                message: e.message,
            });
            if (e.statusCode === 404) {
                return {
                    sourceMissingJp: true,
                };
            } else {
                return undefined;
            }
        }
    }

    shouldUse(gameId) {
        return !!gameId.match(/^[a-z]+_[a-z]*\d+$/gi);
    }

    /* istanbul ignore next */
    async selfTest() {
        const [
            fetchDoujinGameData,
            fetchMonoGameData,
            fetchProGameData,
        ] = await Promise.all([
            this.getSite('d_047261'),
            this.getSite('d_aisoft2638'),
            this.getSite('next_0219'),
        ]);

        const expectedDoujinGameData = {
            nameJp: '壊され姉妹',
            genresJp: [
                '辱め',
                '輪姦',
                '異物挿入',
                '近親相姦',
                '強姦',
                'アドベンチャー',
            ],
            imageUrlJp:
                'https://doujin-assets.dmm.co.jp/digital/game/d_047261/d_047261pr.jpg',
            additionalImages: [
                'https://doujin-assets.dmm.co.jp/digital/game/d_047261/d_047261jp-001.jpg',
                'https://doujin-assets.dmm.co.jp/digital/game/d_047261/d_047261jp-002.jpg',
                'https://doujin-assets.dmm.co.jp/digital/game/d_047261/d_047261jp-003.jpg',
            ],
            descriptionJp:
                '＊＊～ストーリー～＊＊\n\n\n突然の、母親の事故死。\n\nその日を境に、秋津川姉妹の運命は大きく変わる。\n\n\n\n「これからのオレの性欲処理は、当然娘のお前たちがすることになる。  \n  \n  お前らのどっちをオレの肉便器にするかだが…\n\n  それを、お前に決めさせてやる。」\n\n\n\n母の葬儀の晩に突きつけられた、義父からの理不尽な要求。\n姉のすみれは、葛藤の末に運命の選択をする。\n\n\nそれからの\n\n義父の欲望のままに犯される、恥辱の日々は始まりに過ぎず…\n\n\n様々な男たちとも複雑に絡み合い、\n\n\n壊れて、いく…。\n\n\n壊して…いく…。\n\n\n\n＊＊～概要～＊＊\n\n【システム・形式】\n・ライブメーカーで製作しました、画像サイズ:800×600  のオリジナル姉妹凌辱ドロドロAVGです。\n・選択次第で結末が変わる、マルチエンディング形式。  エンディング数:  全14種。\n\n【CG】\n・基本CG 44枚（内エッチCG:  31枚、ほか  13枚）。\n\n【立絵】\n・立ち絵  約400枚超。\n\n【閲覧】\n・CGモード搭載:  差分約1，100枚超の内、厳選した 426枚収録。\n・回想モード搭載:  Hシーン33個（回想モードでは分割し、56シーン収録）\n\n【CV】\n・女性フルボイス、淫語無修正。\n\n  「秋津川  すみれ」  CV:椎那  天\n  「秋津川  れんげ」  CV:貴坂  理緒\n  「藤代  きらら」    CV:大山  チロル\n\n\n※物語の流れ上、少々残虐な表現や排泄等の描写がございます。苦手な方は特にご注意下さい。\n※演出で画像を動かしているため、少々動作が重くなることがあります。体験版で必ずご確認下さい。',
            releaseDate: '2012-04-01T10:00:00+02:00',
            series: undefined,
            tagsJp: ['アドベンチャー(姉妹凌辱ドロドロAVG)'],
            makerJp: 'こんでんちゅ☆みるく',
            video: undefined,
            communityStars: 3.5,
            communityStarVotes: 2,
        };

        const expectedMonoGameData = {
            nameJp: 'えれめんつ！',
            genresJp: [
                'イラスト・CG集',
                'オリジナル',
                '辱め',
                '触手',
                '寝取り・寝取られ・NTR',
                'RPG',
                'フェラ',
                'アナル',
                '逆レイプ',
            ],
            imageUrlJp:
                'https://pics.dmm.co.jp/mono/doujin/d_aisoft2638/d_aisoft2638pl.jpg',
            additionalImages: [
                'https://pics.dmm.co.jp/mono/doujin/d_aisoft2638/d_aisoft2638js-001.jpg',
                'https://pics.dmm.co.jp/mono/doujin/d_aisoft2638/d_aisoft2638js-002.jpg',
                'https://pics.dmm.co.jp/mono/doujin/d_aisoft2638/d_aisoft2638js-003.jpg',
                'https://pics.dmm.co.jp/mono/doujin/d_aisoft2638/d_aisoft2638js-004.jpg',
            ],
            descriptionJp:
                '8人の精霊達の力を借りて島中を駆け巡れ！\nにばれらの第一弾は完全フリーシナリオRPG！\n\n外界から隔離された孤島・フェラメンツ。\nだがあと5日で沈没してしまうと告げられた。\nこの5日の間にどう過ごすのか？\n主人公は5日後の船で脱出する事が決まっているので、バッドエンドはありません。\nフリーシナリオなので強制イベントの類もありません。\nプレーによっては島を救う事も、街の人と一緒に島を出る事も。\n全てはプレイヤー次第。\n\n■敵は全て女の子の姿をした「どーぶつ」が全34匹\n■パートナーは個性的な8人の精霊達\n■街の住人4人とのロマンス\n\n基本CG 250枚（差分込 500枚以上）\nテキスト総数1MB以上（Hシーンのみ）\nHイベント総数100以上\nとにかくてんこ盛りの内容でお送りいたします。\n\n■■システム\n解説や能力の上がりやすいイージーモードの他にも\n常時ダッシュ、斜め移動、立ち絵オンオフ機能、メッセージログ、メッセージスキップ、\n音量調節、引き継ぎ、アルバムモードなどの機能も完備。\n基本的にこのゲームに「詰まる」といった要素はありません。\n\n\n■■全イベントCG集を同梱\nどのようなエンドでもいいので最後までプレーをするとパスワードが表示されます。\nそのパスワードを入力する事で、同梱のCG集を解凍する事ができます。\n\n■■■■■\n本作はライト感覚で楽しめますが、以下の要素が若干含まれておりますのでご注意ください。\n行動によっては回避も可能です。\n\n陵辱、触手、粘液、アナル、逆レイプ、寝取られ、産卵（今回はテキストのみです）\n\n対応OS\nWindows2000 / WindowsXP / WindowsVista / Windows7\n「コンビニ受取」対象商品です。詳しくはこちらをご覧ください。',
            releaseDate: '2012-11-16T00:00:00+01:00',
            series: undefined,
            tagsJp: [
                '漫画・アニメパロディ',
                'ゲームパロディ',
                'オリジナル',
                'パロディその他',
            ],
            makerJp: 'にばれら',
            communityStars: 5,
            communityStarVotes: 1,
        };

        const expectedProGameData = {
            nameJp: '［黒獣外伝］エルフ村の姦落 〜恥辱と快楽の宴〜',
            genresJp: [
                '催眠',
                '寝取られ（NTR）',
                '人妻',
                '3DCG',
                '鬼畜',
                '孕ませ',
                'シミュレーション',
                '痴漢',
                'アニメーション',
                '触手',
                'RPG',
                '学園もの',
                '巨乳',
                'セット商品',
            ],
            imageUrlJp:
                'https://pics.dmm.co.jp/digital/pcgame/next_0219/next_0219pl.jpg',
            additionalImages: [
                'https://pics.dmm.co.jp/digital/pcgame/next_0219/next_0219jp-001.jpg',
                'https://pics.dmm.co.jp/digital/pcgame/next_0219/next_0219jp-002.jpg',
                'https://pics.dmm.co.jp/digital/pcgame/next_0219/next_0219jp-003.jpg',
                'https://pics.dmm.co.jp/digital/pcgame/next_0219/next_0219jp-004.jpg',
            ],
            descriptionJp:
                'セレヌス大陸西方のエオス平原に「奉仕国家」が建国された時期――荒くれ傭兵団の団長である「モーガン」は、襲撃した村で極上の獲物に出会う。――領主の奥方であり、高貴なハイエルフ「アンナ」。――若き未亡人であり、稀少なダークエルフ「グレース」。モーガンは、 美しい人妻エルフを自分達の快楽奴隷にすることを決め、彼女達の大切なものを脅迫の材料にして、無理矢理従わせる。人妻エルフ達の毅然としながらも悲愴感あふれる表情に股間を熱くしながらその気高い体と心を恥辱と快楽にまみれさせるため、様々な方法を画策していくのであった。終わらない性の宴が今ここに始まる！王国蹂躙・奉仕強制AVG『 黒獣 』シリーズはこちら！！',
            releaseDate: '2016-10-28T00:00:00+02:00',
            series: '黒獣',
            tagsJp: ['人妻エルフ恥辱快感籠絡AVG'],
            makerJp: 'HERENCIA',
            communityStars: 4.33,
            communityStarVotes: 9,
        };

        return [
            super.test(
                'get doujin game data',
                fetchDoujinGameData,
                expectedDoujinGameData
            ),
            super.test(
                'get mono game data',
                fetchMonoGameData,
                expectedMonoGameData
            ),
            super.test(
                'get pro game data',
                fetchProGameData,
                expectedProGameData
            ),
        ];
    }
}

module.exports = DmmStrategy;

async function getDoujinResults(name) {
    const uri = `https://www.dmm.co.jp/search/=/searchstr=${encodeURIComponent(
        name
    )}/analyze=V1EBAFYOUQA_/limit=30/n1=FgRCTw9VBA4GAV5NWV8I/n2=Aw1fVhQKX1ZRAlhMUlo5Uw4QXF9e/sort=ranking/#hd-search-area`;
    log.debug('Uri called for search', uri);

    const reply = await request.get({
        method: 'GET',
        uri: uri,
    });

    const query = parseSite(reply);
    return query('.tileListTtl__txt a')
        .map((i, e) => {
            const matchedId = query(e)
                .attr('href')
                .match(DMM_ID_REGEX);
            return matchedId
                ? {
                      workno: matchedId[0],
                      work_name: query(e)
                          .text()
                          .trim(),
                  }
                : null;
        })
        .get()
        .filter(e => e !== null);
}

async function getProResults(name) {
    const uri = `https://www.dmm.co.jp/search/=/searchstr=${encodeURIComponent(
        name
    )}/analyze=V1EBAFYOUQA_/limit=30/n1=FgRCTw9VBA4GFVJfUlsD/n2=Aw1fVhQKX1ZRAlhMUlo5RwICV1tV/sort=ranking/#hd-search-area`;
    log.debug('Uri called for search', uri);

    const reply = await request.get({
        method: 'GET',
        uri: uri,
    });

    const query = parseSite(reply);
    return query('.d-sect .d-item #list .tmb a')
        .filter((i, e) =>
            query(e)
                .attr('href')
                .includes('ref=search')
        )
        .map((i, e) => {
            const matchedId = query(e)
                .attr('href')
                .match(DMM_ID_REGEX);
            return matchedId
                ? {
                      workno: matchedId[0],
                      work_name: query(e)
                          .find('img')
                          .attr('alt')
                          .trim(),
                  }
                : null;
        })
        .get()
        .filter(e => e !== null);
}

function getDoujinMetadata(query) {
    const images = query('.fn-colorbox')
        .map((i, e) => query(e).attr('href'))
        .get();
    const mainImage = images.splice(0, 1)[0];
    const informationList = getInformationList(query);

    return {
        nameJp: getTitle(query),
        genresJp: getGenres(query),
        imageUrlJp: mainImage,
        additionalImages: images,
        descriptionJp: query('.summary__txt')
            .text()
            .trim(),
        releaseDate: informationList['配信開始日']
            ? moment(informationList['配信開始日'], 'YYYY-MM-DD HH:mm').format()
            : undefined,
        series:
            informationList['シリーズ'] === '----'
                ? undefined
                : informationList['シリーズ'],
        tagsJp: informationList['ゲームジャンル']
            ? [informationList['ゲームジャンル']]
            : undefined,
        makerJp: getMaker(query),
        video: getVideo(query),
        communityStars: getCommunityStars(query),
        communityStarVotes: getCommunityVotes(query),
    };
}

function getMonoGameMetadata(query) {
    const releaseDateText = findTableValue(query, '発売日')
        .find('td')
        .last()
        .text();
    const seriesText = findTableValue(query, 'シリーズ')
        .find('td')
        .last()
        .text()
        .trim();

    return {
        nameJp: getTitle(query),
        genresJp: findTableValue(query, 'ジャンル')
            .find('a')
            .map((i, e) => query(e).text())
            .get(),
        imageUrlJp: query('a[name="package-image"]').attr('href'),
        additionalImages: query('a[name="sample-image"] img')
            .map((i, e) => query(e).attr('src'))
            .get(),
        descriptionJp: query('div.mg-b20.lh4 p.mg-b20')
            .text()
            .trim(),
        releaseDate: releaseDateText
            ? moment(releaseDateText, 'YYYY-MM-DD').format()
            : undefined,
        series: seriesText === '----' ? undefined : seriesText,
        tagsJp: query('.side-menu')
            .filter((i, e) =>
                query(e)
                    .find('p')
                    .text()
                    .includes('題材ジャンル')
            )
            .find('a')
            .map((i, e) =>
                query(e)
                    .text()
                    .trim()
            )
            .get(),
        makerJp: findTableValue(query, 'サークル名')
            .find('td')
            .last()
            .text()
            .trim(),
        communityStars: getCommunityStars(query),
        communityStarVotes: getCommunityVotes(query),
    };
}

function findTableValue(query, value) {
    return query('table.mg-b20 tr').filter((i, e) =>
        query(e)
            .find('td')
            .text()
            .includes(value)
    );
}

function getProMetadata(query) {
    const images = query('#item-rotationbnr img')
        .map((i, e) => query(e).attr('src'))
        .get();
    const softwareDetail = getSoftwareDetail(query);

    return {
        nameJp: getTitle(query),
        genresJp: query('table[summary="ジャンル"] a')
            .map((i, e) =>
                query(e)
                    .text()
                    .trim()
            )
            .get(),
        imageUrlJp: query('a[name="package-image"]').attr('href'),
        additionalImages: images,
        descriptionJp: query('.area-detail-read .text-overflow')
            .text()
            .trim(),
        releaseDate: softwareDetail['配信開始日']
            ? moment(softwareDetail['配信開始日'], 'YYYY-MM-DD').format()
            : undefined,
        series:
            softwareDetail['シリーズ'] === '----'
                ? undefined
                : softwareDetail['シリーズ'],
        tagsJp: softwareDetail['ゲームジャンル']
            ? [softwareDetail['ゲームジャンル']]
            : undefined,
        makerJp: query('.area-bskt a')
            .filter((i, e) =>
                query(e)
                    .attr('href')
                    .includes('article=maker')
            )
            .text()
            .trim(),
        communityStars: getCommunityStars(query),
        communityStarVotes: getCommunityVotes(query),
    };
}

function getSoftwareDetail(query) {
    const softwareDetail = {};
    query('.software-detail table')
        .not('.spec-table')
        .not('.tbl-bps')
        .find('tr')
        .each((i, e) => {
            const foundKey = query(e)
                .find('td')
                .first()
                .text()
                .replace('：', '')
                .trim();
            softwareDetail[foundKey] = query(e)
                .find('td')
                .last()
                .text()
                .trim();
        })
        .get();
    return softwareDetail;
}

function getInformationList(query) {
    const informationList = {};
    query('.informationList')
        .each((i, e) => {
            const foundKey = query(e)
                .find('.informationList__ttl')
                .text()
                .trim();
            const foundValue = query(e)
                .find('.informationList__txt')
                .text()
                .trim();
            if (foundKey && foundValue) {
                informationList[foundKey] = foundValue;
            }
        })
        .get();
    return informationList;
}

function getCommunityVotes(query) {
    try {
        return Number.parseInt(
            query('.d-review__evaluates strong')
                .text()
                .trim()
                .match(/\d+/)[0]
        );
    } catch (e) {
        log.debug('Could not get community star votes');
    }
}

function getCommunityStars(query) {
    try {
        return Number.parseFloat(
            query('.d-review__average strong')
                .text()
                .trim()
                .match(/(\d+(\.\d+)?)/)[0]
        );
    } catch (e) {
        log.debug('Could not get community stars');
    }
}

function getGenres(query) {
    return query('.genreTag__txt')
        .map((i, e) =>
            query(e)
                .text()
                .trim()
        )
        .get();
}

function getMaker(query) {
    return query('.circleName__txt')
        .text()
        .trim();
}

function getTitle(query) {
    try {
        return query('meta[property="og:title"]')
            .attr('content')
            .trim();
    } catch (e) {
        log.debug('Og:title meta property not found or wrong');
    }
}

function getVideo(query) {
    return query('.productPreview__item source').attr('src');
}
