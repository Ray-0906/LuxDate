# Relationship QA Checklist

## Scope
- Phase 1 relationship feature rollout (`close_friend`, `lover`, `soulmate`)
- Client-driven acceptance timer with server acceptance API
- Private-view behavior per user

## Core Girl Profile Flows
- Open a girl's profile and verify 3 connection rows are visible with costs for empty slots.
- Tap an empty slot and verify confirm sheet shows:
  - type/icon
  - cost
  - balance
  - after-balance
- Confirm request and verify:
  - coins deduct
  - slot switches to pending
  - app state persists pending when navigating away and back

## One-Slot Rule / Switch
- Create an active bond of a type with Girl A.
- Open Girl B and tap same type:
  - switch warning appears
  - Keep Current keeps original bond
  - End & Switch breaks old bond then creates new pending request
- Verify old bond is ended without refund.

## Break Behavior
- Break a pending relationship:
  - slot clears
  - no break card in chat history
- Break an accepted relationship:
  - slot clears
  - break card appears in chat history

## Top-Up Flow
- Attempt relationship invite with insufficient coins:
  - insufficient modal opens
  - top-up sheet opens
  - after purchase, invite retries automatically
  - slot reflects pending state after successful retry

## Acceptance Timer and Notifications
- Keep app open: pending relationship auto-accepts at due time and shows notification.
- Close app before due time, reopen after due:
  - catch-up accept runs
  - accepted state appears
  - notification/deeplink behavior still works
- Tap notification:
  - app opens target girl's profile

## Me Tab Connections
- Verify My Connections section renders all 3 slots.
- For active/pending slots:
  - girl name and status shown
  - break action available
- For empty slots:
  - soft CTA copy shown
  - tapping row navigates user toward discovery

## Gift Tie-In
- Send gift without accepted relationship:
  - default gift copy appears
- Send gift with accepted relationship:
  - relationship-aware copy appears with correct icon/label:
    - close_friend: 👫
    - lover: ❤️
    - soulmate: 💫

## Privacy Contract
- User A creates relationship with Girl X.
- User B opens same Girl X:
  - User B must see empty slot for that type.
  - No trace of User A state is visible.

## Regression Checks
- Existing gift send flow still works in chat and profile.
- Existing VIP check-in and payment flows unaffected.
- Push/local notification behavior for chat remains normal.
