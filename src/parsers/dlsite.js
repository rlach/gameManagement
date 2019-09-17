const request = require('request-promise');
const log = require('../util/logger');
const moment = require('moment');
const { parseSite } = require('../util/html');
const vndb = require('../util/vndb');
const SiteStrategy = require('./siteStrategy');
const { removeUndefined } = require('../util/objects');

const STRATEGY_NAME = 'dlsite';

class DlsiteStrategy extends SiteStrategy {
    constructor(settings) {
        super(STRATEGY_NAME, settings);

        this.scoreManager.addExtractedCodeRule(
            this.settings.organizeDirectories.scores.extractedDlsiteCode,
            code => code !== ''
        );
        this.scoreManager.addExtractedCodeRule(
            this.settings.organizeDirectories.scores
                .matchForExtractedDlsiteCode,
            (code, foundCodes) => foundCodes.some(fc => fc.workno === code)
        );
    }

    async fetchGameData(gameId, game) {
        log.debug(`Fetching game ${gameId} with strategy ${this.name}`);
        let jpn = {};
        let eng = {};
        if (gameId.startsWith('RJ')) {
            const sites = await Promise.all([
                getJapaneseSite(gameId, game.sourceMissingJp),
                getEnglishSite(gameId, game.sourceMissingEn),
            ]);
            jpn = sites[0] ? sites[0] : {};
            eng = sites[1] ? sites[1] : {};
        } else if (gameId.startsWith('RE')) {
            const engSite = await getEnglishSite(gameId, game.sourceMissingEn);
            eng = engSite ? engSite : {};
        } else if (gameId.startsWith('VJ')) {
            const jpnSite = await getProSite(gameId, game.sourceMissingJp);
            jpn = jpnSite ? jpnSite : {};
            if (jpn.nameJp) {
                eng = await vndb.getVNByName(jpn.nameJp);
                if (!eng) {
                    eng = {};
                }
                log.debug('Got eng', eng);
            }
        } else {
            log.debug('Wrong file for strategy', { name: this.name, gameId });
            return {};
        }

        let productInfo;
        if (eng.nameEn || jpn.nameJp) {
            productInfo = await getProductInfo(gameId);
        }

        const result = removeUndefined({
            communityStars: productInfo
                ? productInfo.rate_average_2dp
                : undefined,
            communityStarVotes: productInfo
                ? productInfo.rate_count
                : undefined,
        });
        Object.assign(result, removeUndefined(jpn));
        Object.assign(result, removeUndefined(eng));
        return result;
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(/((RE)|(RJ)|(VJ))\d+/gi);
        return matches ? matches.find(matched => matched.length === 8) : '';
    }

    async findGame(name) {
        const replies = await Promise.all([
            searchWithRetry(name, 'adult-jp'),
            searchWithRetry(name, 'adult-en'),
            searchWithRetry(name, 'pro'),
        ]);
        const works = [];
        replies.forEach(reply => works.push(...reply));
        return works;
    }

    async getAdditionalImages(id) {
        log.debug(`Getting additional images for ${id}`);
        try {
            let url = '';
            if (id.startsWith('RE')) {
                url = `https://www.dlsite.com/ecchi-eng/popup/=/file/smp1/product_id/${id}.html`;
            } else if (id.startsWith('VJ')) {
                url = `https://www.dlsite.com/pro/popup/=/file/smp1/product_id/${id}.html`;
            } else if (id.startsWith('RJ')) {
                url = `https://www.dlsite.com/maniax/popup/=/file/smp1/product_id/${id}.html`;
            } else {
                return undefined;
            }
            let reply = await request.get({
                method: 'GET',
                uri: url,
            });

            const query = parseSite(reply);

            if (id.startsWith('VJ')) {
                return query('.target_type')
                    .map((i, e) =>
                        query(e)
                            .attr('src')
                            .replace('//', 'http://')
                    )
                    .get();
            } else {
                const samplesCount = parseInt(
                    query('#page')
                        .text()
                        .replace('1/', '')
                        .trim()
                );
                const firstImage = query('.target_type')
                    .attr('src')
                    .replace('//', 'http://');

                const additionalImages = [];
                for (let i = 1; i <= samplesCount; i++) {
                    additionalImages.push(
                        firstImage.replace('smp1', `smp${i}`)
                    );
                }

                return additionalImages;
            }
        } catch (e) {
            log.debug(
                `Error getting additional images for ${id} from ${this.name}`,
                {
                    name: e.name,
                    statusCode: e.statusCode,
                    message: e.message,
                }
            );
            return undefined;
        }
    }

