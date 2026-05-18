# Relationship Rollout Notes

## Phase 1
- Canonical relationship type key: `close_friend`.
- Backward compatibility for existing data:
  - server maps legacy `best_friend` values to `close_friend` in read logic.
  - `getTypeCondition()` accepts both values during transition.

## Migration Guidance
Run a one-time migration to normalize old rows:

1. Update relationship rows where `type === "best_friend"` to `type = "close_friend"`.
2. Update relationship rows where `status === "active"` to `status = "accepted"`.
3. Verify partial unique index on `(userId, type)` for active statuses does not fail.

## Monitoring During Rollout
- Track 402 invite responses for insufficient-coin conversion behavior.
- Track 409 conflict responses for one-slot rule and switch prompts.
- Track accept API calls where due time has already passed (app reopen catch-up path).
- Track relationship-event chat message counts (accepted vs ended).

## Phase 2 Upgrade Path
- Move pending acceptance and anniversary nudge scheduling to server-authoritative jobs.
- Introduce server-delivery flags/fields for anniversary notification tracking when implemented.
