# LuxDate Handoff

**Last updated:** 2026-05-16  
**Primary blocker for next agent:** Coin pack purchase on mobile — tap ₹100 triggers `GET /api/payments/gateways` (200) but **no visible UI** (no gateway picker, no spinner, no Razorpay/mock flow). Purchase flow is **not verified end-to-end** on device.

---

## Project snapshot

| Surface | Path | Role |
|--------|------|------|
| Mobile app | `LuxApp/` | React Native — coins, VIP, calls, chat, gifts |
| API server | `Server/` | Express + MongoDB + Socket.IO |
| Admin panel | `Admin/` | Catalog, users, coin packs, payments, VIP |

**Repo root:** `LuxDate`

---

## What is “monetization” in this project?

LuxDate monetization = **coins** (soft currency) + **VIP** (subscription) + **payments** (Razorpay / mock) + **spend** paths (calls, gifts, chat unlocks, etc.).

### Terms (product / engineering)

| Term | Meaning |
|------|---------|
| **Coin** | In-app balance (`user.coinBalance`). Spent on gifts, calls, etc. |
| **Coin pack** | Admin-defined SKU: `priceInr`, `coins`, optional `bonusCoins`, `contexts` (`wallet` \| `call` \| `gift`). |
| **VIP plan** | Subscription SKU: duration, upfront coins, daily check-in coins, frame/badge. |
| **Payment order** | Mongo `PaymentTransaction` row: `purpose` `coins` \| `vip`, `status` `created` → `success`, gateway metadata. |
| **Gateway** | `mock` (dev/test, no real money) or `razorpay`. |
| **Mock completion nonce** | One-time secret on mock orders; client must send it on verify (10 min TTL). |
| **Fulfillment** | After verify: credit coins via `coinService.credit` or activate VIP via `vipService.activateFromPayment`. |
| **Context** | Which packs appear: `GET /api/coins/packs?context=wallet` (also `call`, `gift`). |

### Design intent (how it *should* work)

1. User opens **Buy coins** (`CoinPackScreen`) or **CoinPackSheet** (chat/call/profile insufficient coins).
2. App loads packs: `GET /api/coins/packs?context=...`.
3. User taps a pack (e.g. ₹100).
4. **Before creating a DB order:** app loads gateways `GET /api/payments/gateways`.
   - **One** enabled gateway → go straight to checkout with that gateway.
   - **Multiple** → show **in-app Modal** (`PaymentGatewayPickModal`) — **not** native `Alert`.
5. App creates order: `POST /api/payments/coins/order` body `{ packId, gateway }` → **201** + `gatewayData`.
6. **Mock:** show `MockPayConfirmModal` → user confirms → `POST /api/payments/orders/:transactionId/verify` with `{ mockCompletionNonce }` → coins credited.
7. **Razorpay:** `react-native-razorpay` checkout → verify with Razorpay ids → coins credited.
8. App refreshes profile (`loadProfile`), shows success.

VIP (`VIPPlansScreen`) mirrors steps 3–8 with `POST /api/payments/vip/order` and VIP fulfillment.

**Important product rule:** Do **not** create a payment order on pack tap alone; order is created only after gateway is chosen (avoids abandoned `created` rows).

---

## Monetization — server (implemented)

### Env / flags (`Server/.env`, `Server/src/config/env.js`)

| Variable | Effect |
|----------|--------|
| `PAYMENT_MOCK=true` | Mock gateway enabled for new orders (typical local dev). |
| `PAYMENT_MOCK=false` + Razorpay keys set | Real Razorpay path. |
| Dev auto-mock | If `NODE_ENV=development` and `RAZORPAY_KEY_ID` empty, mock enables unless `PAYMENT_MOCK=false`. |
| `PAYMENT_MOCK_ALLOW_PROD=true` | Allows mock in production (dangerous; off by default). |

See `Server/.env.example`.

### Key files

