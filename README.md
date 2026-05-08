# LuxDate — Scripted Engagement Platform

A high-retention dating and video interaction platform built around **artificial engagement, coin-based monetization, and scripted interactions**. All calls, messages, and feed activity are server-controlled to maximize engagement and conversion.

---

## 1. Product Philosophy

| Principle | Description |
|-----------|-------------|
| **Simple UI, aggressive engagement** | Content is mostly controlled/artificial — not driven by real users |
| **Scripted interactions** | All video calls use pre-recorded HLS. All chat uses auto-reply pools |
| **Coin economy** | Every meaningful action costs coins. Every free action has a limit |
| **Trigger-based retention** | Calls fire based on dwell time, idle detection, and event triggers |

### Target
Users seeking a premium, polished dating/chat experience. Revenue is generated through coin purchases, VIP subscriptions, and gift sending — all gated behind artificial engagement loops.

---

## 2. Navigation Architecture

### Bottom Tabs (Primary)

| Tab | Screen | Content |
|-----|--------|---------|
| **For You** | `ForYouScreen` | Segmented **Hot** (18 random) / **Nearby** (25 with distance) feeds |
| **Chat** | `InboxScreen` | Conversation list with unread badges, last message preview |
| **Me** | `ProfileScreen` | Avatar, wealth level, coin/point balance, settings menu |

### Stack Screens

| Screen | Trigger | Purpose |
|--------|---------|---------|
| `GirlProfileScreen` | Tap card in feed | Photo carousel, charm badge, bio, gifts, chat/call actions |
| `IncomingCallScreen` | TriggerEngine fires | Full-screen caller UI, vibration, 30s auto-miss |
| `VideoCallScreen` | Accept incoming call | HLS video playback, timer, mute/end/gift controls |

---

## 3. Engagement Engines

### 3.1 TriggerEngine (Client — `LuxApp/src/engines/`)

Controls when fake incoming calls fire. Three trigger types:

| Trigger | Condition | Delay |
|---------|-----------|-------|
| `ProfileTrigger` | User views a girl profile | 10–15s dwell time |
| `IdleTrigger` | User is inactive in app | 3–10 min random interval |
| `EventTrigger` | User exits payment page or declines 2+ calls | Immediate |

**Session limits**: Max 8 calls/session. **Burst control**: 5 calls in 30s → 2-min cooldown.

### 3.2 AutoReplyEngine (Server — `Server/src/engines/`)

Picks a reply from `AutoReplyPool` matching the girl's language. Enforces 1-for-1 message flow via `isWaitingForUser` flag. Adds 1–3 second artificial delay.

### 3.3 FakeInteractionEngine (Server)

Fires on new user registration. Sends 5–10 auto-messages from random girl profiles using their `firstMessages` templates. Creates chat sessions automatically.

### 3.4 MonetizationController (Server)

Central coin manager. All deductions are server-side only. Handles:

- `deductCoins()` — atomic deduction with paywall response (HTTP 402)
- `grantCoins()` — atomic credit with transaction log
- Wealth level calculation (16 tiers from `totalCoinsEverSpent`)
- Daily check-in (VIP bonus vs free login)

---

## 4. Monetization System

### 4.1 Coin Economy

| Action | Cost | Notes |
|--------|------|-------|
| Video call (free) | 0 | First 3 calls only |
| Video call (paid) | 10 coins/min | Server-enforced |
| Send gift | 10–100,000 | Tiered by wealth level |
| Relationship upgrade | Variable | soulmate/best_friend/lover |
| Chat message | Free | Auto-reply is automatic |

### 4.2 Wealth Levels (16 Tiers)

```
Lv0  Newcomer     0      Lv8  Legend      18,000
Lv1  Bronze       100    Lv9  Mythic      25,000
Lv2  Silver       500    Lv10 Immortal    35,000
Lv3  Gold         1,500  Lv11 Titan       50,000
Lv4  Platinum     3,000  Lv12 Celestial   70,000
Lv5  Diamond      5,000  Lv13 Supreme     100,000
Lv6  Royal        8,000  Lv14 Eternal     150,000
Lv7  Emperor      12,000 Lv15 Infinity    200,000
```

### 4.3 VIP Plans

