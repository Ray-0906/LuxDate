import GirlProfile from '../models/Girl.js';
import Gift from '../models/Gift.js';
import { DEFAULTS } from '../utils/constants.js';

/**
 * Feed service — discovery feed for mobile app users.
 */
const feedService = {
  /**
   * Get 18 random hot profiles (supports Region + Language filters)
   */
  async getHotFeed(query = {}) {
    const filter = { isActive: true };
    const { region, language } = query;

    if (region && region.toLowerCase() !== 'all') {
      filter.region = { $regex: region, $options: 'i' };
    }
    if (language && language.toLowerCase() !== 'all') {
      filter.language = { $regex: language, $options: 'i' };
    }

    const girls = await GirlProfile.aggregate([
      { $match: filter },
      { $sample: { size: DEFAULTS.HOT_FEED_SIZE } },
      {
        $project: {
          _id: 1, name: 1, age: 1, photos: 1, location: 1,
          region: 1, language: 1, charmLevel: 1,
        },
      },
    ]);

    return { girls };
  },

  /**
   * Get randomized nearby profiles with fake distance.
   */
  async getNearbyFeed(query = {}) {
    const filter = { isActive: true };

    const girls = await GirlProfile.aggregate([
      { $match: filter },
      { $sample: { size: DEFAULTS.NEARBY_FEED_SIZE } },
      {
        $project: {
          _id: 1, name: 1, age: 1, photos: 1, location: 1,
          region: 1, language: 1, charmLevel: 1, distanceKm: 1,
        },
      },
    ]);

    return { girls };
  },

  /**
   * Get detailed girl profile.
   */
  async getGirlProfile(girlId) {
    const girl = await GirlProfile.findById(girlId)
      .select('-createdByAdminId -__v')
      .lean();

    if (!girl) return null;
    if (!girl.gifts?.length) return girl;

    const giftIdsNeedingHydration = girl.gifts
      .filter((gift) => gift?.giftId && (!gift.giftName || (!gift.giftIconUrl && !gift.emojiFallback)))
      .map((gift) => gift.giftId);

    let hydratedById = new Map();
    if (giftIdsNeedingHydration.length) {
      const docs = await Gift.find({ _id: { $in: giftIdsNeedingHydration } })
        .select('name iconUrl emojiFallback level sortOrder')
        .lean();
      hydratedById = new Map(docs.map((doc) => [String(doc._id), doc]));
    }

    girl.gifts = girl.gifts
      .map((gift) => {
        const hydrated = hydratedById.get(String(gift.giftId)) || {};
        return {
          giftId: gift.giftId,
          giftName: gift.giftName || hydrated.name || '',
          giftIconUrl: gift.giftIconUrl || hydrated.iconUrl || '',
          emojiFallback: gift.emojiFallback || hydrated.emojiFallback || '',
          count: gift.count || 0,
          level: hydrated.level || 0,
          sortOrder: hydrated.sortOrder || 0,
        };
      })
      .sort((a, b) => (
        (b.count - a.count)
        || (a.level - b.level)
        || (a.sortOrder - b.sortOrder)
        || a.giftName.localeCompare(b.giftName)
      ));

    return girl;
  },

  /**
   * Get a single random girl profile for call trigger.
   */
  async getRandomProfile() {
    const [girl] = await GirlProfile.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 1 } },
    ]);
    return girl || null;
  },

  /**
   * Search girl by ID substring.
   */
  async searchById(idQuery) {
    if (!idQuery || idQuery.length < 4) return [];
    const girls = await GirlProfile.find({
      _id: { $regex: idQuery, $options: 'i' },
      isActive: true,
    })
      .select('name age photos location charmLevel')
      .limit(10)
      .lean();
    return girls;
  },
};

export default feedService;
