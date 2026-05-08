/**
 * Seed Script — Populates AutoReplyPool, GirlProfiles, Gifts, and VipPlans.
 * Run: node src/scripts/seed.js
 */
import mongoose from 'mongoose';
import env from '../config/env.js';
import AutoReplyPool from '../models/AutoReplyPool.js';
import GirlProfile from '../models/Girl.js';
import Gift from '../models/Gift.js';
import VipPlan from '../models/VipPlan.js';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('🔗 Connected to MongoDB');

  // ─── AutoReplyPool ─────────────────────────────────────
  const replyPools = [
    {
      language: 'en', category: 'greeting',
      messages: [
        'Hey! How are you? 💕', 'Hi there handsome 😘', 'Hello! You look amazing!',
        'Heyyyy, I was waiting for you 💫', 'OMG hi! Love your profile 🥰',
        'Hey cutie, what are you up to? 😊', 'Finally someone interesting! 👋',
      ],
    },
    {
      language: 'en', category: 'flirty',
      messages: [
        'You make me smile 😊', 'I can\'t stop thinking about you 💭',
        'Wish you were here right now 🥺', 'You\'re so sweet! 🍬',
        'I feel so comfortable talking to you ❤️', 'Are you always this charming? 😏',
        'You just made my day better! ☀️', 'I love talking to you 💕',
      ],
    },
    {
      language: 'en', category: 'casual',
      messages: [
        'What are you doing right now?', 'Tell me something about yourself!',
        'What\'s your favorite thing to do? 🤔', 'I just had dinner, wbu?',
        'The weather is so nice today! ☀️', 'I\'m bored, entertain me 😂',
        'Do you like movies? 🎬', 'What kind of music do you like? 🎵',
      ],
    },
    {
      language: 'hi', category: 'greeting',
      messages: [
        'Hey! Kaise ho? 💕', 'Hi handsome 😘', 'Hello ji! Kaisa chal raha hai?',
        'Heyyyy, main tumhara wait kar rahi thi 💫', 'Hi! Tumhara profile bahut accha hai 🥰',
      ],
    },
    {
      language: 'hi', category: 'flirty',
      messages: [
        'Tum mujhe bohot pasand ho 😊', 'Main tumhare baare mein soch rahi thi 💭',
        'Kaash tum yahan hote 🥺', 'Tum bohot sweet ho! 🍬',
        'Tumse baat karke bohot accha lagta hai ❤️',
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
  console.log(`✅ Seeded ${replyPools.length} auto-reply pools`);

  // ─── Girl Profiles ─────────────────────────────────────
  const girls = [
    { name: 'Priya Sharma', age: 23, bio: 'Love dancing and exploring new places 💃', location: 'Mumbai', language: 'Hindi', charmLevel: 'Hot', distanceKm: 2.5, photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hey cutie! 💕 Mujhe tumse baat karni hai' }] },
    { name: 'Ananya Patel', age: 21, bio: 'Photography enthusiast 📸 Coffee lover ☕', location: 'Delhi', language: 'English', charmLevel: 'Rising', distanceKm: 5.1, photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hi! I love your vibe ✨' }] },
    { name: 'Sneha Reddy', age: 24, bio: 'Fitness freak 💪 Yoga practitioner 🧘‍♀️', location: 'Bangalore', language: 'English', charmLevel: 'Hot', distanceKm: 3.8, photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hey there! You caught my eye 😘' }] },
    { name: 'Riya Singh', age: 22, bio: 'Foodie | Traveler | Netflix addict 🍕✈️', location: 'Jaipur', language: 'Hindi', charmLevel: 'Goddess', distanceKm: 1.2, photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hiii! Tumse milke bohot khushi hogi 🥰' }] },
    { name: 'Kavya Nair', age: 25, bio: 'Music is my therapy 🎵 Singer wannabe', location: 'Chennai', language: 'English', charmLevel: 'Rising', distanceKm: 7.3, photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hey! Your smile is so cute 😊' }] },
    { name: 'Nisha Gupta', age: 20, bio: 'College student 📚 Part-time model', location: 'Lucknow', language: 'Hindi', charmLevel: 'Hot', distanceKm: 4.6, photos: ['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Heyy! Main tumhari friend banna chahti hoon 💫' }] },
    { name: 'Meera Kapoor', age: 26, bio: 'Interior designer 🎨 Art lover', location: 'Pune', language: 'English', charmLevel: 'Rising', distanceKm: 6.0, photos: ['https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hi handsome! What brings you here? 😏' }] },
    { name: 'Aisha Khan', age: 23, bio: 'Fashion blogger 👗 Dreamer', location: 'Hyderabad', language: 'English', charmLevel: 'Goddess', distanceKm: 0.8, photos: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'OMG you are so handsome! Let\'s chat 💕' }] },
    { name: 'Pooja Verma', age: 21, bio: 'Dance like nobody is watching 💃✨', location: 'Kolkata', language: 'Hindi', charmLevel: 'Hot', distanceKm: 3.1, photos: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hey! Kya tum mujhe pasand karoge? 🥰' }] },
    { name: 'Divya Joshi', age: 24, bio: 'Bookworm 📖 Tea over coffee always ☕', location: 'Ahmedabad', language: 'English', charmLevel: 'Rising', distanceKm: 8.2, photos: ['https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400'], videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', firstMessages: [{ type: 'text', content: 'Hi! Tell me about yourself 😊' }] },
  ];

  for (const girl of girls) {
    await GirlProfile.findOneAndUpdate(
      { name: girl.name },
      girl,
      { upsert: true, new: true }
    );
  }
  console.log(`✅ Seeded ${girls.length} girl profiles`);

  // ─── Gifts ─────────────────────────────────────────────
  const gifts = [
    { name: 'Rose', emoji: '🌹', coinCost: 10, level: 0 },
    { name: 'Chocolate', emoji: '🍫', coinCost: 20, level: 0 },
    { name: 'Teddy Bear', emoji: '🧸', coinCost: 50, level: 1 },
    { name: 'Perfume', emoji: '🧴', coinCost: 100, level: 2 },
    { name: 'Diamond Ring', emoji: '💍', coinCost: 500, level: 4 },
    { name: 'Sports Car', emoji: '🏎️', coinCost: 2000, level: 6 },
    { name: 'Mansion', emoji: '🏰', coinCost: 5000, level: 8 },
    { name: 'Private Jet', emoji: '✈️', coinCost: 10000, level: 10 },
    { name: 'Crown', emoji: '👑', coinCost: 50000, level: 13 },
    { name: 'Universe', emoji: '🌌', coinCost: 100000, level: 15 },
  ];

  for (const gift of gifts) {
    await Gift.findOneAndUpdate(
      { name: gift.name },
      gift,
      { upsert: true, new: true }
    );
  }
  console.log(`✅ Seeded ${gifts.length} gifts`);

  // ─── VIP Plans ─────────────────────────────────────────
  const plans = [
    { name: 'Weekly VIP', price: 99, durationDays: 7, dailyCheckinCoins: 10, upfrontCoins: 50, badge: '⭐', perks: ['10 coins/day check-in', '50 bonus coins', 'Priority feed'] },
    { name: 'Monthly VIP', price: 299, durationDays: 30, dailyCheckinCoins: 15, upfrontCoins: 200, badge: '💎', perks: ['15 coins/day check-in', '200 bonus coins', 'Priority feed', 'Exclusive profiles'] },
    { name: 'Quarterly VIP', price: 699, durationDays: 90, dailyCheckinCoins: 20, upfrontCoins: 600, badge: '👑', perks: ['20 coins/day check-in', '600 bonus coins', 'All perks', 'VIP badge'] },
  ];

  for (const plan of plans) {
    await VipPlan.findOneAndUpdate(
      { name: plan.name },
      plan,
      { upsert: true, new: true }
    );
  }
  console.log(`✅ Seeded ${plans.length} VIP plans`);

  console.log('\n🎉 Seed complete!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