| Plan | Price | Duration | Daily Coins | Upfront |
|------|-------|----------|-------------|---------|
| Weekly | ₹99 | 7 days | 10/day | 50 |
| Monthly | ₹299 | 30 days | 15/day | 200 |
| Quarterly | ₹699 | 90 days | 20/day | 600 |

### 4.4 Gifts (10 Tiers)

```
🌹 Rose (10)  🍫 Chocolate (20)  🧸 Teddy (50)  🧴 Perfume (100)
💍 Ring (500)  🏎️ Car (2,000)  🏰 Mansion (5,000)  ✈️ Jet (10,000)
👑 Crown (50,000)  🌌 Universe (100,000)
```

---

## 5. Technical Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (React Native)             │
│                                                              │
│  📱 3-Tab Navigation (ForYou / Chat / Me)                    │
│  🔥 TriggerEngine → CooldownManager → SessionBehaviorTracker│
│  📞 IncomingCallScreen → VideoCallScreen (HLS)               │
│  🏪 Zustand stores + MMKV persistence                       │
│  🎨 Reanimated animations + Glass morphism UI                │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS (Axios)
┌──────────────────────┴───────────────────────────────────────┐
│                      SERVER LAYER (Express.js)               │
│                                                              │
│  🤖 AutoReplyEngine    → auto-replies from language pools    │
│  👋 FakeInteractionEngine → registration auto-messages       │
│  💰 MonetizationController → all coin/wealth/VIP logic       │
│  📡 FeedGenerator      → Hot (18 random) / Nearby (25+dist) │
│  🎥 VideoCallService   → trigger, accept, end, history      │
│  💬 ChatService         → inbox, messages, send → auto-reply │
│  🔑 AuthService         → OTP, JWT, refresh, onboarding     │
└──────────────────────┬───────────────────────────────────────┘
                       │ Mongoose
┌──────────────────────┴───────────────────────────────────────┐
│                      DATA LAYER (MongoDB)                    │
│                                                              │
│  18 Collections: User, GirlProfile, ChatSession, ChatMessage,│
│  CallSession, CallVideo, Gift, GiftTransaction, CoinTx,     │
│  AutoReplyPool, DailyCheckin, Relationship, VipPlan,         │
│  VipSubscription, PaymentTransaction, PaymentGateway,        │
│  AppSetting, Admin                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Server Structure (`/Server`)

