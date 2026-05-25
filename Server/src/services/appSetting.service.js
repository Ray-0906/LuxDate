import AppSetting from '../models/AppSetting.js';
import { NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const BRANDING_KEYS = new Set(['app_name', 'app_logo_url']);
const DEFAULT_APP_SETTINGS = {
  branding: {
    appName: 'LuxDate',
    appLogoUrl: '',
    revision: 1,
  },
  calls: {
    nonVipRate: 10,
    vipRate: 7,
  },
};

const appSettingService = {
  async get(key) {
    const setting = await AppSetting.findOne({ key }).lean();
    return setting ? setting.value : null;
  },

  async set(key, value, { description = '', group = 'general' } = {}) {
    const setting = await AppSetting.findOneAndUpdate(
      { key },
      { key, value, description, group },
      { upsert: true, new: true }
    );
    if (BRANDING_KEYS.has(key)) {
      await AppSetting.findOneAndUpdate(
        { key: 'app_branding_revision' },
        {
          key: 'app_branding_revision',
          value: Date.now(),
          description: 'Incremented whenever branding changes',
          group: 'branding',
        },
        { upsert: true, new: true }
      );
    }
    return setting;
  },

  async setMany(items = []) {
    const saved = [];
    for (const item of items) {
      const row = await this.set(item.key, item.value, {
        description: item.description,
        group: item.group,
      });
      saved.push(row);
    }
    return saved;
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
      { key: 'call_cost_per_minute_non_vip', value: 10, group: 'calls', description: 'Coins per minute of video call for non-VIP users' },
      { key: 'call_cost_per_minute_vip', value: 7, group: 'calls', description: 'Coins per minute of video call for VIP users' },
      { key: 'free_call_cards_new_user', value: 3, group: 'calls', description: 'Free call cards for new users' },
      { key: 'min_coins_for_call', value: 20, group: 'calls', description: 'Minimum coins to start a call' },
      { key: 'coin_packages', value: [
        { coins: 100, price: 49, label: 'Starter' },
        { coins: 500, price: 199, label: 'Popular' },
        { coins: 1200, price: 399, label: 'Best Value' },
        { coins: 3000, price: 899, label: 'Premium' },
      ], group: 'coins', description: 'Coin purchase packages (legacy JSON; prefer CoinPack model)' },
      { key: 'free_login_checkin_coins', value: 5, group: 'coins', description: 'Daily check-in reward for non-VIP users' },
      { key: 'app_name', value: 'LuxDate', group: 'branding', description: 'Application name' },
      { key: 'app_logo_url', value: '', group: 'branding', description: 'Remote application logo URL' },
      { key: 'app_branding_revision', value: 1, group: 'branding', description: 'Incremented whenever branding changes' },
      { key: 'support_email', value: 'support@luxdate.app', group: 'general', description: 'Support email' },
    ];

    for (const d of defaults) {
      const exists = await AppSetting.findOne({ key: d.key });
      if (!exists) await AppSetting.create(d);
    }
    logger.info('Default app settings seeded');
  },

  async getCallPricingSettings() {
    const [legacyRate, nonVipRate, vipRate, minCoinsForCall] = await Promise.all([
      this.get('call_cost_per_minute'),
      this.get('call_cost_per_minute_non_vip'),
      this.get('call_cost_per_minute_vip'),
      this.get('min_coins_for_call'),
    ]);

    const fallbackRate = Number(legacyRate ?? DEFAULT_APP_SETTINGS.calls.nonVipRate) || DEFAULT_APP_SETTINGS.calls.nonVipRate;

    return {
      nonVipRate: Number(nonVipRate ?? fallbackRate) || fallbackRate,
      vipRate: Number(vipRate ?? Math.max(1, fallbackRate - 3)) || Math.max(1, fallbackRate - 3),
      minCoinsForCall: Number(minCoinsForCall ?? 20) || 20,
    };
  },

  async getCallCostPerMinuteForUser(user = null) {
    const pricing = await this.getCallPricingSettings();
    return user?.isVip ? pricing.vipRate : pricing.nonVipRate;
  },

  async getPublicAppSettingsPayload() {
    const [appName, appLogoUrl, revision, pricing] = await Promise.all([
      this.get('app_name'),
      this.get('app_logo_url'),
      this.get('app_branding_revision'),
      this.getCallPricingSettings(),
    ]);

    return {
      branding: {
        appName: String(appName || DEFAULT_APP_SETTINGS.branding.appName),
        appLogoUrl: String(appLogoUrl || DEFAULT_APP_SETTINGS.branding.appLogoUrl),
        revision: Number(revision ?? DEFAULT_APP_SETTINGS.branding.revision) || DEFAULT_APP_SETTINGS.branding.revision,
      },
      calls: {
        nonVipRate: pricing.nonVipRate,
        vipRate: pricing.vipRate,
        minCoinsForCall: pricing.minCoinsForCall,
      },
    };
  },
};

export default appSettingService;