| Area | Path |
|------|------|
| Payment orchestration | `Server/src/services/payment/payment.service.js` |
| Razorpay adapter | `Server/src/services/payment/razorpay.gateway.js` |
| Mock adapter | `Server/src/services/payment/mock.gateway.js` |
| Order model | `Server/src/models/PaymentOrder.js` (exported as `PaymentTransaction`) |
| Coin packs | `Server/src/models/CoinPack.js`, `Server/src/services/coinPack.service.js` |
| VIP | `Server/src/services/vip.service.js`, `Server/src/models/VipPlan.js` |
| Routes | `Server/src/routes/payment.routes.js`, `coin.routes.js`, `vip.routes.js` |
| Webhooks | `Server/src/routes/webhook.routes.js`, `Server/src/controllers/webhook.controller.js` |
| Admin coin packs | `Server/src/routes/admin/admin.coinPack.routes.js` |
| Admin payments | `Server/src/routes/admin/admin.payment.routes.js` |

### API surface (authenticated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/payments/gateways` | List enabled gateways |
| POST | `/api/payments/coins/order` | Create coin purchase order (`packId`, `gateway`) |
| POST | `/api/payments/vip/order` | Create VIP order (`planId`, `gateway`) |
| POST | `/api/payments/orders/:orderId/verify` | Verify mock or Razorpay payment |
| GET | `/api/coins/packs` | List packs (`context` query) |
| GET | `/api/vip/plans` | List VIP plans |

Response envelope: `{ success, message, data }` via `Server/src/utils/response.js`.

### Bugs fixed on server (during monetization work)

1. **Razorpay `receipt` length > 40** — `buildGatewayReceipt()` + clamp in `razorpay.gateway.js`.
2. **Mock gateway** — full create/verify path with nonce + expiry on `PaymentTransaction`.
3. **Verify returns HTTP 200 with `verified: false`** — client must treat as failure (`assertPaymentVerified` in app).
4. **Gateway choice on create** — `resolveCheckoutGateway(body.gateway)`; client must send `gateway` on order create.

### Server status (agent assessment)

Backend for gateways + order create + verify is **largely complete**. User logs show **`GET /api/payments/gateways` → 200**. That does **not** prove checkout works; often **no** `POST /api/payments/coins/order` appears after tap — failure is on the **client** after gateways fetch.

---

## Monetization — mobile (implemented, not working on device)

### Key files

| File | Role |
|------|------|
| `LuxApp/src/payments/runPayments.js` | `fetchPaymentGatewayNames`, `checkoutAndVerifyCoinPack`, `checkoutAndVerifyVip` |
| `LuxApp/src/components/PaymentGatewayPickModal.jsx` | Gateway picker (React Modal) |
| `LuxApp/src/components/MockPayConfirmModal.jsx` | Mock confirm (React Modal) |
| `LuxApp/src/screens/Me/CoinPackScreen.jsx` | Full-screen buy coins |
| `LuxApp/src/components/CoinPackSheet.jsx` | Bottom sheet (chat/call/profile) |
| `LuxApp/src/screens/Me/VIPPlansScreen.jsx` | VIP subscribe |
| `LuxApp/src/screens/Me/WalletScreen.jsx` | Nav to CoinPack + history |
| `LuxApp/src/screens/Me/TransactionHistoryScreen.jsx` | History UI |
| `LuxApp/src/api/services.js` | `paymentsApi`, `coinsApi`, `vipApi` |

### Navigation entry points

- Profile → Buy coins / balance → `CoinPack`
- Wallet → `CoinPack`
- Insufficient coins → `CoinPackSheet` on Conversation, VideoCall, GirlProfile, Incoming/Outgoing call

### Intended client flow (`CoinPackScreen.handleBuy`)

```
onPress pack
  → fetchPaymentGatewayNames()     // GET /payments/gateways
  → if 0 gateways: Alert error
  → if 1 gateway: runCheckout(pack, gateway)   // sets buyingId, POST order, mock/Razorpay
  → if 2+ gateways: setGwPick({ visible: true, ... })  // PaymentGatewayPickModal
       → onSelect → runCheckout(pack, gateway)
```

`runCheckout` calls `checkoutAndVerifyCoinPack(packId, { gateway, confirmMockUi })`.

### Refactor history (why this matters)

**Original broken pattern (removed from `runPayments.js` but may still be on device if bundle not reloaded):**