```
Server/
├── index.js                          # Express init, DB connect, route mounts
└── src/
    ├── config/                       # DB, env, CORS, Cloudinary, Firebase
    ├── engines/                      # Business logic engines
    │   ├── AutoReplyEngine.js        # Picks auto-reply from pool (1-3s delay)
    │   ├── FakeInteractionEngine.js  # Registration messages (5-10 girls)
    │   └── MonetizationController.js # All coin/wealth/VIP/checkin logic
    ├── models/                       # 18 Mongoose schemas
    │   ├── User.js                   # username, coinBalance, wealthLevel, freeCallsRemaining
    │   ├── Girl.js                   # GirlProfile: photos[], charmLevel, firstMessages[]
    │   ├── Message.js                # ChatMessage: nested content {type, text, mediaUrl}
    │   ├── Conversation.js           # ChatSession: isWaitingForUser flag
    │   ├── VideoCallLog.js           # CallSession: triggerType, callType, coinsSpent
    │   ├── GirlVideo.js              # CallVideo: videoUrl, durationSeconds
    │   ├── AutoReplyPool.js          # language + category → messages[]
    │   ├── DailyCheckin.js           # userId + date (compound unique)
    │   ├── Relationship.js           # soulmate/best_friend/lover with coin cost
    │   ├── Gift.js                   # name, emoji, coinCost, level
    │   ├── GiftLog.js                # GiftTransaction: from → to, quantity, totalCoinsSpent
    │   ├── CoinTransaction.js        # type, amount, balanceAfter, referenceId
    │   ├── VipPlan.js                # price, durationDays, dailyCheckinCoins, upfrontCoins
    │   ├── VipSubscription.js        # userId, planId, expiresAt, status
    │   ├── PaymentOrder.js           # purpose, purposeMeta, webhookVerified
    │   ├── PaymentGateway.js         # Razorpay config
    │   ├── AppSetting.js             # App-wide key-value settings
    │   └── Admin.js                  # Admin users with permissions
    ├── controllers/                  # Thin HTTP layer → delegates to services
    │   ├── auth.controller.js        # sendOtp, verifyOtp, onboard, getMe
    │   ├── chat.controller.js        # getInbox, getMessages, sendMessage
    │   ├── videoCall.controller.js   # trigger, acceptCall, endCall, history
    │   ├── coin.controller.js        # getBalance, getTransactions, claimCheckin
    │   ├── gift.controller.js        # getCatalog, sendGift
    │   ├── vip.controller.js         # getPlans, purchase
    │   ├── user.controller.js        # getMe, updateProfile, uploadPhoto
    │   └── admin/                    # Admin-specific controllers
    ├── services/                     # Business logic (no req/res)
    │   ├── auth.service.js           # OTP verification, JWT, user creation
    │   ├── feed.service.js           # Hot (random 18) / Nearby (25 + distance)
    │   ├── chat.service.js           # Inbox enrichment, send → AutoReply
    │   ├── videoCall.service.js      # triggerCall, acceptCall, createCallSession
    │   ├── girl.service.js           # CRUD for girls, videos (admin use)
    │   ├── gift.service.js           # getCatalog, sendGift → MonetizationController
    │   ├── vip.service.js            # purchase, checkExpiry
    │   ├── user.service.js           # getMe, updateProfile, wealthLevels
    │   ├── coin.service.js           # Thin wrapper → MonetizationController
    │   └── payment/                  # Razorpay gateway integration
    ├── routes/                       # Express routing
    │   ├── auth.routes.js            # /api/auth/*
    │   ├── feed.routes.js            # /api/feed/hot, /api/feed/nearby
    │   ├── chat.routes.js            # /api/chat/inbox, /:girlId/messages
    │   ├── videoCall.routes.js       # /api/calls/trigger, /:id/accept
    │   ├── coin.routes.js            # /api/coins/balance, /transactions
    │   ├── gift.routes.js            # /api/gifts/catalog, /send
    │   ├── vip.routes.js             # /api/vip/plans, /purchase
    │   ├── user.routes.js            # /api/users/me
    │   └── admin/                    # /api/admin/*
    ├── middleware/                   # Auth, validation, error handler
    ├── scripts/
    │   └── seed.js                   # Seeds AutoReplyPool, Girls, Gifts, VipPlans
    ├── socket/                       # Socket.IO event handlers
    ├── utils/                        # Errors, response helper, logger, constants
    └── validators/                   # Joi schemas
```

