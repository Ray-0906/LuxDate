import mongoose from 'mongoose';
import env from './src/config/env.js';
import GirlProfile from './src/models/Girl.js';

async function run() {
  await mongoose.connect(env.mongoUri || process.env.MONGO_URI);
  console.log('Connected to DB');
  const result = await GirlProfile.updateMany({}, {
    $set: { videoUrl: 'http://10.0.2.2:5000/videos/test.mp4' }
  });
  console.log('Updated profiles:', result.modifiedCount);
  process.exit(0);
}

run();