- `pickCheckoutGateway()` used **`Alert.alert`** inside `deferUi` / async after `setBuyingId`.
- On Android (especially with other Modals open), **Alert Promise often never resolves** → stuck spinner, **no POST order**.

**Attempted fix (current code in repo):**

- Remove `Alert` for gateway + mock confirm.
- Screens own Modals; `runPayments` requires explicit `gateway` + `confirmMockUi` callback.

**Debug instrumentation still in tree (session `a0d528`):**

- `fetch` to `http://127.0.0.1:7800/ingest/...` in `runPayments.js` and `CoinPackScreen.jsx` (`// #region agent log`).
- Log file expected: `debug-a0d528.log` at repo root — **was never created** in session (ingest server not reachable from emulator/device).
- **Remove** these regions after fix is verified.

---

## Current bug (user report — 2026-05-16)

### Symptoms

- Tap **₹100** pack on Buy coins screen.
- **No UI feedback:** no loading spinner on row, no gateway modal, no mock confirm, no Razorpay sheet.
- Server log shows **`GET /api/payments/gateways` → 200** (and earlier logs also showed `GET /api/coins/packs?context=wallet` 200).
- User believes backend works; **frontend appears dead** after gateways call.

### Observed server pattern (from terminal)

```
GET /api/coins/packs?context=wallet   200
GET /api/payments/gateways            200
(often NO POST /api/payments/coins/order after tap)
```

### Likely causes (ranked for next agent)

1. **Stale JS bundle** — Metro not reloaded; device still running old `runPayments.js` with `pickCheckoutGateway` + `Alert` hang **after** `buyingId` set OR hang inside checkout without reaching POST.
2. **Multiple gateways + Modal not visible** — `handleBuy` sets `gwPick.visible` but **no `buyingId`** until selection → user sees “nothing” (no spinner). `PaymentGatewayPickModal` may not render (z-index, parent, or state not updating). **Check how many gateways** `GET /gateways` returns in DB.
3. **Single gateway + silent failure before `setBuyingId`** — unlikely if `runCheckout` is entered (first line is `setBuyingId`). If `handleBuy` throws parsing gateways response, user might see nothing if error swallowed — verify `fetchPaymentGatewayNames` parsing matches API shape: `res.data.data.gateways`.
4. **Mock path: `confirmMockUi` Modal never shown** — Promise waits forever; if `buyingId` was set, spinner would show — user says no spinner → points to **stuck before `runCheckout`** (cases 1–2).
5. **`CoinPackSheet` nested Modal** — sheet + gateway modal stacking on Android needs explicit testing.

### What was **not** proven

- End-to-end coin purchase on emulator/device after Modal refactor.
- `POST /api/payments/coins/order` immediately after gateway selection.
- `debug-a0d528` ingest logs on device.

---

## Recommended debug workflow (next agent)

1. **Confirm bundle:** Full Metro restart (`npx react-native start --reset-cache`), rebuild app, not just fast refresh.
2. **Log gateways count** on device: temporary `console.log` in `CoinPackScreen.handleBuy` after fetch — or proxy API response.
3. **Server:** After tap, expect sequence:
   - `GET /payments/gateways`
   - then **`POST /payments/coins/order`** (201)
   - then **`POST /payments/orders/:id/verify`** (mock) or Razorpay UI.
4. If only `GET gateways` fires:
   - Breakpoint / log at start of `handleBuy`, after fetch, before `setGwPick`, start of `runCheckout`.
   - If `gateways.length > 1`, inspect `PaymentGatewayPickModal` `visible` prop and React DevTools state.
5. **DB:** `PaymentGateway` collection — how many `isEnabled: true`? Mock-only vs mock+razorpay changes UI branch.
6. Remove `// #region agent log` fetch blocks once fixed.
7. Test **CoinPackSheet** from chat insufficient-coins path separately (nested Modal).

### Quick API checks (curl / Postman)

```http
GET  /api/payments/gateways          Authorization: Bearer <token>
POST /api/payments/coins/order       { "packId": "<id>", "gateway": "mock" }
POST /api/payments/orders/<txnId>/verify   { "mockCompletionNonce": "<from create response>" }
```