### API Routes Summary

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/send-otp` | Send OTP to phone |
| POST | `/api/auth/verify-otp` | Verify OTP → JWT + triggers FakeInteractionEngine |
| POST | `/api/auth/onboard` | Complete profile (name, age, gender) |
| POST | `/api/auth/refresh-token` | Refresh JWT |
| GET | `/api/feed/hot` | Random 18 profiles |
| GET | `/api/feed/nearby` | 25 profiles with distance |
| GET | `/api/chat/inbox` | Enriched conversation list |
| GET | `/api/chat/:girlId/messages` | Paginated messages (marks as read) |
| POST | `/api/chat/:girlId/send` | Send message → triggers AutoReplyEngine |
| GET | `/api/calls/trigger` | Get random girl + video for incoming call |
| POST | `/api/calls/:id/accept` | Accept call → coin deduction (402 if insufficient) |
| POST | `/api/calls/:id/end` | End call with status |
| GET | `/api/calls/history` | Paginated call log |
| GET | `/api/coins/balance` | Coin + point + wealth level |
| GET | `/api/coins/transactions` | Paginated transaction history |
| POST | `/api/coins/checkin` | Daily check-in claim (VIP bonus) |
| GET | `/api/gifts/catalog` | Active gifts by level |
| POST | `/api/gifts/send` | Send gift → coin deduction |
| GET | `/api/vip/plans` | Available VIP plans |
| POST | `/api/vip/purchase` | Activate VIP + upfront coins |
| GET | `/api/users/me` | User profile |
| PUT | `/api/users/me` | Update profile |
| GET | `/api/users/wealth-levels` | 16-tier wealth level definitions |

---

## 7. Mobile App Structure (`/LuxApp`)

```
LuxApp/
├── App.jsx                           # GestureHandlerRootView + SafeAreaProvider
├── index.js                          # RN entry point
└── src/
    ├── api/
    │   ├── client.js                 # Axios instance, JWT interceptor, auto-refresh
    │   └── services.js               # Per-domain API modules (profilesApi, chatApi, etc.)
    ├── components/
    │   └── ui.jsx                    # MeshBackground, GlowingText, PremiumButton, GlassCard, GlassInput, CircularIconButton
    ├── engines/
    │   ├── TriggerEngine.js          # Call trigger orchestrator (session limits, fire())
    │   ├── CooldownManager.js        # Burst control (5 in 30s → 2-min cooldown)
    │   └── SessionBehaviorTracker.js # Dwell time, idle detection, event tracking
    ├── hooks/
    │   ├── useProfileCallTrigger.js  # 10-15s dwell → fire call
    │   ├── useIdleTrigger.js         # 3-10 min idle → fire call
    │   └── useEventTrigger.js        # Payment exit / decline → fire call
    ├── navigation/
    │   └── AppNavigator.jsx          # AuthStack, OnboardGate, MainTabs (3-tab), AppStack
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.jsx       # Phone input with gradient branding
    │   │   ├── OtpScreen.jsx         # OTP verification with countdown
    │   │   └── OnboardScreen.jsx     # Name + Age + Gender with glass UI
    │   ├── Feed/
    │   │   ├── ForYouScreen.jsx      # Top segmented tabs (Hot/Nearby) + filter icon
    │   │   ├── HotFeed.jsx           # 2-column grid, 18 profiles, gradient overlay
    │   │   ├── NearbyFeed.jsx        # 2-column grid, 25 profiles, distance badge
    │   │   └── FilterSheet.jsx       # Bottom sheet: Region + Language chip selectors
    │   ├── GirlProfile/
    │   │   └── GirlProfileScreen.jsx # Photo carousel, charm badge, bio, gifts, actions
    │   ├── Chat/
    │   │   └── InboxScreen.jsx       # Conversation list with unread badges
    │   ├── Me/
    │   │   └── ProfileScreen.jsx     # TikTok-style: avatar, wealth level, stats, menu
    │   ├── IncomingCall/
    │   │   └── IncomingCallScreen.jsx# Blurred bg, pulse animation, vibration, auto-miss
    │   └── VideoCall/
    │       └── VideoCallScreen.jsx   # HLS video playback, timer, mute/end/gift
    ├── store/
    │   └── authStore.js              # Zustand + MMKV persist (user, tokens, onboard)
    ├── theme/
    │   └── theme.js                  # All design tokens (colors, typography, shadows, spacing, radius)
    └── utils/
        └── storage.js                # MMKV wrapper
```

### Dependencies

| Package | Purpose |
|---------|---------|
| `react-native` 0.85 | Core framework |
| `@react-navigation/native` + `native-stack` + `bottom-tabs` | Navigation |
| `react-native-reanimated` | Animations (pulse, spring, fade) |
| `react-native-gesture-handler` | Touch gestures |
| `react-native-mmkv` | Synchronous local storage |
| `react-native-vector-icons` | Ionicons throughout |
| `react-native-linear-gradient` | Gradient overlays on cards |
| `react-native-video` | HLS video playback in calls |
| `react-native-safe-area-context` | Safe area insets |
| `react-native-screens` | Native screen containers |
| `zustand` | State management |
| `axios` | HTTP client |
| `socket.io-client` | Real-time events |

---

## 8. Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bgPrimary` | `#0A0A0F` | Main background (OLED black) |
| `bgSecondary` | `#12121A` | Cards, tab bar |
| `bgTertiary` | `#1A1A28` | Elevated surfaces |
| `accentMagenta` | `#FF2D78` | Primary CTA, glow effects |
| `accentViolet` | `#8B2FF8` | Secondary accent |
| `accentCyan` | `#00E5FF` | Info, links |
| `accentRed` | `#FF3040` | Destructive, decline |
| `accentGreen` | `#2DFF93` | Success, accept |
| `textPrimary` | `#FFFFFF` | Primary text |
| `textSecondary` | `#A0A0B8` | Secondary text |
| `textMuted` | `#4A4A6A` | Placeholders, labels |
| `borderGlass` | `rgba(255,255,255,0.08)` | Glass card borders |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `fontDisplay` | `sans-serif-condensed` | Headings, display text |
| `fontBody` | `sans-serif` | Body text, labels |
| `sizeDisplay` | 32pt | Screen titles |
| `sizeH1` | 24pt | Section headings |
| `sizeH2` | 18pt | Card titles |
| `sizeBody` | 14pt | Body text |
| `sizeLabel` | 12pt | Labels, captions |