    shouldUse(gameId) {
        return (
            gameId.startsWith('RJ') ||
            gameId.startsWith('RE') ||
            gameId.startsWith('VJ')
        );
    }

    /* istanbul ignore next */
    async selfTest() {
        const [
            fetchJapaneseGameData,
            fetchEnglishGameData,
            fetchProGameData,
            getJapaneseAdditionalImages,
            getEnglishAdditionalImages,
            getProAdditionalImages,
        ] = await Promise.all([
            getJapaneseSite('RJ249908'),
            getEnglishSite('RE249908'),
            getProSite('VJ008300'),
            this.getAdditionalImages('RJ249908'),
            this.getAdditionalImages('RE249908'),
            this.getAdditionalImages('VJ008300'),
        ]);

        const expectedJapaneseGameData = {
            series: 'コスプレRPG',
            nameJp: '錬精術士コレットのHな搾精物語～精液を集める錬精術士～',
            descriptionJp:
                '現在のバージョンは【ver1.14】です。\r\n\r\n■あせろら5周年記念!\r\n　1ヶ月限定　30%OFF　セール実施します!\r\n　また、5周年記念としまして、『素敵なプレゼント企画』も実施中です!!\r\n　ページ下部に企画の詳細がございますのでぜひご覧ください!!\r\n\r\n※今回は音楽やドットも新規で制作しております!\r\n　よりスケベになったドットH等にご期待下さいませ!!',
            genresJp: ['道具/異物', '淫乱', '羞恥/恥辱', '輪姦', '異種姦'],
            tagsJp: [
                '18禁',
                'ロールプレイング',
                '音声あり',
                '音楽あり',
                'アプリケーション',
            ],
            releaseDate: '2019-07-04T00:00:00+02:00',
            makerJp: 'あせろら',
            imageUrlJp:
                'http://img.dlsite.jp/modpub/images2/work/doujin/RJ250000/RJ249908_img_main.jpg',
        };
        const expectedJapaneseAdditionalImages = [
            'http://img.dlsite.jp/modpub/images2/work/doujin/RJ250000/RJ249908_img_smp1.jpg',
            'http://img.dlsite.jp/modpub/images2/work/doujin/RJ250000/RJ249908_img_smp2.jpg',
            'http://img.dlsite.jp/modpub/images2/work/doujin/RJ250000/RJ249908_img_smp3.jpg',
        ];

        const expectedEnglishGameData = {
            series: 'Cosplay RPG',
            nameEn: 'Colette the Cum Collecting Alchemist',
            descriptionEn:
                '* ver1.14\r\n\r\n* Story\r\n\r\nDeep in the mountains lived two peaceful girls.\r\nOne was the mysterious girl, known as Priscilla the Alchemist,\r\nand her student who she had found and raised called Colette.\r\n\r\nPriscilla had invented her own form of alchemy that used cum,\r\nand had been living a lazy life while sharing her teachings with Colette.\r\n\r\nHowever, an unexpected visitor came by one day, \r\nand Priscilla had decided to leave the mountain.\r\n\r\nNow, Colette must finally live on her own.\r\n\r\nThough Colette had the skills to be a professional alchemist,\r\nshe still had some reservations about cum collecting.\r\n\r\nPriscilla decided to give one final lesson to help Colette, \r\nand Colette was able to experience her "first time".\r\n\r\nHaving made her first cum collection and success in alchemy, \r\nPriscilla was able to let Colette leave the nest and go off into \r\nthe world on her own.\r\n\r\nColette the Cum Collecting Alchemist-\r\nShe will go on a journey where she will make new connections,\r\nhelp those in need, and end up in various incidents.\r\n\r\nHer grand adventure begins!\r\n\r\n\r\n* System:\r\n- Alchemy\r\nBy combining materials and [cum], you can create new items!\r\nYou can use the cum that your comrades collect as well, so collect \r\nlots of cum and gather various materials!\r\n\r\n- Control up to 3 Characters!\r\nChoose characters from the guild and take them on your journey!\r\n\r\n- Hornyness level\r\nWhen the Hornyness amount is high, you can perform more intense \r\nsexual interactions. It increases as you use skills and get sexually harassed.\r\n\r\n- Lewdness level\r\nThis time the Lewdness has S & M amounts, that increases through sex.\r\nThe higher the amount, the more sexually promiscuous she becomes.\r\nWhen the Lewdness and Hornyness reach a certain point she...!?\r\nThen the S or M amount reaches a certain point she...!?\r\n\r\n- Karma level\r\nKarma goes up/down when she does good or bad things.\r\nIf she does good things, the meter doesn\'t increase, and sometimes goes down.\r\nHowever, if she does lots of bad things the meter increases and...!?\r\n\r\n- Pleading system\r\nThis system allows her to plead for cum! \r\nIt applies to the sub-characters as well, and use this command to collect\r\nlots and lots of cum!\r\n\r\n- Fetish system\r\nThe girls each have their preferred sexual activities. \r\nBy repeating a certain sex act, it can awaken a fetish within her and...!?\r\n\r\n- Mid-battle sex\r\nIf captured during battle, she will be violated. \r\nThough her health will decrease after being violated, she can also obtain cum.\r\nGoing out of your way to get violated and obtain cum is also a viable technique!\r\n\r\n- Approval system\r\nThe sub-character girls have an approval rating meter.\r\nThough hiring them costs money, when their approval rating reaches MAX,\r\nyou no longer have to pay to hire them.\r\n* In addition, when the approval rating increases...!?\r\n\r\n\r\n* We have created new pixel and music material for this work!\r\nEnjoy even more lewd pixel H!',
            genresEn: [
                'Foreign Objects',
                'Naughty/Lewd',
                'Shame/Humiliation',
                'Gangbang',
                'Interspecies Sex',
            ],
            tagsEn: ['X-rated', 'RPG', 'Inc. Voice', 'Inc. Music', 'EXE'],
            releaseDate: '2019-07-04T00:00:00+02:00',
            makerEn: 'acerola',
            imageUrlEn:
                'http://img.dlsite.jp/modpub/images2/work/doujin/RJ250000/RJ249908_img_main.jpg',
        };
        const expectedEnglishAdditionalImages = [
            'http://img.dlsite.jp/modpub/images2/work/doujin/RJ250000/RJ249908_img_smp1.jpg',
            'http://img.dlsite.jp/modpub/images2/work/doujin/RJ250000/RJ249908_img_smp2.jpg',
            'http://img.dlsite.jp/modpub/images2/work/doujin/RJ250000/RJ249908_img_smp3.jpg',
        ];

        const expectedProGameData = {
            series: '',
            nameJp: 'VenusBlood -GAIA-',
            descriptionJp:
                '■ストーリー\r\n遥かな太古から偉大な五神獣によって、繁栄の時代を謳歌していたパラストラ島。\r\nしかし、世界は数百年前より緩やかに荒廃する黄昏の時代を迎えていた。\r\n大地は渇き、海は干上がり、出生率は激減し、原因不明の病が発症し、\r\nさらには、異獣と呼ばれる異形の魔物が各地に蔓延りはじめている……。\r\n魔導都市エネルゲイアの大公テオフラッドは、新エネルギー『エーテル』による世界の救済を提唱するが、\r\nそれを邪法とし、滅ぼそうとする聖竜帝国グランレイドと激しく敵対するのだった―。\r\n\r\n■「VenusBlood-GAIA-」の新要素\r\n●主従ダブル調教\r\nこれまでのVBシリーズとは違う、新たな試み。\r\n神獣の巫女と、彼女と関係の深いキャラクターを、同時に調教していくことで、\r\nヒロインたちに、さらに深い背徳感と快楽を教え込む事が出来ます。\r\nHシーンの進め方、日常シーンの掛け合いが、これまでの1on1の会話から、\r\n主従＋主人公の3人会話の機会が増えることにより、賑やか度もアップ！\r\n\r\n●リーダーシステム\r\nリーダーを選ぶことで、戦闘に恩恵が！\r\n『リーダースキル』は、リーダーに選んだときしか発揮されない、強力なスキル。\r\n\r\n●リンクシステム\r\nリーダーに選んだユニットと絆が深い場合、パラメータがアップする、戦いの絆。\r\n母親から生まれた子供は、デフォルトで母親に対してリンク関係を保持しています。\r\n　（例：ミリアから生まれたファイアドラゴンは、ミリアがリーダーの時にパワーアップする。）\r\nまた、物語上関係性の深いキャラクター同士、リンク関係を結んでいます。\r\n　（例：ククルとエルミンの姉弟は、お互いにリンク関係を結んでいます。）\r\nさらに、物語の進行によってはヒロインと主人公は新たなリンク関係を結ぶことができます。\r\n　（例：キャルミラの好感度が高いと、主人公がリーダーの時にパワーアップする。）\r\n\r\n●レギオンバトル\r\n強大な力を持つ、神獣たちとの戦いは、鍛え上げた味方の精鋭3師団を同時に投入可能！\r\n最大で、神獣 VS 18体のユニットで繰り拡げられる大ボス戦、レギオンバトルを勝ち抜こう！\r\n\r\n●フェイスウィンドウ式を採用\r\n今作では、フェイスウィンドウを採用しました。\r\n背景に立ち絵が立たせられないようなシーンでも、\r\nフェイスが出ることによってキャラクター会話の臨場感がアップ！\r\nVBFから採用された、主人公陣営に最初からいる近衛ユニット。\r\n一般兵よりも有能でかつシナリオでもたまに喋る、忠実な味方。\r\nその近衛ユニットたちにフェイスがつきました！\r\n\r\n■登場キャラクター\r\n【魔導機公】\r\n●テオフラッド・ホーエンハイム（主人公）\r\n元学者にして、魔導都市エネルゲイアの大公でもある人物。\r\nエーテルによるパラストラの平和を実現しようとしている。\r\n魔族と人間の血が入り混じっており、やや魔族の血が濃い。\r\n明るく竹を割ったような性格で、市民にも人気がある。\r\nあまりウダウダと考え込まず、知識と直感と経験を信じて行動する。\r\n心臓にエーテルドライブを埋め込んでおり、その機構によって強大なエネルギーを操ることが出来る。\r\n触手などの変異生物を操る力は、その副産物ともいえる。\r\n銃器などのエーテル兵装による射撃戦闘を得意とするものの、\r\n本質はその卓越した戦略眼と深い知識に根ざした指揮能力にある。\r\n\r\n「俺が世界を変えてやる。方法はちょっとエキセントリックになるがな」\r\n\r\n【気高き聖竜騎士】\r\n●ミリア・エリファード　（CV：葵時緒）\r\nグランレイド帝国の最上級騎士である、聖竜騎士の称号を持つ少女。\r\n物事に対して常にベストな結果を求め、その為に全力で行動する。\r\n力なき人々を守るという誓いを胸に抱く、高潔ながらも心優しき騎士。\r\n過去、神獣の巫女を輩出したこともあるグランレイドの由緒ある家系の出自。\r\n竜の巫女と聖竜騎士の二つの重い使命を背負っているが、 \r\nその重圧に負けず、物事を悲観的に捉えない前向きな性格。 \r\n天才剣士と呼ばれているが、才能以上に努力を積み重ねてきたタイプ。\r\n学術機関『数秘院』に所属していた頃のテオフラッドを知る数少ない人物でもある。\r\n\r\n「私は、弱き人々を守る騎士になる！これ以上、目の前で大切なものをなくしたくないから！」\r\n\r\n【麗しき緑の守護者】\r\n●ククル・カナン　（CV：御苑生メイ）\r\n森林国家ディアヘルムを守るエルフの槍使い。\r\n森を愛し、自然を愛し、そこに住む人々や動物のために戦う自身の役目に誇りを持っている。\r\nその育ちゆえかエネルゲイアの機械文明を過度に危険視しており、視野狭窄の向きがないでもない。\r\nそれを除けばとても心優しい性格で、弟のエルミンをことの外大事にしている。\r\nその溺愛ぶりには、間違いなくブラコンの気が入っているとか。 \r\n\r\n「エーテル？機械？目先の便利さを求めても、堕落するだけ。……別に、興味なんてない」\r\n\r\n【心優しき射手】\r\n●エルミン・カナン　（CV：手塚りょうこ）\r\nククルの弟であり、極めて異例ながら、男でありつつも\r\n神獣の巫女の血統としての高い資質も持っている稀有な存在。\r\n外の世界とは隔絶された環境で育ったためか、穢れを知らない純粋な心根を持ち、\r\nククルのことを実の姉以上に慕っている。\r\nどことなく、女性のような顔立ちと雰囲気を持っているため、\r\nややもすれば可憐というような印象を相手に与えてしまう。\r\n\r\n「ボクだってディアヘルムの戦士だ！森を守る為に戦うよ！」\r\n\r\n【無垢なる祈り手】\r\n●清明院 トモエ　（CV：三十三七）\r\n高天原のシャーマンの中でも随一の素養を持つ少女。\r\n神獣タマモを降霊できるたった一人の存在である。\r\nタマモとはひとつの身体を共有する関係。\r\n朝廷には神獣の巫女としてまつりあげられており、\r\n当初は大人達の指図に従順に従うだけの気弱な少女だったが、\r\nタマモにその体を貸し、言葉を交す内に次第に自分の意志も出来てきた。\r\n守護神獣の威光を振りかざす朝廷のやり方には、微かな違和感を持っている。\r\n\r\n「みんな、頑張ろうね！わたしがついてるから！」\r\n\r\n【忠義の女侍】\r\n●麻鳥 シグレ　（CV：ももぞの薫）\r\n高天原の巫女、トモエの側仕えであり、護衛を兼ねる女性。\r\n忠義に生きる凛々しき女侍。\r\nトモエが朝廷内で心を許す数少ない人物で、シグレもまた主の為なら命を捧げる覚悟でいる。\r\n武装は、斬魔刀と小太刀を利用した二刀流。\r\n鬼人種の怪力を発揮し、通常の種族では実現不可能な剣技を駆使する。 \r\n\r\n「拙者の剣にて、邪智暴虐の輩を斬るッ！」\r\n\r\n【知恵と調和の金狐】\r\n●タマモ　（CV：渋谷ひめ）\r\n巫女トモエに宿る神獣タマモの意識が前面に出ている状態。\r\n限定的だが、神獣の力を行使することができ、高い潜在能力を秘めている。\r\nここまで神獣と意識をリンクして、力を引き出せるのは、歴代の巫女の中でもトモエが初めてだという。\r\nタマモ自身は明るくひょうきんな性格で、彼女をばっちゃと呼ぶトモエと\r\n本当の祖母と孫のような関係を築いている。\r\n\r\n「ウチこそ傾界九尾タマモじゃ！神獣の力に恐れおののくがよいぞ！」\r\n\r\n【黄金の海の海賊姫】\r\n●メアリー・ドレーク　（CV：柚木サチ）\r\nパラストラ東部に位置する群島国家フォートラフス公認の私掠船団ゴールデンハインドの頭領。\r\n実質的にフォートラフスの海域を牛耳っている大海賊。\r\n彼女自身は、気さくで、明朗快活な女性。\r\nそれでいて戦闘においては、斧による男以上の豪快な戦いっぷりから、\r\n海賊船のクルーからも頼りにされ、信頼されている。\r\n海の男たちの荒事や、キナ臭い取引などの、いわゆる裏稼業特有の場にも慣れている。\r\n\r\n「また会おう、この広い海のどこかで……ね」\r\n\r\n【お調子者の商人】\r\n●ルクレツィア　（CV：藤堂みさき）\r\n物語の序盤で魔導都市の噂を聞きつけて、エネルゲイアにやってくる商人。\r\nフェザー商会というキャラバンを運営しており、各国の世情に詳しい。\r\nお調子者で日和見なところがあるものの、商人としての才覚はなかなかのもので、\r\n日夜商売に明け暮れている。 \r\n直接的な戦いはあまり得意ではないが、自らの竪琴演奏による魔法の歌で味方を支援する事が出来る。\r\n座右の銘は、『沈黙は金、雄弁は銀』とか。\r\n\r\n「沈黙は金、雄弁は銀なり～、ですぅ♪くっふっふ～、新商品、今なら2割引きです～！」\r\n\r\n【吸血公女】\r\n●キャルミラ・ド・アルハザード十三世　（CV：桃也みなみ）\r\n常時上空を闇の霧が覆う、永遠なる夜の国アルハザードを治める当主にして神獣の巫女。\r\n吸血鬼の真祖であり、アルハザードに棲む夜の眷属の頂点に位置する。\r\nどんな状況でも優雅に振る舞う事を良しとしており、人前で弱みは絶対に見せない。 \r\nアイドル的なカリスマを持っており、芸術や魔術を奨励する内政の手腕も高く、\r\n彼女の力と美貌に惚れ込んでいる者は数多い。\r\n元来アルハザード公国自体が他国に対して閉鎖的なため、長らくその文化と国の内情は秘密となっている。\r\n\r\n「お～っほっほっほ！何事もエレガントに、ですわ！」\r\n\r\n【永遠なる従者】\r\n●ヴァニラ　（CV：青井美海）\r\nキャルミラお付きの侍女長。\r\nアルハザード領主の屋敷の一切を取り仕切る万能メイド。\r\n魔法の指輪を依り代にしてキャルミラに召喚され、主従の契約をしているゴーストに近しい存在。\r\nキャルミラの幸せを常に願い、キャルミラが喜ぶためなら一切の手間と労力を惜しまない。\r\nキャルミラのあるところ、どこにでも現れて世話をする。\r\n\r\n「不肖ながら、このヴァニラが誠心誠意、ご奉仕させて頂きます」\r\n\r\n【悪魔秘書】\r\n●レイン・ジーデルン　（CV：ヒマリ）\r\n魔導都市エネルゲイアで大公テオフラッドつきの秘書をしている夢魔。\r\n常に革新的な考えを求めており、その点においてテオフラッドには全幅の信頼を寄せている。\r\n公務においては大公の業務のサポート、戦場ではテオフラッドの援護や戦術補佐が主な職務。\r\n夢魔特有の抜群スタイルを持ち、特に腰から脚にかけてのラインは、\r\n数多の男をトリコにする魔性の艶めかしさを持つ。\r\n淫欲を好む種族であり、彼女も例に漏れず、テオフラッドとは夜の営みを存分に愉しむ間柄。\r\n\r\n「野望を持って、貪欲に生きましょ。枯れた人生なんて、つまらないだけよ？」\r\n\r\n【おとぼけ機人警護兵】\r\n●ララ　（CV：咲ゆたか）\r\nエーテルドライブを原動力にして動く機人（エンブリオ）。\r\n護衛兵としての役割を務め、テオフラッドの様々なサポートを行う。\r\n本人の性格は忠実だが、生まれたばかりなのでやや世間知らず。\r\n試作品のため燃費効率が悪く、エネルギー切れを防ぐために、よくファジー睡眠モードが発動する。\r\nエーテル補給ドリンクが手放せない。\r\nエンブリオの特徴として、感情の起伏は少なめで笑顔などはほとんど浮かべないが、\r\n嫌な時はうへぇーっというような感じで露骨に表情に出す。\r\n\r\n「エーテル残量、枯渇。マスター、補給の要請を……ZZZ」\r\n\r\n【竜の女帝】\r\n●エステリア・バハムート　（CV：榊木春乃）\r\n強大な神力をその身に宿す、グランレイド帝国の女帝。\r\nその実態は竜帝国を守護する神獣『天轟聖竜』そのものであり、\r\n他国の神獣とは違い人の姿に化身して、自らグランレイドの統治をおこなっている。\r\n神獣そのものながら、人の身になる事で民衆の支持を得ている事もあってか、\r\n民には女神のごとく崇められている。\r\n性格は、厳格にして冷酷冷徹。\r\nその身に宿す神力も、到底人の及ばぬ領域に達している。\r\n\r\n「恐ろしきはエーテル。厭うべきはエーテル。あの忌まわしき力の存在を許してはなりません」\r\n\r\n【誅戮の炎騎士】\r\n●アーシュ・ハロス　（CV：梅椿鬼）\r\nグランレイド帝国・聖竜騎士団の大将軍。\r\nミリアの上官でもあり、帝国への忠誠心の塊のような人物。\r\n帝国の敵となる者や、異端とされる者たちには一切の容赦をせず、味方にも恐れられるほど。\r\n徹底して帝国の正義を貫こうとするその姿は、ときとして敵には悪魔のごとく映る。\r\nかつて敗れ、幸運にも生き残った僅かな者達は、例外なく彼女を恐れ、\r\n邪悪なる正義、断罪の魔女など、様々な名で呼ぶ。\r\nミリアとは、騎士のあり方に対して根本的に考え方が違う。\r\n\r\n「ふふふ、さぁ、行きなさい。聖竜の御名のもと、穢れし邪法の使徒に誅戮を」\r\n\r\n【小さき太陽の少女】\r\n●ティティ　（CV：沢代りず）\r\nテオフラッドと共に暮らす、病弱な少女。\r\nちょっと人見知りなところがあるものの、いたって普通の女の子。\r\nテオフラッドの娘であり、守るべき対象でもある。\r\n他人を思いやる純粋無垢な心を持ち、無邪気で明るく振舞うその姿に、\r\n魔導都市の面々は、一様に和み、心を癒されている。\r\nある意味マスコット的な立場にもあり、みんなの人気者。\r\nその姿は、小さな太陽を思わせ、人々に生きる希望を与える。\r\n彼女は、その体に魔導都市に関わる重大な秘密を秘めているのだが……。\r\n\r\n「ケーキつくったの。テオ、みんなと一緒に食べよう！」\r\n\r\n【仮面の悪魔】\r\n●ベリオス・メギストス　（CV：笹崎こじろう）\r\n度々、テオフラッドたち魔導都市の軍勢と敵対することになる仮面をつけた謎の人物。\r\n魔導都市と同じくエーテル技術を使いこなし、機人兵だけでなく、\r\n制御不能といわれた異獣すらも利用して、エネルゲイアに攻撃を仕掛けてくる。\r\n世界を憎み、人を憎み、全てを憎む、破壊の権化。\r\n果たしてその正体は……？\r\n\r\n「ククク！ああ、いい……！最高の気分だ！エーテルの力は暴力に使われた時がその力を最大限に発揮する！」\r\n\r\n【殺戮人形】\r\n●ルル　（CV：MAIKO）\r\nベリオスに忠実な近衛兵で最新鋭エーテルドライブを搭載した高機能エンブリオ。\r\n無口で忠実。命令を実行するのに感情を動かさないキリングマシーン。\r\nエネルゲイア側の動力不安定なララとは違い、完全な動力での稼働を可能としている。\r\n\r\n「オマエが生き残るに相応しいか、審判を下してやろう」\r\n\r\n●謎の少女\r\n全てが謎に包まれた少女。\r\nパラストラの歴史に深く関わりがあるようだが……。\r\n\r\n「おじさま、どんな野望をその胸に秘めているのですか？」',
            genresJp: [
                '道具/異物',
                'ロリ',
                '女王様/お姫様',
                'ファンタジー',
                '妊娠/孕ませ',
                '産卵',
                '陵辱',
                '調教',
                '触手',
                '異種姦',
                '処女',
            ],
            tagsJp: ['18禁', 'シミュレーション', '音声あり', '音楽あり'],
            releaseDate: '2014-02-21T00:00:00+01:00',
            makerJp: 'ninetail/dualtail',
            imageUrlJp:
                'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_main.jpg',
        };
        const expectedProAdditionalImages = [
            'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_smpa1.jpg',
            'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_smpa2.jpg',
            'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_smpa3.jpg',
            'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_smpa4.jpg',
            'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_smpa5.jpg',
            'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_smpa6.jpg',
            'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_smpa7.jpg',
            'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_smpa8.jpg',
            'http://img.dlsite.jp/modpub/images2/work/professional/VJ009000/VJ008300_img_smpa9.jpg',
        ];

        return [
            super.test(
                'get japanese game data',
                fetchJapaneseGameData,
                expectedJapaneseGameData
            ),
            super.test(
                'get english game data',
                fetchEnglishGameData,
                expectedEnglishGameData
            ),
            super.test(
                'get pro game data',
                fetchProGameData,
                expectedProGameData
            ),
            super.test(
                'get japanese additional images',
                getJapaneseAdditionalImages,
                expectedJapaneseAdditionalImages
            ),
            super.test(
                'get english additional images',
                getEnglishAdditionalImages,
                expectedEnglishAdditionalImages
            ),
            super.test(
                'get pro additional images',
                getProAdditionalImages,
                expectedProAdditionalImages
            ),
        ];
    }
}

