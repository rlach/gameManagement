const vndb = require('../util/vndb');
const log = require('../util/logger');
const SiteStrategy = require('./siteStrategy');

const VNDB_ID_REGEX = new RegExp(/^v\d+$/gi);

class VndbStrategy extends SiteStrategy {
    constructor(settings) {
        super('vndb', settings);
    }

    async fetchGameData(gameId) {
        const vndbId = Number.parseInt(gameId.replace('v', ''));
        const result = await vndb.getVNById(vndbId);

        return result;
    }

    extractCode(name) {
        log.debug('Extracting code from name', { name });
        const matches = name.match(/v\d+/gi);
        return matches ? matches[0] : '';
    }

    async findGame(name) {
        return vndb.findVNsByName(name);
    }

    async getAdditionalImages(id) {
        const result = await this.fetchGameData(id);
        return result.additionalImages;
    }

    shouldUse(gameId) {
        return !!gameId.match(VNDB_ID_REGEX);
    }

    /* istanbul ignore next */
    async selfTest() {
        const fetchGameData = this.fetchGameData('1');

        const expectedGameData = {
            nameEn: 'Minna de Nyan Nyan',
            releaseDate: '2003-10-17T00:00:00+02:00',
            descriptionEn:
                'A young man named Ibuki is a college student living on his own in an apartment complex. He is also a real cat lover who can\'t resist taking care of any random kittens he ever comes across of. One night he got visited by a Cat God, who wanted to reward Ibuki for his kindness towards cats. Ibuki wasted no time in his reply: "I want a cat girl!" - he said. The Cat God immediately announced that his wish will be granted and then vanished, leaving Ibuki to wonder if it was all just a dream.\n\nSeveral days later, Ibuki is on his way home from work when he discovers that a cardboard box was left near his apartment. A meowing kind of sound could have been heard coming from the box which prompted Ibuki to open it up. Ibuki is shocked to see a beautiful naked cat girl sleeping inside. As she started waking up, she looked up at him and purred: "I\'ve come to serve you, for all the kindness you\'ve shown to my kind." The next thing he knows, his apartment is suddenly filled with all different types of animal girls, all eager to do whatever they can for him.\n\n[Edited from [url=https://www.jastusa.com/lets-meow-meow]JAST USA[/url]]',
            genresEn: [
                'Group Sex of One Male and Several Females',
                'Fingering',
                'Heroine with Pubic Hair',
                'Lactation During Sex',
                'Gaping',
                'Group Sex of One Female and Several Males',
                'High Sexual Content',
                'Cowgirl',
                'Blowjob',
                'Doggy Style',
                'Nukige',
                'Petplay',
                'Threesome',
                'Footjob',
                'Excessive Semen',
                'Wake-up Sex',
                'Quickie Fix Position',
                'Sex Under the Necessity',
                'Energy Transfer via Sex',
                'Early Sexual Content',
                'Shotacon',
                'Boobjob',
                'Sex in Classroom',
            ],
            tagsEn: [
                'Harem Ending with Theme',
                "Super Deformed CG's",
                'Bleep Censor',
                'Multiple Endings',
                'Naked Sprites',
                'Unlockable Harem Ending',
                'Hero(ine) Selection',
                'Only One Bad Ending',
                'No Opening Movie',
                'ADV',
                'Harem Ending',
            ],
            imageUrlEn: 'https://s2.vndb.org/cv/39/20339.jpg',
            additionalImages: [
                'https://s2.vndb.org/sf/07/5707.jpg',
                'https://s2.vndb.org/sf/08/5708.jpg',
                'https://s2.vndb.org/sf/09/5709.jpg',
                'https://s2.vndb.org/sf/10/5710.jpg',
                'https://s2.vndb.org/sf/11/5711.jpg',
                'https://s2.vndb.org/sf/12/5712.jpg',
                'https://s2.vndb.org/sf/13/5713.jpg',
                'https://s2.vndb.org/sf/14/5714.jpg',
                'https://s2.vndb.org/sf/15/5715.jpg',
                'https://s2.vndb.org/sf/16/5716.jpg',
            ],
            communityStarVotes: 616,
            communityStars: 2.875,
            nameJp: 'みんなでニャンニャン',
            makerEn: 'Yamikumo-Communications',
            makerJp: '闇雲通信',
        };

        return [super.test('get game data', fetchGameData, expectedGameData)];
    }
}

module.exports = VndbStrategy;