---

## Monetization — admin (implemented)

| Page | Path |
|------|------|
| Coin packs CRUD | `Admin/src/pages/CoinPacksPage.jsx` |
| Payments list | `Admin/src/pages/PaymentsPage.jsx` |
| VIP | `Admin/src/pages/VipPage.jsx` |
| User coin adjust | `Admin/src/pages/UsersPage.jsx` (touched) |

Routes wired in `Admin/src/App.jsx` / `Admin/src/api/services.js`.

---

## VIP & coins (non-payment)

- Daily check-in: `GET/POST /api/coins/checkin/*`, IST helpers `Server/src/utils/timeIST.js`.
- VIP status: `GET /api/vip/status`; distribution helpers `Server/src/utils/vipDistribution.js`.
- Legacy direct VIP purchase endpoint may still exist; **preferred path** is payment orders + verify.

---

## Gifting (separate track — largely done)

Backend gifting is **implemented** (catalog, send, transactions, socket `new_message`). Main remaining risk was **gift picker UI polish**, not payments.

### Quick reference

| Layer | Path |
|-------|------|
| Service | `Server/src/services/gift.service.js` |
| Mobile picker | `LuxApp/src/components/GiftPickerModal.jsx` |
| Send hook | `LuxApp/src/hooks/useGiftActions.js` |

### Gifting notes for monetization overlap

- Gifts spend **existing** `coinBalance` (no Razorpay on send).
- Insufficient coins opens **`CoinPackSheet`** — **same broken purchase flow** as CoinPack screen.

### User preferences (gifting UI)

- Bottom sheet, vertical price-sorted grid, fixed footer quantity bar, no level tabs.
- Validate on real device before claiming fixed.

---

## Git / uncommitted state (snapshot)

Many monetization files are modified or untracked across `LuxApp/`, `Server/`, `Admin/`. **Do not commit `Server/.env`** (secrets). Android `build/` and `node_modules` artifacts may appear in `git status` — ignore.

---

## Files to open first (monetization bug)

1. `LuxApp/src/screens/Me/CoinPackScreen.jsx` — `handleBuy`, `gwPick`, `runCheckout`
2. `LuxApp/src/payments/runPayments.js` — ensure no `Alert` / `pickCheckoutGateway`
3. `LuxApp/src/components/PaymentGatewayPickModal.jsx`
4. `LuxApp/src/components/MockPayConfirmModal.jsx`
5. `LuxApp/src/components/CoinPackSheet.jsx` — nested modal path
6. `Server/src/services/payment/payment.service.js` — `getAvailableGateways`, `createCoinPurchaseOrder`

---

## Honest status summary

| Area | Status |
|------|--------|
| Coin pack / VIP models & admin | Implemented |
| Payment service (mock + Razorpay, verify, fulfill) | Implemented; receipt length fixed |
| Mobile API client | Implemented |
| Mobile checkout UX (Modals, no Alert) | **Coded in repo; not confirmed on device** |
| **₹100 tap → purchase complete** | **BROKEN / unverified** |
| Gifting backend | Working |
| Gift picker UI polish | May still need device tuning |

---

## Agent session notes (payments debug)

- User frustration: repeated “loading forever” on ₹100 row was traced (in code review) to **`Alert.alert` + async** blocking `checkoutAndVerifyCoinPack` before order POST.
- Refactor to Modal-based gateway/mock confirm was **written** but user still reports **zero UI** with only `GET gateways` 200 — suggests **reload issue**, **multi-gateway modal invisible**, or **failure between fetch and `runCheckout`**.
- Instrumentation to `127.0.0.1:7800` is useless on physical device unless port-forwarded; use `console.log` or React Native debugger instead.

---

## Suggested next steps (priority)

1. Fix coin purchase UI E2E on `CoinPackScreen` (then `CoinPackSheet`).
2. Verify server logs show POST order + verify on happy path mock.
3. Test Razorpay with real keys when mock disabled.
4. Remove debug `fetch` ingest blocks.
5. Optional: admin reconcile / stale `created` orders cleanup.
6. Return to gift picker polish only after payments work.
