# LuxDate Monetization Handoff

Last updated: 2026-05-18

This handoff documents how monetization works now, what has been implemented recently, and how to reason about flows/debugging quickly.

---

## 1) Project Surfaces

- Mobile app: `LuxApp/` (React Native)
- API server: `Server/` (Express + MongoDB)
- Admin app: `Admin/` (manages packs/plans/payments)

Monetization in this project includes:
- Coin pack purchases (Razorpay or Mock)
- VIP purchases (now supports parallel purchased VIP subscriptions)
- Daily check-ins (free login + VIP plan schedule claims)
- Coin balance and transaction ledgering

---

## 2) Core Concepts and Data Model

### Coins
- User balance is on `User.coinBalance`.
- Coin movement is written to `CoinTransaction`.
- Coin spend/reward reasons use `COIN_TX_TYPES`.

### Payments
- Payment orders are `PaymentTransaction` (`Server/src/models/PaymentOrder.js`).
- Gateway flow:
  - Create order
  - Verify payment
  - Fulfill order (credit coins or activate VIP)

### VIP
- Plan definition: `VipPlan` (price, duration, upfrontCoins, dailyCheckinCoins, etc.).
- User purchase instances: `VipSubscription`.
- Important: multiple active `VipSubscription` rows can coexist now (parallel plans).

### Daily Check-in
- Daily check-in records: `DailyCheckin`.
- Supports free login check-in and VIP check-ins.
- VIP check-ins now track per-subscription claims with day-level metadata.

---

## 3) Current Monetization Architecture (Implemented)

## 3.1 Coin Pack Purchase Flow

Primary files:
- App checkout: `LuxApp/src/screens/Me/CoinPackScreen.jsx`
- Shared payment runner: `LuxApp/src/payments/runPayments.js`
- API calls: `LuxApp/src/api/services.js`
- Server payment service: `Server/src/services/payment/payment.service.js`

Flow:
1. Load packs via `GET /api/coins/packs?context=wallet`.
2. Fetch gateways via `GET /api/payments/gateways`.
3. If one gateway -> direct checkout.
4. If multiple -> gateway picker modal.
5. Create order: `POST /api/payments/coins/order`.
6. Complete gateway:
   - Mock: modal confirm + verify
   - Razorpay: native checkout + verify
7. Verify: `POST /api/payments/orders/:id/verify`.
8. Fulfillment credits coins and app refreshes profile.

Stability improvements implemented:
- Robust gateway parsing from API shape variants.
- Mock order normalization and timeout protection.
- Explicit loading states for gateway fetch and checkout.

---

## 3.2 VIP Purchase Flow

Primary files:
- VIP screen: `LuxApp/src/screens/Me/VIPPlansScreen.jsx`
- Shared payment runner: `LuxApp/src/payments/runPayments.js`
- VIP service: `Server/src/services/vip.service.js`
- Payment service (VIP order): `Server/src/services/payment/payment.service.js`

Flow:
1. Load plans: `GET /api/vip/plans`.
2. Load user status: `GET /api/vip/status`.
3. Purchase selected plan:
   - gateways -> order create `POST /api/payments/vip/order`
   - payment verify
   - fulfillment activates a new `VipSubscription`
4. Upfront VIP coins are granted on activation.

Current behavior:
- VIP plans can be purchased in parallel (weekly/monthly/quarterly all allowed).
- Purchased plans are marked by per-plan subscription progress from status payload.

---

## 3.3 VIP Daily Check-in Flow (Parallel Plans)

Primary files:
- Frontend claim UI: `LuxApp/src/screens/Me/VIPPlansScreen.jsx`
- Claim API: `POST /api/coins/checkin` via `LuxApp/src/api/services.js`
- Claim engine: `Server/src/engines/MonetizationController.js`
- Status assembler: `Server/src/services/vip.service.js`
- Subscription model: `Server/src/models/VipSubscription.js`
- Daily record model: `Server/src/models/DailyCheckin.js`

Key rule currently implemented:
- For a purchased plan, unlocked and unclaimed days are claimable by sending plan/subscription context.
- Claim request includes:
  - `subscriptionId`
  - `planId`
  - `dayNumber`

Status shape used by app:
- `vip.status` returns `plansProgress[]` (also mirrored as `subscriptions[]`) with:
  - `subscriptionId`, `planId`, `planName`, `planSlug`
  - `expiresAt`, `daysRemaining`, `checkinCoins`
  - `canClaimNow`
  - `progress`:
    - `daysClaimed`
    - `claimedDayNumbers`
    - `unlockedDays`
    - `unlockedUnclaimedDays`
    - `totalDays`
    - `remainingCheckins`
    - `remainingCoinsToCollect`

Frontend uses this to render per-plan schedule card state:
- Claimed day -> checkmark
- Unlocked + unclaimed -> claimable
- Locked -> lock icon

