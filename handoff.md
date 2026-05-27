# LuxDate Handoff

## Overview
- Repo root contains three main apps:
  - `LuxApp/` = React Native Android client
  - `server/` or `Server/` = Node/Express backend
  - `Admin/` = admin panel
- The recent work focused on:
  - self-profile editing for the logged-in user
  - onboarding photo + city support
  - admin-controlled runtime branding and call pricing
  - Android permission handling for camera, photos/files, and microphone
  - tightening call-entry permission checks so call screens do not open before permissions are granted

## Current Product State

### Mobile App
- `LuxApp/App.jsx`
  - bootstraps remote app settings through `useAppSettingsStore`
  - refreshes Android permission state on launch and resume
  - after the user is both authenticated and onboarded, requests missing Android permissions in sequence using native system dialogs
  - no custom permission gate UI is shown anymore

- `LuxApp/src/store/appSettingsStore.js`
  - caches public app settings in MMKV
  - default branding fallback is `LuxDate`
  - default call rates fallback to non-VIP `10`, VIP `7`

- `LuxApp/src/store/permissionStore.js`
  - shared Android permission logic
  - normalized permission keys:
    - `photos`
    - `camera`
    - `microphone`
  - Android version handling:
    - Android 13+ uses `READ_MEDIA_IMAGES`
    - Android 12 and below use `READ_EXTERNAL_STORAGE`
  - status values:
    - `granted`
    - `denied`
    - `blocked` (`NEVER_ASK_AGAIN`)
  - helper methods:
    - `refreshStatuses()`
    - `requestPermission(key)`
    - `requestPermissions(keys)`
    - `openAppSettings()`

### Server
- App settings are now structured, not just generic key/value in practice.
- Public app settings endpoint exists:
  - `GET /api/app/settings`
- Runtime settings currently include:
  - `branding.appName`
  - `branding.appLogoUrl`
  - `branding.revision`
  - `calls.nonVipRate`
  - `calls.vipRate`
  - `calls.minCoinsForCall`

### Admin Panel
- Admin settings page was upgraded from a raw form-first screen into grouped sections:
  - Call Pricing
  - Branding
  - advanced raw settings retained below

## Major Completed Changes

### 1. Self Profile Editor
- A dedicated self-profile editor was added for the logged-in user.
- Main entry:
  - `LuxApp/src/screens/Me/ProfileScreen.jsx`
- New screen:
  - `LuxApp/src/screens/Me/EditProfileScreen.jsx`
- Supports:
  - read-only view mode and edit mode
  - profile photo replacement
  - editing name, username, age, gender, bio, language, location
  - save/cancel behavior
  - unsaved-change navigation guard

### 2. Onboarding Improvements
- `LuxApp/src/screens/auth/OnboardScreen.jsx`
- Added:
  - profile photo selection during onboarding
  - city input stored as `location`
- After onboarding:
  - selected photo uploads through user photo upload endpoint
  - profile refreshes locally after upload

### 3. Runtime Branding + Call Pricing

#### Backend
- `server/src/services/appSetting.service.js`
  - seeds defaults for:
    - `call_cost_per_minute_non_vip`
    - `call_cost_per_minute_vip`
    - `app_name`
    - `app_logo_url`
    - `app_branding_revision`
  - exposes:
    - `getCallPricingSettings()`
    - `getCallCostPerMinuteForUser(user)`
    - `getPublicAppSettingsPayload()`

- `server/src/controllers/app.controller.js`
- `server/src/routes/app.routes.js`
- `server/index.js`
  - wire public app settings route under `/api/app`

- `server/src/controllers/coin.controller.js`
  - economy payload now returns effective per-user call pricing plus VIP/non-VIP rates

- `server/src/services/videoCall.service.js`
  - call pricing now comes from app settings rather than hardcoded `10`

#### Admin
- `Admin/src/pages/SettingsPage.jsx`
  - grouped app settings UI
  - branding preview
  - logo URL + logo upload flow
  - VIP/non-VIP per-minute rate configuration

- `Admin/src/api/services.js`
  - added helpers for:
    - saving app settings
    - saving branding
    - uploading branding logo

#### Mobile
- `LuxApp/src/components/BrandMark.jsx`
  - reusable runtime branding component

- Brand usage updated in:
  - `LuxApp/src/screens/auth/LoginScreen.jsx`
  - `LuxApp/src/screens/auth/OnboardScreen.jsx`
  - `LuxApp/src/screens/Feed/ForYouScreen.jsx`

- Pricing fallback alignment updated in:
  - `LuxApp/src/screens/Me/WalletScreen.jsx`
  - `LuxApp/src/screens/VideoCall/VideoCallScreen.jsx`

## Android Permission Work

### Desired UX Now
- No custom permission page
- Native Android permission popups only
- Prompts happen after login/onboarding, not on the very first unauthenticated splash/login experience
- If permissions are already granted, no prompt appears
- If a permission is denied normally, the app may prompt again later through the Android dialog
- If a permission is permanently blocked (`Don't ask again`), the app can only explain and send the user to Android settings