module.exports = DlsiteStrategy;

async function searchWithRetry(name, site) {
    const reply = await search(name, site);

    if (reply.work.length === 0) {
        const reply2 = await search(name.substring(0, name.length / 2), site);
        return reply2.work;
    } else {
        return reply.work;
    }
}

async function search(name, site) {
    return JSON.parse(
        await request.get({
            uri: `https://www.dlsite.com/suggest/?site=${site}&time=${new Date().getTime()}&term=${encodeURIComponent(
                name
            )}`,
        })
    );
}

function getOptions(id, type) {
    let dlsiteDomain;
    switch (type) {
        case 'en':
            dlsiteDomain = '/ecchi-eng/work/';
            break;
        case 'proAnnounce':
            dlsiteDomain = '/pro/announce/';
            break;
        case 'pro':
            dlsiteDomain = '/pro/work/';
            break;
        case 'jp':
        default:
            dlsiteDomain = '/maniax/work/';
    }

    return {
        method: 'GET',
        uri: `https://www.dlsite.com${dlsiteDomain}=/product_id/${encodeURIComponent(
            id
        )}.html`,
    };
}

function getGameMetadata(query) {
    try {
        let imageSrc = query('.slider_item img')
            .attr('src')
            .replace('//', 'http://');

        let releaseDateMoment;
        let releaseDate;
        const dateText = query('#work_outline a')
            .filter(
                (i, e) =>
                    query(e).attr('href') &&
                    query(e)
                        .attr('href')
                        .includes('/year')
            )
            .text()
            .trim();
        if (/\d/.test(dateText[0])) {
            releaseDateMoment = moment(dateText, 'YYYY-MM-DD-'); //Japanese format
        } else {
            releaseDateMoment = moment(dateText, 'MMM-DD-YYYY'); //English format
        }
        log.debug('releaseDate', releaseDateMoment);
        if (releaseDateMoment.isValid()) {
            releaseDate = releaseDateMoment.format();
        }

        let seriesText;
        try {
            seriesText = query('#work_outline a')
                .filter((i, e) =>
                    query(e).attr('href')
                        ? query(e)
                              .attr('href')
                              .includes('work.series')
                        : false
                )
                .text()
                .trim();
        } catch (e) {
            log.debug('Series text missing or invalid');
        }

        let genres;
        try {
            genres = query('.main_genre a')
                .map((i, e) =>
                    query(e)
                        .text()
                        .trim()
                )
                .get();
        } catch (e) {
            log.debug('Could not get genres');
        }

        const description = query('div[itemprop="description"]')
            .text()
            .trim();
        const tags = query('.work_genre span')
            .map((i, e) => query(e).attr('title'))
            .get();

        const workName = query('#work_name a')
            .text()
            .trim();
        const maker = query('.maker_name a')
            .text()
            .trim();

        return {
            series: seriesText,
            name: workName,
            description: description,
            genres: genres,
            tags: tags,
            releaseDate: releaseDate,
            maker: maker,
            image: imageSrc,
        };
    } catch (e) {
        log.debug('Metadata parsing failure', e);
    }
}

