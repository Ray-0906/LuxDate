# LuxDate — Agent Guidelines

> Strict rules for every agent working on this codebase.
> Read this BEFORE writing any code.

---

## Project Overview

LuxDate is a **scripted engagement platform** — a dating app where all interactions (calls, messages, feed activity) are server-controlled to drive coin purchases. It is NOT a real P2P dating app.

| Folder | Purpose | Framework |
|--------|---------|-----------|
| `Server/` | REST API + engines | Express.js (Node.js, ES Modules) |
| `Admin/` | Web admin dashboard | React 19 + Vite 8 + Tailwind CSS v4 |
| `LuxApp/` | Android mobile app | React Native 0.85 (Bare CLI, NOT Expo) |

---

## Hard Rules (Non-Negotiable)

### Language
- **NO TypeScript anywhere.** All files: `.js` or `.jsx` only.
- LuxApp was initialized via RN CLI (defaults to TS). All files converted. `tsconfig.json` stays for Metro. No `.ts`/`.tsx` files.

### Imports (LuxApp — CRITICAL)
- **NOT Expo.** This is a bare React Native project.
- Use `react-native-vector-icons/Ionicons`, NOT `@expo/vector-icons`
- Use `react-native-linear-gradient`, NOT `expo-linear-gradient`
- Use `react-native-video`, NOT `expo-av`

### State Management
- **NO Redux.** Use **Zustand** everywhere (Admin + LuxApp).

### Animation
- **Admin (Web):** GSAP for all animations.
- **LuxApp (Mobile):** React Native Reanimated for all animations.

### Architecture
- **Services**: All business logic. Never import `req` or `res`.
- **Controllers**: Thin HTTP layer. Parse request → call service → send response.
- **Models**: Mongoose schemas only. No logic.
- **Engines**: High-level orchestrators (AutoReplyEngine, MonetizationController, TriggerEngine).

### Coin Operations
- **ALL coin deductions are server-side only** via `MonetizationController.deductCoins()`.
- Never trust the client for balance calculations.
- Always return `{ error: true, paywallType }` with HTTP 402 when balance is insufficient.

---

## Server (`Server/`)

### Tech Stack

| Concern | Library |
|---------|---------|
| Framework | Express.js |
| Database | MongoDB + Mongoose (18 collections) |
| Auth | JWT (access 15min + refresh 30d) |
| Real-time | Socket.IO |
| Validation | Joi |
| File Upload | Multer → Cloudinary |
| Logging | Pino |
| Security | Helmet, CORS, express-rate-limit |
| OTP | Firebase Auth (swappable) |
| Payment | Razorpay (strategy pattern) |

### Module Format
- `"type": "module"` — use `import/export` everywhere. No `require()`.

### Directory Layout
```
Server/src/
├── config/          # DB, env, CORS, Cloudinary, Firebase
├── engines/         # AutoReplyEngine, FakeInteractionEngine, MonetizationController
├── models/          # 18 Mongoose schemas (see README for full list)
├── controllers/     # Thin HTTP handlers (delegates to services)
│   └── admin/       # Admin panel controllers
├── services/        # Business logic (no req/res)
│   └── payment/     # Razorpay gateway integration
├── routes/          # Express routing
│   └── admin/       # Admin routes
├── middleware/      # auth, validation, error handler, rate limiter
├── scripts/         # seed.js (data seeding)
├── socket/          # Socket.IO event handlers
├── utils/           # errors, response helper, logger, constants
└── validators/      # Joi schemas
```

### Key Patterns
- Standardized API response: `{ success, data, message, pagination }`
- All async controllers use `try/catch` + `next(error)`
- Constants live in `src/utils/constants.js` — always import from there
- Engines are singletons (AutoReplyEngine, MonetizationController)

### Constants Reference

```js
SENDER_TYPES:    user | auto | admin
MESSAGE_TYPES:   text | photo | call_log
CALL_STATUS:     accepted | declined | missed
TRIGGER_TYPES:   profile_visit | idle | event | background
CALL_TYPES:      free | paid
COIN_TX_TYPES:   purchase | reward | call_deduct | gift_deduct | relationship_deduct | admin_adjust | checkin | refund
PAYMENT_STATUS:  created | success | failed
```

---

