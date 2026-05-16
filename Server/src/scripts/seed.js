/**
 * Seed Script - Populates AutoReplyPool, GirlProfiles, Gifts, and VipPlans.
 * Run: node src/scripts/seed.js
 */
import mongoose from 'mongoose';
import env from '../config/env.js';
import AutoReplyPool from '../models/AutoReplyPool.js';
import GirlProfile from '../models/Girl.js';
import Gift from '../models/Gift.js';
import VipPlan from '../models/VipPlan.js';
import { VIP_TYPES } from '../utils/constants.js';
import { computeVipCoinSplit } from '../utils/vipDistribution.js';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || env.mongoUri);
  console.log('Connected to MongoDB');

  const replyPools = [
    {
      language: 'en',
      category: 'greeting',
      messages: [
        'Hey! How are you?',
        'Hi there handsome',
        'Hello! You look amazing!',
        'Hey, I was waiting for you',
        'Love your profile',
      ],
    },
    {
      language: 'en',
      category: 'flirty',
      messages: [
        'You make me smile',
        'I cannot stop thinking about you',
        'Wish you were here right now',
        'You are so sweet!',
        'Are you always this charming?',
      ],
    },
    {
      language: 'en',
      category: 'generic',
      messages: [
        'What are you doing right now?',
        'Tell me something about yourself!',
        'What is your favorite thing to do?',
        'I am bored, entertain me',
        'Do you like movies?',
      ],
    },
    {
      language: 'hi',
      category: 'greeting',
      messages: [
        'Hey! Kaise ho?',
        'Hi handsome',
        'Hello ji! Kaisa chal raha hai?',
        'Main tumhara wait kar rahi thi',
        'Tumhara profile bahut accha hai',
      ],
    },
    {
      language: 'hi',
      category: 'flirty',
      messages: [
        'Tum mujhe bohot pasand ho',
        'Main tumhare baare mein soch rahi thi',
        'Kaash tum yahan hote',
        'Tum bohot sweet ho',
        'Tumse baat karke bohot accha lagta hai',
      ],
    },
    {
      language: 'en',
      category: 'gift_reaction',
      messages: [
        'Omg a {gift}!! You are so sweet',
        'Aww thank you so much for the {gift}!',
        'You made my day with that {gift}',
      ],
    },
    {
      language: 'hi',
      category: 'gift_reaction',
      messages: [
        'Aww {gift} ke liye thank youuu',
        'Tumne mujhe {gift} diya? So sweet',
        '{gift} bohot pyara hai, thank you jaan',
      ],
    },
  ];

  for (const pool of replyPools) {
    await AutoReplyPool.findOneAndUpdate(
      { language: pool.language, category: pool.category },
      pool,
      { upsert: true, new: true }
    );
  }
  console.log(`Seeded ${replyPools.length} auto-reply pools`);

  const seedAdminId = new mongoose.Types.ObjectId();
  const girls = [
    { name: 'Priya Sharma', age: 23, bio: 'Love dancing and exploring new places', location: 'Mumbai', language: 'Hindi', charmLevel: 'Hot', distanceKm: 2.5, photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hey cutie! Mujhe tumse baat karni hai' }] },
    { name: 'Ananya Patel', age: 21, bio: 'Photography enthusiast and coffee lover', location: 'Delhi', language: 'English', charmLevel: 'Rising', distanceKm: 5.1, photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hi! I love your vibe' }] },
    { name: 'Sneha Reddy', age: 24, bio: 'Fitness freak and yoga practitioner', location: 'Bangalore', language: 'English', charmLevel: 'Hot', distanceKm: 3.8, photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hey there! You caught my eye' }] },
    { name: 'Riya Singh', age: 22, bio: 'Foodie, traveler, Netflix addict', location: 'Jaipur', language: 'Hindi', charmLevel: 'Goddess', distanceKm: 1.2, photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hiii! Tumse milke bohot khushi hogi' }] },
    { name: 'Kavya Nair', age: 25, bio: 'Music is my therapy', location: 'Chennai', language: 'English', charmLevel: 'Rising', distanceKm: 7.3, photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hey! Your smile is so cute' }] },
  ];

  for (const girl of girls) {
    await GirlProfile.findOneAndUpdate(
      { name: girl.name },
      { ...girl, createdByAdminId: seedAdminId, isActive: true },
      { upsert: true, new: true, runValidators: true }
    );
  }
  console.log(`Seeded ${girls.length} girl profiles`);

  const gifts = [
    { name: 'Rose', emojiFallback: '🌹', iconUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=256', animationUrl: '', coinCost: 10, level: 1, sortOrder: 1 },
    { name: 'Chocolate', emojiFallback: '🍫', iconUrl: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=256', animationUrl: '', coinCost: 20, level: 1, sortOrder: 2 },
    { name: 'Teddy Bear', emojiFallback: '🧸', iconUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=256', animationUrl: '', coinCost: 50, level: 1, sortOrder: 3 },
    { name: 'Perfume', emojiFallback: '🧴', iconUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=256', animationUrl: '', coinCost: 100, level: 2, sortOrder: 4 },
    { name: 'Diamond Ring', emojiFallback: '💍', iconUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=256', animationUrl: '', coinCost: 500, level: 3, sortOrder: 5 },
    { name: 'Sports Car', emojiFallback: '🏎️', iconUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=256', animationUrl: '', coinCost: 2000, level: 3, sortOrder: 6 },
    { name: 'Mansion', emojiFallback: '🏰', iconUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=256', animationUrl: '', coinCost: 5000, level: 3, sortOrder: 7 },
    { name: 'Private Jet', emojiFallback: '✈️', iconUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=256', animationUrl: '', coinCost: 10000, level: 3, sortOrder: 8 },
    { name: 'Crown', emojiFallback: '👑', iconUrl: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=256', animationUrl: '', coinCost: 50000, level: 3, sortOrder: 9 },
    { name: 'Universe', emojiFallback: '🌌', iconUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=256', animationUrl: '', coinCost: 100000, level: 3, sortOrder: 10 },
  ];

  for (const gift of gifts) {
    await Gift.findOneAndUpdate(
      { name: gift.name },
      gift,
      { upsert: true, new: true, runValidators: true }
    );
  }
  console.log(`Seeded ${gifts.length} gifts`);

  const weekly = computeVipCoinSplit(800, 7);
  const monthly = computeVipCoinSplit(4500, 30);
  const elite = computeVipCoinSplit(9000, 30);

  const plans = [
    {
      name: 'Weekly VIP',
      type: VIP_TYPES.WEEKLY,
      price: 99,
      durationDays: 7,
      upfrontCoins: weekly.upfrontCoins,
      dailyCheckinCoins: weekly.dailyCheckinCoins,
      totalCoins: 800,
      frameType: 'gold',
      badgeType: 'star',
      bonusPerks: ['Priority feed', 'VIP frame'],
      isActive: true,
    },
    {
      name: 'Monthly VIP',
      type: VIP_TYPES.MONTHLY,
      price: 299,
      durationDays: 30,
      upfrontCoins: monthly.upfrontCoins,
      dailyCheckinCoins: monthly.dailyCheckinCoins,
      totalCoins: 4500,
      frameType: 'gold',
      badgeType: 'diamond',
      bonusPerks: ['Priority feed', 'Exclusive profiles'],
      isActive: true,
    },
    {
      name: 'Elite Monthly',
      type: VIP_TYPES.ELITE_MONTHLY,
      price: 599,
      durationDays: 30,
      upfrontCoins: elite.upfrontCoins,
      dailyCheckinCoins: elite.dailyCheckinCoins,
      totalCoins: 9000,
      frameType: 'elite',
      badgeType: 'crown',
      bonusPerks: ['All VIP perks', 'Elite badge'],
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await VipPlan.findOneAndUpdate(
      { name: plan.name },
      plan,
      { upsert: true, new: true, runValidators: true }
    );
  }
  console.log(`Seeded ${plans.length} VIP plans`);

  console.log('Seed complete');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