### Current Permission Flow
- `LuxApp/App.jsx`
  - after user is authenticated and onboarded:
    - refresh permission statuses
    - request any currently `denied` permissions sequentially
  - on resume:
    - refreshes permission statuses
    - may request denied ones again

- Feature-level checks remain in place:
  - chat attachments / gallery / camera:
    - `LuxApp/src/screens/Chat/ConversationScreen.jsx`
  - onboarding photo:
    - `LuxApp/src/screens/auth/OnboardScreen.jsx`
  - self-profile photo:
    - `LuxApp/src/screens/Me/EditProfileScreen.jsx`
  - incoming call accept:
    - `LuxApp/src/screens/IncomingCall/IncomingCallScreen.jsx`
  - outgoing call connect:
    - `LuxApp/src/screens/OutgoingCall/OutgoingCallScreen.jsx`
  - in-call local preview:
    - `LuxApp/src/screens/VideoCall/VideoCallScreen.jsx`

### Important Call Permission Behavior
- This was a major recent fix.
- Problem before:
  - tapping call from profile/chat still opened `OutgoingCall` first
  - then permissions were checked inside the connecting screen
- Current fix:
  - permission checks now happen before navigation to `OutgoingCall`
  - if camera or mic is missing:
    - button tap is discarded
    - user gets permission request / explanatory alert
    - call screen does not open

- Files changed for that:
  - `LuxApp/src/screens/GirlProfile/GirlProfileScreen.jsx`
  - `LuxApp/src/screens/Chat/ConversationScreen.jsx`

- Secondary safety nets still exist inside:
  - `LuxApp/src/screens/OutgoingCall/OutgoingCallScreen.jsx`
  - `LuxApp/src/screens/IncomingCall/IncomingCallScreen.jsx`

## Important Current Files

### Mobile
- `LuxApp/App.jsx`
- `LuxApp/src/store/appSettingsStore.js`
- `LuxApp/src/store/permissionStore.js`
- `LuxApp/src/components/BrandMark.jsx`
- `LuxApp/src/screens/auth/OnboardScreen.jsx`
- `LuxApp/src/screens/Me/EditProfileScreen.jsx`
- `LuxApp/src/screens/Me/ProfileScreen.jsx`
- `LuxApp/src/screens/Feed/ForYouScreen.jsx`
- `LuxApp/src/screens/Chat/ConversationScreen.jsx`
- `LuxApp/src/screens/GirlProfile/GirlProfileScreen.jsx`
- `LuxApp/src/screens/IncomingCall/IncomingCallScreen.jsx`
- `LuxApp/src/screens/OutgoingCall/OutgoingCallScreen.jsx`
- `LuxApp/src/screens/VideoCall/VideoCallScreen.jsx`

### Server
- `server/src/services/appSetting.service.js`
- `server/src/controllers/app.controller.js`
- `server/src/routes/app.routes.js`
- `server/src/controllers/coin.controller.js`
- `server/src/services/videoCall.service.js`
- `server/src/controllers/admin/adminSettings.controller.js`
- `server/src/routes/admin/admin.settings.routes.js`

### Admin
- `Admin/src/pages/SettingsPage.jsx`
- `Admin/src/api/services.js`

## Known Caveats / Open Edges
- `permissionStore.js` still contains `sessionDismissed`, `dismissForSession`, and `resetSessionDismissal` from the earlier custom permission UI approach. Those are currently unused and could be cleaned up later.
- If the user selects Android `Don't ask again`, native prompts cannot reappear. The app falls back to alerts that direct the user to Settings. That is expected Android behavior.
- There are existing lint warnings across the repo, mostly inline-style warnings and some older unused variables. The recent work was kept at `0 lint errors`, but not warning-free.
- There may be path casing inconsistency in references between `server/` and `Server/` depending on local environment. The actual workspace used here contains both path styles in conversation history; use the real on-disk path in the current machine/session.

## Verification History
- Targeted `eslint` runs reached `0 errors` after the recent permission and call-flow fixes.
- Remaining lint output is the repo’s pre-existing warning set, not new blocking errors.
- `git diff --check` typically only reported CRLF/LF warnings in this Windows workspace.

## Suggested Next Steps for the Next Agent
- Clean up unused permission store state left over from the removed custom permission gate.
- Do an actual device/emulator verification pass for:
  - fresh install
  - post-login/post-onboarding permission prompts
  - denied permissions
  - blocked permissions
  - outgoing call button from girl profile
  - outgoing call button from conversation
  - incoming call accept with missing permissions
  - photo picking in onboarding, edit profile, and chat
- If the user wants more premium UX, consider replacing alert copy with a more polished but minimal native-feeling explanation strategy only where Android blocks re-prompting.

## Quick Mental Model for the Next Agent
- Branding and call pricing are now runtime-configurable from backend/admin.
- The app consumes those settings on launch.
- Permissions are Android-native and shared through `permissionStore`.
- Call buttons should never navigate to connecting screens before camera/mic access is validated.
- Media/file entry should always check permission before opening picker/camera/recent gallery.