### Shadow System (Glow)

Every accent color has a matching glow shadow for CTAs and active states:
- `glowMagenta`, `glowViolet`, `glowCyan`, `glowRed`, `glowGreen`
- All use `shadowOpacity: 0.6`, `shadowRadius: 12`, `elevation: 8`

### Motion

- **Button press**: Scale to 0.96 with spring damping 15
- **Screen entry**: `FadeInDown.duration(600).springify()`
- **Incoming call**: `withRepeat(withSequence())` pulse on accept button
- **Lists**: Staggered fade-up, zero static loads

---

## 9. Database Schema (18 Collections)

| Collection | Key Fields | Purpose |
|------------|-----------|---------|
| `User` | phone, username, coinBalance, wealthLevel(0-15), freeCallsRemaining, totalCoinsEverSpent, isVip | App user |
| `GirlProfile` | name, age, photos[], charmLevel(Rising/Hot/Goddess), language, firstMessages[], gifts[], distanceKm | Fake girl profile |
| `ChatSession` | userId, girlProfileId, isWaitingForUser, lastGirlMessageAt | Conversation state |
| `ChatMessage` | userId, girlProfileId, senderType(user/auto/admin), content{type,text,mediaUrl} | Individual message |
| `CallSession` | userId, girlProfileId, triggerType, callType(free/paid), status(accepted/declined/missed), coinsSpent | Call record |
| `CallVideo` | girlProfileId, videoUrl, thumbnailUrl, durationSeconds | Pre-recorded HLS video |
| `AutoReplyPool` | language, category(greeting/flirty/curious), messages[] | Reply templates per language |
| `DailyCheckin` | userId, date, coinsAwarded, source(free_login/vip_plan) | One per user per day |
| `Relationship` | userId, girlProfileId, type(soulmate/lover/best_friend), coinCost | Premium relationship |
| `Gift` | name, emoji, coinCost, level, image | Gift catalog |
| `GiftTransaction` | fromUserId, toGirlProfileId, giftId, quantity, totalCoinsSpent | Gift sending log |
| `CoinTransaction` | userId, type, amount, balanceAfter, referenceId, note | Ledger entry |
| `VipPlan` | name, price, durationDays, dailyCheckinCoins, upfrontCoins, badge, perks[] | Subscription plan |
| `VipSubscription` | userId, planId, expiresAt, status, dailyCheckinsClaimed | Active subscription |
| `PaymentTransaction` | userId, gateway, amount, purpose, purposeMeta, status, webhookVerified | Payment record |
| `PaymentGateway` | name, displayName, isEnabled, isDefault, config | Gateway config |
| `AppSetting` | key, value, description | App-wide settings |
| `Admin` | email, passwordHash, role, permissions[] | Admin user |

---

## 10. Setup Guide

### Prerequisites
- **Node.js** ≥ v22.11.0
- **MongoDB** (local or Atlas)
- **Android Studio** (SDK + NDK for mobile builds)
- **Ruby/CocoaPods** (iOS only)

### Server
```bash
cd Server
npm install
cp .env.example .env        # Fill in MONGO_URI, JWT_SECRET, Cloudinary keys
npm run dev                  # Starts on port 5000
node src/scripts/seed.js     # Seeds AutoReplyPool, Girls, Gifts, VipPlans
```

### Mobile App
```bash
cd LuxApp
npm install
npm run start                # Metro bundler
npm run android              # Build + install on device/emulator
```

### Admin Panel
```bash
cd Admin
npm install
cp .env.example .env         # Set VITE_API_URL=http://localhost:5000
npm run dev                   # Vite on port 5173
```

### Environment Variables (Server)

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `CLOUDINARY_URL` | Cloudinary upload URL |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK key (JSON) |

---

## 11. Developer Guidelines

- **No TypeScript** — all files use `.js` / `.jsx`
- **No Redux** — Zustand only for state management
- **Animations** — Reanimated on mobile, GSAP on web admin
- **Colors/fonts** — always from `theme.js`, never hardcoded
- **Business logic** — in services, not controllers
- **Coin operations** — server-side only via MonetizationController
- **Auto-reply** — AutoReplyEngine enforces 1-for-1 message flow
- **API responses** — standardized `{ success, data, message, pagination }`
