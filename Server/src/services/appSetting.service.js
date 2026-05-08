import AppSetting from '../models/AppSetting.js';
import { NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const appSettingService = {
  async get(key) {
    const setting = await AppSetting.findOne({ key }).lean();
    return setting ? setting.value : null;
  },

  async set(key, value, { description = '', group = 'general' } = {}) {
    return AppSetting.findOneAndUpdate(
      { key },
      { key, value, description, group },
      { upsert: true, new: true }
    );
  },

  async getAll(groupFilter) {
    const filter = groupFilter ? { group: groupFilter } : {};
    return AppSetting.find(filter).sort({ group: 1, key: 1 }).lean();
  },

  async getByGroup(group) {
    const settings = await AppSetting.find({ group }).lean();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    return map;
  },

  async delete(key) {
    const r = await AppSetting.findOneAndDelete({ key });
    if (!r) throw new NotFoundError('Setting not found');
    return { deleted: true };
  },

  async seedDefaults() {
    const defaults = [
      { key: 'call_cost_per_minute', value: 10, group: 'calls', description: 'Coins per minute of video call' },
      { key: 'free_call_cards_new_user', value: 3, group: 'calls', description: 'Free call cards for new users' },
      { key: 'min_coins_for_call', value: 20, group: 'calls', description: 'Minimum coins to start a call' },
      { key: 'coin_packages', value: [
        { coins: 100, price: 49, label: 'Starter' },
        { coins: 500, price: 199, label: 'Popular' },
        { coins: 1200, price: 399, label: 'Best Value' },
        { coins: 3000, price: 899, label: 'Premium' },
      ], group: 'coins', description: 'Coin purchase packages' },
      { key: 'app_name', value: 'LuxDate', group: 'branding', description: 'Application name' },
      { key: 'support_email', value: 'support@luxdate.app', group: 'general', description: 'Support email' },
    ];

    for (const d of defaults) {
      const exists = await AppSetting.findOne({ key: d.key });
      if (!exists) await AppSetting.create(d);
    }
    logger.info('Default app settings seeded');
  },
};

export default appSettingService;
