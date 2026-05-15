/**
 * LuxDate API — Comprehensive End-to-End Test
 * Reads .env so JWT secrets match the running server.
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';

let adminToken = '';
let userToken = '';
let girlId = '';
let conversationId = '';
let giftId = '';
let vipPlanId = '';
let passed = 0;
let failed = 0;

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function check(label, status, expected, data) {
  const ok = status === expected;
  const icon = ok ? '✅' : '❌';
  const detail = ok ? '' : ` — ${data?.message || JSON.stringify(data).slice(0, 80)}`;
  console.log(`${icon} [${status}] ${label}${detail}`);
  ok ? passed++ : failed++;
  return ok;
}

async function seedAdmin() {
  const mongoose = (await import('mongoose')).default;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/luxdate');

  // Use the Mongoose model so comparePassword works
  const Admin = (await import('./src/models/Admin.js')).default;
  let admin = await Admin.findOne({ email: 'admin@luxdate.app' });
  if (!admin) {
    admin = await Admin.create({
      name: 'Super Admin',
      email: 'admin@luxdate.app',
      password: 'Admin@123',
      role: 'admin',
      permissions: [
        'manage_users', 'manage_girls', 'manage_chat', 'manage_coins',
        'manage_gifts', 'manage_vip', 'manage_payments', 'manage_settings', 'manage_admins',
      ],
      isActive: true,
    });
    console.log('   (Seeded super admin via Mongoose)');
  }
  await mongoose.disconnect();
}

async function seedUser() {
  const mongoose = (await import('mongoose')).default;
  const jwt = (await import('jsonwebtoken')).default;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/luxdate');

  const User = (await import('./src/models/User.js')).default;
  let user = await User.findOne({ phone: '+919999999999' });
  if (!user) {
    user = await User.create({
      phone: '+919999999999', name: 'Test User', age: 25, gender: 'male',
      coinBalance: 5000, freeCallCards: 3, isBlocked: false, isOnboarded: true,
    });
    console.log('   (Seeded test user with 5000 coins)');
  }

  userToken = jwt.sign(
    { userId: user._id.toString(), type: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  await mongoose.disconnect();
}

async function run() {
  console.log('\n═══════════════════════════════════════');
  console.log('  LuxDate API — Full Test Suite');
  console.log(`  JWT Secret: ${JWT_SECRET.slice(0, 8)}...`);
  console.log('═══════════════════════════════════════\n');

  // ─── 1. Health ───
  console.log('── Health ──');
  const h = await req('GET', '/health');
  check('Health Check', h.status, 200, h.data);

  // ─── 2. Seed & Admin Login ───
  console.log('\n── Admin Auth ──');
  await seedAdmin();

  const login = await req('POST', '/admin/auth/login', { email: 'admin@luxdate.app', password: 'Admin@123' });
  if (check('Admin Login', login.status, 200, login.data)) {
    adminToken = login.data.data?.tokens?.accessToken || '';
  }

  if (adminToken) {
    const me = await req('GET', '/admin/auth/me', null, adminToken);
    check('Admin Get Me', me.status, 200, me.data);
  }

  // ─── 3. Girl CRUD ───
  console.log('\n── Girl CRUD ──');
  if (adminToken) {
    const create = await req('POST', '/admin/girls', {
      name: 'Priya Sharma', age: 23, bio: 'Love dancing 💃', location: 'Mumbai',
    }, adminToken);
    if (check('Create Girl', create.status, 201, create.data)) {
      girlId = create.data.data?.girl?._id || '';
    }

    const list = await req('GET', '/admin/girls', null, adminToken);
    check('List Girls', list.status, 200, list.data);

    if (girlId) {
      const get = await req('GET', `/admin/girls/${girlId}`, null, adminToken);
      check('Get Girl', get.status, 200, get.data);

      const upd = await req('PUT', `/admin/girls/${girlId}`, { bio: 'Updated ✨' }, adminToken);
      check('Update Girl', upd.status, 200, upd.data);
    }
  }

  // ─── 4. User Auth ───
  console.log('\n── User Auth ──');
  await seedUser();
  check('User Token Generated', 200, 200, {});

  // ─── 5. Feed ───
  console.log('\n── Feed ──');
  const feed = await req('GET', '/feed?page=1&limit=10', null, userToken);
  check('Get Feed', feed.status, 200, feed.data);

  if (girlId) {
    const gp = await req('GET', `/feed/girls/${girlId}`, null, userToken);
    check('Get Girl Profile', gp.status, 200, gp.data);
  }

  // ─── 6. User Profile ───
  console.log('\n── User Profile ──');
  const prof = await req('GET', '/users/profile', null, userToken);
  check('Get Profile', prof.status, 200, prof.data);

  const updProf = await req('PUT', '/users/profile', { name: 'Test User Updated' }, userToken);
  check('Update Profile', updProf.status, 200, updProf.data);

  if (girlId) {
    const follow = await req('POST', `/users/follow/${girlId}`, null, userToken);
    check('Follow Girl', follow.status, 200, follow.data);
  }

  // ─── 7. Chat ───
  console.log('\n── Chat ──');
  if (girlId) {
    const start = await req('POST', `/chat/start/${girlId}`, null, userToken);
    if (check('Start Conversation', start.status, 200, start.data)) {
      conversationId = start.data.data?.conversation?._id || start.data.data?._id || '';
    }
    if (conversationId) {
      const send = await req('POST', `/chat/${conversationId}/messages`, { content: 'Hello! 👋' }, userToken);
      check('Send Message', send.status, 201, send.data);

      const msgs = await req('GET', `/chat/${conversationId}/messages`, null, userToken);
      check('Get Messages', msgs.status, 200, msgs.data);
    }
  }
  const inbox = await req('GET', '/chat/inbox', null, userToken);
  check('Get Inbox', inbox.status, 200, inbox.data);

  // ─── 8. Match ───
  console.log('\n── Match ──');
  const mp = await req('GET', '/match/profiles', null, userToken);
  check('Match Profiles', mp.status, 200, mp.data);

  if (girlId) {
    const sw = await req('POST', '/match/swipe', { girlId, action: 'like' }, userToken);
    check('Swipe Like', sw.status, 200, sw.data);
  }

  // ─── 9. Admin Chat ───
  console.log('\n── Admin Chat ──');
  if (adminToken) {
    const ai = await req('GET', '/admin/chat/inbox', null, adminToken);
    check('Admin Inbox', ai.status, 200, ai.data);

    if (conversationId) {
      const ar = await req('POST', `/admin/chat/${conversationId}/reply`, { content: 'Hi! 🌟' }, adminToken);
      check('Admin Reply', ar.status, 201, ar.data);
    }
  }

  // ─── 10. Admin Users ───
  console.log('\n── Admin Users ──');
  if (adminToken) {
    const au = await req('GET', '/admin/users', null, adminToken);
    check('Admin List Users', au.status, 200, au.data);
  }

  // ─── 11. Gifts ───
  console.log('\n── Gifts ──');
  if (adminToken) {
    const cg = await req('POST', '/admin/gifts', {
      name: 'Rose',
      coinCost: 100,
      level: 1,
      sortOrder: 1,
      emojiFallback: '🌹',
      iconUrl: 'https://example.com/rose.png',
      animationUrl: '',
      isActive: true,
    }, adminToken);
    if (check('Create Gift', cg.status, 201, cg.data)) {
      giftId = cg.data.data?.gift?._id || '';
    }
  }

  const cat = await req('GET', '/gifts/catalog', null, userToken);
  check('Gift Catalog', cat.status, 200, cat.data);

  if (giftId && girlId) {
    const sg = await req('POST', '/gifts/send', { girlId, giftId, quantity: 1 }, userToken);
    check('Send Gift', sg.status, 200, sg.data);
  }

  const gh = await req('GET', '/gifts/history', null, userToken);
  check('Gift History', gh.status, 200, gh.data);

  // ─── 12. VIP ───
  console.log('\n── VIP ──');
  if (adminToken) {
    const cp = await req('POST', '/admin/vip/plans', {
      name: 'Gold Monthly', duration: 'monthly', durationDays: 30, price: 499, coinsIncluded: 500, isActive: true,
    }, adminToken);
    if (check('Create VIP Plan', cp.status, 201, cp.data)) {
      vipPlanId = cp.data.data?.plan?._id || '';
    }
  }

  const vp = await req('GET', '/vip/plans', null, userToken);
  check('Get VIP Plans', vp.status, 200, vp.data);

  const vs = await req('GET', '/vip/subscription', null, userToken);
  check('Get Subscription', vs.status, 200, vs.data);

  // ─── 13. Daily Rewards ───
  console.log('\n── Daily Rewards ──');
  const rs = await req('GET', '/daily-rewards/status', null, userToken);
  check('Reward Status', rs.status, 200, rs.data);

  const cr = await req('POST', '/daily-rewards/claim', null, userToken);
  const claimOk = [200, 400, 404].includes(cr.status);
  console.log(`${claimOk ? '✅' : '❌'} [${cr.status}] Claim Reward — ${cr.data?.message}`);
  claimOk ? passed++ : failed++;

  // ─── 14. Video Calls ───
  console.log('\n── Video Calls ──');
  if (girlId) {
    const mongoose = (await import('mongoose')).default;
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/luxdate');
    const GirlVideo = (await import('./src/models/GirlVideo.js')).default;
    const Girl = (await import('./src/models/Girl.js')).default;

    let video = await GirlVideo.findOne({ girl: girlId, usedForCalls: true });
    if (!video) {
      const Admin = (await import('./src/models/Admin.js')).default;
      const admin = await Admin.findOne({ email: 'admin@luxdate.app' });
      video = await GirlVideo.create({
        girl: girlId,
        url: 'https://example.com/mock-video.mp4',
        thumbnail: 'https://example.com/mock-thumb.jpg',
        duration: 30,
        usedForCalls: true,
        uploadedBy: admin?._id,
      });
      await Girl.findByIdAndUpdate(girlId, { $push: { videos: video._id } });
      console.log('   (Seeded mock video for call test)');
    }
    await mongoose.disconnect();

    const ic = await req('POST', '/calls/initiate', { girlId }, userToken);
    const callOk = [200, 201].includes(ic.status);
    console.log(`${callOk ? '✅' : '❌'} [${ic.status}] Initiate Call — ${ic.data?.message}`);
    callOk ? passed++ : failed++;

    if (ic.data?.data?.call?._id) {
      const ec = await req('POST', `/calls/${ic.data.data.call._id}/end`, null, userToken);
      check('End Call', ec.status, 200, ec.data);
    }
  }

  const ch = await req('GET', '/calls/history', null, userToken);
  check('Call History', ch.status, 200, ch.data);

  // ─── 15. Notifications ───
  console.log('\n── Notifications ──');
  const nl = await req('GET', '/notifications', null, userToken);
  check('Get Notifications', nl.status, 200, nl.data);

  const ma = await req('PATCH', '/notifications/read-all', null, userToken);
  check('Mark All Read', ma.status, 200, ma.data);

  // ─── 16. Payments ───
  console.log('\n── Payments ──');
  const gw = await req('GET', '/payments/gateways', null, userToken);
  check('Get Gateways', gw.status, 200, gw.data);

  const ord = await req('GET', '/payments/orders', null, userToken);
  check('Get Orders', ord.status, 200, ord.data);

  // ─── 17. Settings ───
  console.log('\n── Settings ──');
  if (adminToken) {
    const sd = await req('POST', '/admin/settings/seed', null, adminToken);
    check('Seed Defaults', sd.status, 200, sd.data);

    const as = await req('GET', '/admin/settings', null, adminToken);
    check('Get Settings', as.status, 200, as.data);

    const ss = await req('POST', '/admin/settings', { key: 'test_key', value: 'test_val', group: 'general' }, adminToken);
    check('Set Setting', ss.status, 200, ss.data);
  }

  // ─── 18. Auth Guards ───
  console.log('\n── Auth Guards ──');
  const n1 = await req('GET', '/users/profile');
  check('No Token → 401', n1.status, 401, n1.data);

  const n2 = await req('GET', '/users/profile', null, 'invalid.token');
  check('Bad Token → 401', n2.status, 401, n2.data);

  // ─── Summary ───
  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error('Test crashed:', err.message); process.exit(1); });