async function getEnglishSite(id, sourceMissing) {
    if (sourceMissing) {
        return undefined;
    }

    const idEn = id.replace('RJ', 'RE');

    try {
        const reply = await request.get(getOptions(idEn, 'en'));
        const root = parseSite(reply);
        const originalMetadata = getGameMetadata(root, id);
        return {
            series: originalMetadata.series,
            nameEn: originalMetadata.name,
            descriptionEn: originalMetadata.description,
            genresEn: originalMetadata.genres,
            tagsEn: originalMetadata.tags,
            releaseDate: originalMetadata.releaseDate,
            makerEn: originalMetadata.maker,
            imageUrlEn: originalMetadata.image,
        };
    } catch (e) {
        log.debug(`Error getting ${idEn} from ${STRATEGY_NAME}`, {
            name: e.name,
            statusCode: e.statusCode,
            message: e.message,
        });
        if (e.statusCode === 404) {
            return {
                sourceMissingEn: true,
            };
        } else {
            return undefined;
        }
    }
}

async function getProductInfo(id) {
    try {
        return JSON.parse(
            await request.get({
                method: 'GET',
                uri: `https://www.dlsite.com/maniax/product/info/ajax?product_id=${id}`,
            })
        )[id];
    } catch (e) {
        log.debug(`Error getting productInfo for ${id} from ${this.name}`, {
            name: e.name,
            statusCode: e.statusCode,
            message: e.message,
        });
        return undefined;
    }
}

