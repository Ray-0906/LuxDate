import User from '../models/User.js';

const userService = {
  async getMe(userId) {
    return User.findById(userId)
      .select('-refreshToken -__v')
      .lean();
  },

  async updateProfile(userId, data) {
    const allowed = ['name', 'username', 'age', 'gender', 'location', 'profilePhotoUrl'];
    const update = {};
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key];
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true })
      .select('-refreshToken -__v')
      .lean();
    return user;
  },

  async uploadPhoto(userId, photoUrl) {
    return User.findByIdAndUpdate(userId, { profilePhotoUrl: photoUrl }, { new: true })
      .select('-refreshToken -__v')
      .lean();
  },

  async getWealthLevels() {
    // Return the thresholds for UI display
    return [
      { level: 0, label: 'Newcomer', minSpend: 0 },
      { level: 1, label: 'Bronze', minSpend: 100 },
      { level: 2, label: 'Silver', minSpend: 500 },
      { level: 3, label: 'Gold', minSpend: 1500 },
      { level: 4, label: 'Platinum', minSpend: 3000 },
      { level: 5, label: 'Diamond', minSpend: 5000 },
      { level: 6, label: 'Royal', minSpend: 8000 },
      { level: 7, label: 'Emperor', minSpend: 12000 },
      { level: 8, label: 'Legend', minSpend: 18000 },
      { level: 9, label: 'Mythic', minSpend: 25000 },
      { level: 10, label: 'Immortal', minSpend: 35000 },
      { level: 11, label: 'Titan', minSpend: 50000 },
      { level: 12, label: 'Celestial', minSpend: 70000 },
      { level: 13, label: 'Supreme', minSpend: 100000 },
      { level: 14, label: 'Eternal', minSpend: 150000 },
      { level: 15, label: 'Infinity', minSpend: 200000 },
    ];
  },
};

export default userService;