## LuxApp (`LuxApp/`)

### Tech Stack

| Concern | Library |
|---------|---------|
| Framework | React Native 0.85 (Bare CLI) |
| Navigation | React Navigation v7 (native-stack + bottom-tabs) |
| State | Zustand + MMKV persist |
| HTTP | Axios with JWT interceptor + auto-refresh |
| Animation | React Native Reanimated |
| Gestures | React Native Gesture Handler |
| Icons | react-native-vector-icons (Ionicons) |
| Gradients | react-native-linear-gradient |
| Video | react-native-video |
| Local Storage | react-native-mmkv |
| Real-time | socket.io-client |

### Directory Layout
```
LuxApp/src/
├── api/             # client.js (Axios), services.js (per-domain API calls)
├── components/      # ui.jsx (MeshBackground, PremiumButton, GlassCard, GlassInput, etc.)
├── engines/         # TriggerEngine, CooldownManager, SessionBehaviorTracker
├── hooks/           # useProfileCallTrigger, useIdleTrigger, useEventTrigger
├── navigation/      # AppNavigator.jsx (AuthStack → OnboardGate → MainTabs → AppStack)
├── screens/
│   ├── auth/        # LoginScreen, OtpScreen, OnboardScreen
│   ├── Feed/        # ForYouScreen, HotFeed, NearbyFeed, FilterSheet
│   ├── GirlProfile/ # GirlProfileScreen
│   ├── Chat/        # InboxScreen
│   ├── Me/          # ProfileScreen
│   ├── IncomingCall/ # IncomingCallScreen
│   └── VideoCall/   # VideoCallScreen
├── store/           # authStore.js (Zustand + MMKV)
├── theme/           # theme.js (colors, typography, shadows, spacing, radius)
└── utils/           # storage.js (MMKV wrapper)
```

### Theming Rules
- **ALL colors/fonts/shadows** from `theme.js`. Never hardcode.
- Use `theme.colors.*`, `theme.typography.*`, `theme.shadow.*`, `theme.spacing.*`, `theme.radius.*`
- Components import from `../theme/theme.js`

### Navigation Flow
```
isAuthenticated?
├── No  → AuthStack (Login → OTP → Onboard)
├── Yes, !name → OnboardScreen
└── Yes, name → AppStack
                  ├── MainTabs (ForYou / Chat / Me)
                  ├── GirlProfile (slide_from_right)
                  ├── IncomingCall (fade, fullScreenModal)
                  └── VideoCall (fade)
```

### UI Component Library (`components/ui.jsx`)
Always use these instead of building custom:
- `MeshBackground` — gradient mesh behind auth screens
- `GlowingText` — text with glow shadow
- `PremiumButton` — spring-animated CTA with glow
- `GlassCard` — dark glass card with hairline border
- `GlassInput` — text input with glass styling
- `CircularIconButton` — round icon button with glow

---

## Admin Panel (`Admin/`)

### Tech Stack

| Concern | Library |
|---------|---------|
| Framework | React 19 (JSX only) |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Routing | React Router v7 |
| HTTP | Axios |
| Animation | GSAP |
| Tables | TanStack Table |
| Charts | Recharts |

### Admin API Routes

| Route | Purpose |
|-------|---------|
| `/api/admin/auth/*` | Admin login/logout |
| `/api/admin/users/*` | List, block, add/deduct coins |
| `/api/admin/girls/*` | CRUD profiles, upload videos |
| `/api/admin/gifts/*` | CRUD gifts, view stats |
| `/api/admin/chat/*` | View inbox, send as girl, manage auto-reply pool |
| `/api/admin/vip/*` | Manage VIP plans |
| `/api/admin/settings/*` | App settings |

---

## Code Quality Checklist

- [ ] No `.ts` / `.tsx` files
- [ ] No Redux imports
- [ ] No `@expo/*` imports in LuxApp
- [ ] No hardcoded colors/fonts in components
- [ ] All coin operations through MonetizationController
- [ ] All API calls through centralized axios instance
- [ ] All business logic in services/engines, not controllers
- [ ] Error responses follow `{ success, data, message }` format
- [ ] Auto-reply enforces 1-for-1 message flow
- [ ] TriggerEngine respects session limits and cooldowns