async function getJapaneseSite(id, sourceMissing) {
    if (sourceMissing) {
        return undefined;
    }
    try {
        let reply = await request.get(getOptions(id, 'jp'));
        const root = parseSite(reply);
        const originalMetadata = getGameMetadata(root, id);
        return {
            series: originalMetadata.series,
            nameJp: originalMetadata.name,
            descriptionJp: originalMetadata.description,
            genresJp: originalMetadata.genres,
            tagsJp: originalMetadata.tags,
            releaseDate: originalMetadata.releaseDate,
            makerJp: originalMetadata.maker,
            imageUrlJp: originalMetadata.image,
        };
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

async function getProSite(id, sourceMissing) {
    if (sourceMissing) {
        return undefined;
    }
    try {
        let reply;
        try {
            reply = await request.get(getOptions(id, 'pro'));
        } catch (e) {
            if (e.statusCode === 404) {
                log.debug('Pro does not exist, trying announce', { id });
                reply = await request.get(getOptions(id, 'proAnnounce'));
            } else {
                throw e;
            }
        }
        const root = parseSite(reply);
        const originalMetadata = getGameMetadata(root, id);
        return {
            series: originalMetadata.series,
            nameJp: originalMetadata.name,
            descriptionJp: originalMetadata.description,
            genresJp: originalMetadata.genres,
            tagsJp: originalMetadata.tags,
            releaseDate: originalMetadata.releaseDate,
            makerJp: originalMetadata.maker,
            imageUrlJp: originalMetadata.image,
        };
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