---

## 4) Notable Fixes Implemented in This Iteration

## 4.1 Checkout and Purchase UX
- Fixed dead-click payment starts by adding deterministic gateway progression and visible loading.
- Fixed gateway modal wiring for VIP purchase path (`plan` path handling).
- Fixed stuck mock path with normalized payload handling and timeout guard.

## 4.2 VIP Plan Rendering
- Added resilient plan mapping/fallback for varying backend fields.
- Removed invalid/zero-benefit VIP plan entries from display.
- Removed forced mock/filler plans in VIP UI.

## 4.3 VIP Activation / CTA / Schedule State
- Active plan identification now uses stable backend `planId` contract.
- CTA behavior no longer ambiguous for active vs purchasable states.
- Schedule cards support claimed/unlocked/locked visuals and explicit tap feedback.

## 4.4 Parallel VIP Subscriptions
- Backend no longer enforces single active VIP replacement.
- New purchase does not replace existing active subscriptions.
- VIP status returns per-subscription progress arrays.

## 4.5 Check-in Reliability + Dev Mongo Support
- Claim path now supports standalone MongoDB (non-replica) fallback when transactions are unsupported.
- Optional config: `MONGO_USE_TRANSACTIONS` (`false` disables transaction usage explicitly).
- Idempotent coin grant reference patterns used in claim flow:
  - VIP: `vip:<subscriptionId>:day:<dayNumber>`
  - Free: `free:<userId>:<yyyy-mm-dd>`

---

## 5) Important API Endpoints

Payments:
- `GET /api/payments/gateways`
- `POST /api/payments/coins/order`
- `POST /api/payments/vip/order`
- `POST /api/payments/orders/:orderId/verify`

VIP:
- `GET /api/vip/plans`
- `GET /api/vip/status`

Coins / Check-in:
- `GET /api/coins/checkin/status`
- `POST /api/coins/checkin` (supports VIP claim context body)

---

## 6) Current Config Knobs

From `Server/src/config/env.js`:
- `PAYMENT_MOCK` -> mock gateway on/off
- `PAYMENT_MOCK_ALLOW_PROD` -> allows mock in production when explicitly set
- `MONGO_USE_TRANSACTIONS`:
  - default: enabled
  - set `false` for local standalone Mongo to avoid transaction-only behavior

---

## 7) Debugging Guide for Engineers

### A) “Payment click does nothing”
Check:
1. `GET /api/payments/gateways` response shape and count.
2. Gateway selection state in screen.
3. Order create request fired (`/coins/order` or `/vip/order`) after gateway selection.

### B) “Claim tap does nothing”
Check:
1. Frontend is sending `subscriptionId`, `planId`, `dayNumber`.
2. Status payload has corresponding purchased plan in `plansProgress`.
3. Day state is unlocked and not already in `claimedDayNumbers`.
4. Response envelope `data.success` is checked in UI (not only HTTP status).

### C) “Coins not added after claim”
Check:
1. `MonetizationController.claimDailyCheckin` return payload and errors.
2. `CoinTransaction` row exists with check-in reference id.
3. `User.coinBalance` updated.
4. App calls `loadProfile()` after successful claim.

### D) “Local Mongo errors around transactions”
Check:
1. If using standalone Mongo, set `MONGO_USE_TRANSACTIONS=false`.
2. Verify fallback path logs and claim still succeeds without replica set.

---

## 8) Verification Commands Used

Typical focused checks:
- App lint:
  - `npx eslint "src/screens/Me/VIPPlansScreen.jsx" "src/screens/Me/CoinPackScreen.jsx" "src/payments/runPayments.js"`
- Server lint/syntax:
  - `npx eslint "src/services/vip.service.js" "src/engines/MonetizationController.js" "src/services/payment/payment.service.js"`
  - `node --check "src/engines/MonetizationController.js"`
  - `node --check "src/services/vip.service.js"`

---

## 9) Known Tradeoffs / Next Improvements

1. Add explicit automated integration tests for:
- parallel VIP subscriptions
- multi-day catch-up claims
- idempotent duplicate claim handling

2. Add admin observability page/widgets:
- per-subscription claim progress
- failed claim reasons
- idempotency hit metrics

3. Audit and remove debug telemetry hooks remaining in mobile checkout code if no longer needed.

4. Tighten contract docs for:
- `vip/status` schema (`plansProgress`)
- `coins/checkin` VIP claim payload semantics.

---

## 10) Quick Mental Model

- **Payments** create/verify/fulfill.
- **VIP purchase** creates a subscription row per purchase.
- **Status** returns per-subscription progress.
- **UI** renders and claims against that specific subscription/day.
- **Claim** writes idempotent coin transaction + updates claimed day tracking.

This is the current source of truth for monetization behavior in the repository.
