import assert from 'node:assert/strict';
import axios from 'axios';

/**
 * Relationship integration harness (manual-run against a dev server).
 *
 * Usage:
 *   BASE_URL=http://localhost:5000/api \
 *   AUTH_TOKEN=<jwt> \
 *   GIRL_ID=<girlObjectId> \
 *   SWITCH_GIRL_ID=<otherGirlObjectId> \
 *   node scripts/relationship.integration.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const GIRL_ID = process.env.GIRL_ID || '';
const SWITCH_GIRL_ID = process.env.SWITCH_GIRL_ID || '';

if (!AUTH_TOKEN || !GIRL_ID) {
  console.error('Missing required env vars: AUTH_TOKEN and GIRL_ID');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`,
  },
  timeout: 20_000,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getSlot(type) {
  const options = await client.get(`/relationships/options/${GIRL_ID}`);
  return options.data?.data?.slots?.find((slot) => slot.type === type) || null;
}

async function run() {
  console.log('1) options endpoint returns 3 slots');
  const optionsRes = await client.get(`/relationships/options/${GIRL_ID}`);
  assert.equal(optionsRes.data?.success, true);
  assert.equal(Array.isArray(optionsRes.data?.data?.slots), true);
  assert.equal(optionsRes.data.data.slots.length, 3);

  console.log('2) invite close_friend');
  const inviteRes = await client.post('/relationships/invite', {
    girlId: GIRL_ID,
    type: 'close_friend',
  });
  assert.equal(inviteRes.data?.success, true);
  assert.equal(inviteRes.data?.data?.ok, true);
  const rel = inviteRes.data.data.relationship;
  assert.equal(rel.type, 'close_friend');
  assert.equal(rel.status, 'pending');
  assert.ok(rel.acceptanceDueAt);

  console.log('3) verify one-slot rule blocks second invite same type');
  let blocked = false;
  if (SWITCH_GIRL_ID) {
    try {
      await client.post('/relationships/invite', {
        girlId: SWITCH_GIRL_ID,
        type: 'close_friend',
      });
    } catch (error) {
      blocked = error?.response?.status === 409;
    }
    assert.equal(blocked, true);
  }

  console.log('4) accept after due time');
  const dueAt = new Date(rel.acceptanceDueAt).getTime();
  const waitMs = Math.max(0, dueAt - Date.now()) + 1200;
  if (waitMs > 0) await sleep(waitMs);
  const acceptRes = await client.post(`/relationships/${rel._id}/accept`);
  assert.equal(acceptRes.data?.success, true);
  assert.equal(acceptRes.data?.data?.ok, true);
  assert.equal(acceptRes.data?.data?.relationship?.status, 'accepted');

  console.log('5) break accepted inserts break card path');
  const breakRes = await client.post(`/relationships/${rel._id}/break`, { reason: 'manual_break' });
  assert.equal(breakRes.data?.success, true);
  assert.equal(breakRes.data?.data?.insertedBreakMessage, true);
  assert.equal(breakRes.data?.data?.relationship?.status, 'ended');

  console.log('6) my endpoint shape');
  const myRes = await client.get('/relationships/my');
  assert.equal(myRes.data?.success, true);
  assert.equal(Array.isArray(myRes.data?.data?.slots), true);

  console.log('All relationship integration checks passed.');
}

run().catch((error) => {
  console.error('Relationship integration check failed.');
  console.error(error?.response?.status, error?.response?.data || error.message);
  process.exit(1);
});
