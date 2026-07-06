@AGENTS.md

# StayLoop — Backend State & Handoff Doc

**Purpose of this file:** This is the complete, current source of truth for StayLoop's Supabase backend and Next.js frontend, written for a Claude Code session picking up the project in VS Code. It covers what's been decided, what's built, what's verified working, and what's explicitly still pending — especially around auth, the user dashboard, and admin functionality, which haven't been built yet.

**Read this whole file before writing code.** Several decisions here (verification being optional, OTP being deferred, the photo RLS gap that was fixed) are easy to silently reintroduce if you're working from the original spec doc instead of this one.

---

## 1. Product Summary

StayLoop is a home-swapping platform, **Sri Lanka only at launch**, with two ways to book a stay:

1. **Reciprocal swap** — two members trade homes.
2. **Loops (points)** — host a guest to earn Loops, spend Loops to stay anywhere with no return swap.

Tech stack: Next.js (App Router, TypeScript, Tailwind v4) + Supabase (Postgres, PostGIS, Auth, Storage, Realtime) + Google Maps/Places (frontend-driven) + PayHere (LKR payments, **not yet built**).

---

## 2. Two Deliberate Deviations From the Original Spec

The original backend spec (written earlier in this project) assumed mandatory ID verification and no subscription model. Both were changed early and **the live schema reflects the changes**:

### 2.1 ID verification is optional, not a gate
- `verifications` table and `profiles.is_verified` / `verification_status` still exist — the badge and admin review queue are still real features.
- Nothing in `request_swap()` or anywhere else currently blocks an action based on verification status.
- Gating is wired through a **feature flag**, not hardcoded: `app_config.require_verification` (boolean, currently `false`).
- To turn the gate on later: `update app_config set value = 'true' where key = 'require_verification';` — no code changes needed, `request_swap()` already reads this flag.

### 2.2 Subscription/membership plans exist as a parallel system
- New tables not in the original spec: `subscription_plans`, `subscriptions`.
- `has_active_subscription(uuid)` SQL function checks active/trialing status.
- Gated the same way: `app_config.require_membership` (boolean, currently `false`).
- `request_swap()` already checks this flag too.
- Two seed plans exist: `free` (0 LKR) and `plus` (990 LKR/month, grants 100 Loops).
- **PayHere integration for subscriptions is not built** (see §6).

**Why this matters for you:** if you're asked to add a "Become a member" or "Verify your ID" flow, check `app_config` first — these features should *offer* verification/membership without *requiring* either, unless the client has explicitly confirmed otherwise and the flags get flipped.

---

## 3. Current Database Schema (verified, as actually run in Supabase)

This is the live schema, confirmed directly from a `pg_dump`-style export the user pulled from their own Supabase project — not just what was originally proposed. Treat this section as ground truth over anything else in this document if they ever conflict.

### Tables that exist and are RLS-enabled:

| Table | Purpose | Key notes |
|---|---|---|
| `spatial_ref_sys` | PostGIS system table | Don't touch |
| `app_config` | Feature flags (`require_verification`, `require_membership`, `welcome_bonus_loops`, `price_band_pct`) | Public read |
| `countries` | Country expansion config | Only `LK` is `is_active = true` |
| `location_tiers` | Region → tourist tier mapping for valuation | Seeded for ~12 SL regions |
| `profiles` | User profile, 1:1 with `auth.users` | `is_verified`, `verification_status`, `is_admin` are server-only columns (revoked from client write) |
| `subscription_plans` | Plan catalog | Seeded: `free`, `plus` |
| `subscriptions` | User → plan mapping | `payhere_subscription_id` column exists but unused (no PayHere yet) |
| `listings` | Property listings | `geo` is `geography(point,4326)` — **cannot be written via plain client insert**, must use `set_listing_location()` RPC |
| `listing_amenities` | Listing → amenity tags | |
| `listing_photos` | Listing → storage path | See §4 for the RLS fix applied here |
| `listing_availability` | Date-level blocking | Populated automatically by `transition_swap()` on `confirm` |
| `valuation_weights` | Tunable Loops pricing config | Seeded with base/tier/capacity/amenity weights |
| `loop_transactions` | **Append-only** Loops ledger | No client INSERT policy at all — only `SECURITY DEFINER` functions write here |
| `swaps` | Swap/booking records | No client INSERT/UPDATE policy — only RPCs mutate |
| `conversations`, `conversation_participants`, `messages` | Encrypted messaging | `messages` has **no direct SELECT/INSERT policy** — all access via `send_message()` / `read_messages()` RPCs |
| `verifications` | Optional ID review queue | User can insert own pending doc; only `review_verification()` (admin-only) can approve/reject |
| `reviews` | Post-swap reviews | Insert only allowed if swap is `completed` and reviewer was a party |
| `notifications` | In-app notifications | |
| `payments` | PayHere payment records | Table exists, **nothing currently writes to it** — webhook not built |

### SQL Functions (all `SECURITY DEFINER`, all already deployed):

| Function | Does | Callable by |
|---|---|---|
| `get_available_balance(uuid)` | Computes Loops balance from ledger | `authenticated` |
| `has_active_subscription(uuid)` | Checks active subscription | `authenticated` |
| `award_welcome_bonus(uuid)` | Mints +500 Loops, idempotent | Internal (triggered) |
| `compute_listing_value(uuid)` | Runs valuation algorithm, sets `base_loops_per_night` | `authenticated`, owner-only |
| `set_listing_price(uuid, int)` | Validates host price within band, writes `loops_per_night` | `authenticated`, owner-only |
| `set_listing_location(uuid, lat, lng, place_id, address, region, country)` | **Writes the PostGIS `geo` point** — required because `geography` can't be set via a plain client insert | `authenticated`, owner-only |
| `search_listings(lat, lng, radius_km, limit)` | Radius search via `ST_DWithin`, returns rounded (~100m) coords for privacy | `authenticated` + `anon` |
| `request_swap(...)` | Creates swap, places Loops hold if applicable, checks `require_verification`/`require_membership` flags | `authenticated` |
| `transition_swap(uuid, action)` | State machine: accept/decline/confirm/cancel/complete | `authenticated`, party-only |
| `review_verification(uuid, approve, reason)` | Admin approve/reject, flips `profiles.is_verified` | `authenticated`, **admin-only** (checks `profiles.is_admin`) |
| `start_conversation(listing_id, other_user_id)` | Creates or reuses a conversation | `authenticated` |
| `send_message(conversation_id, body)` | Encrypts via Vault key, inserts, broadcasts via Realtime | `authenticated`, participant-only |
| `read_messages(conversation_id, limit, before)` | Decrypts and returns messages | `authenticated`, participant-only |
| `process_swap_schedule()` | Cron job (hourly via `pg_cron`): flips `confirmed`→`active`→`completed` based on dates | System (pg_cron) |

### Storage buckets:

| Bucket | Public? | Notes |
|---|---|---|
| `listing-photos` | **Currently private** — needs to be made public (see §6, unresolved item) | Path convention: `{auth.uid}/{listing_id}/{file}` |
| `verification-docs` | Private, correctly so | Only owner can upload; admin reads via signed URL (signed-URL minting function **not yet built**) |

### Encryption:
- `messages.body_ciphertext` uses `pgp_sym_encrypt`/`pgp_sym_decrypt` with a key stored in Supabase Vault under the name `message_enc_key`.
- **You must confirm this secret was actually created** in the target Supabase project: `select vault.create_secret('...', 'message_enc_key');` — if missing, `send_message()`/`read_messages()` will fail.

---

## 4. A Bug That Was Found and Fixed — Know This Pattern

When image upload for listings was reviewed, we found the storage bucket policy correctly restricted file uploads to `{auth.uid}/...` paths, but **nothing stopped a user from inserting a `listing_photos` row pointing at a listing they don't own**, even though they couldn't upload the actual file there. The storage layer and the database layer were checked independently and the database layer had a gap.

Fix applied:
```sql
create policy "photos insert owner only" on listing_photos for insert to authenticated
  with check (
    owns_listing(listing_id)
    and (storage.foldername(storage_path))[1] = auth.uid()::text
  );

create policy "photos delete owner only" on listing_photos for delete to authenticated
  using (owns_listing(listing_id));
```

**Lesson for future work:** any time a table's only real protection is "the storage bucket enforces this," check whether the table itself also enforces it. This pattern (storage policy ≠ table policy) is worth re-auditing for any new upload feature.

---

## 5. Frontend — What's Built

### Project setup (done):
- `create-next-app` with TypeScript, Tailwind, ESLint, App Router, `src/` dir, `@/*` import alias.
- `@supabase/ssr` (not the deprecated auth-helpers) — three files:
  - `src/lib/supabase/client.ts` — browser client
  - `src/lib/supabase/server.ts` — server client (Server Components/Actions)
  - `src/middleware.ts` — refreshes session on every request
- `@googlemaps/js-api-loader` installed for Places Autocomplete + the browse-page map.
- `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`.

### Design system (done, and this matters — read it):
The user has a **Lovable-generated `globals.css`** using Tailwind v4's CSS-native `@theme inline` token system (no `tailwind.config.*` file — v4 doesn't use one for this). All custom components must use these semantic tokens, never raw hex or `gray-*`/`black` Tailwind defaults:

| Token | Use for |
|---|---|
| `bg-primary` / `text-primary` | Brand green (`#00C566`-ish, actual value is oklch) |
| `text-primary-foreground` | White text on a green background |
| `bg-accent` / `text-accent` | Deeper green (links like "See all homes") |
| `bg-secondary` / `bg-mint` | Soft mint backgrounds (badges) |
| `bg-foreground` / `text-background` | Near-black / white — used for the dark trust-strip card |
| `text-muted-foreground` | Gray body copy |
| `border-border` | All borders |
| `rounded-2xl`, `rounded-3xl` | Card radii (from `--radius: 1rem` base) |

**A real bug was hit and resolved here:** after pasting in the new `globals.css`, the UI didn't visually update at all. Root cause was a **stale `.next` build cache combined with browser cache** — confirmed by devtools showing an old `background: var(--background)` rule (shorthand, no `color-` prefix) when the actual file on disk had `background-color: var(--color-background)`. Fix: `rm -rf .next` + hard browser refresh. **If styling changes ever appear to silently not apply again, this is the first thing to check** — don't assume the CSS itself is wrong before ruling out cache.

### Homepage sections built so far, in order, each pixel-matched against Lovable-exported screenshots:

1. **`NavBar.tsx`** — logo, center nav links (Browse homes / How Loops work / Dashboard / Inbox — these are **links only, not yet functional pages** for Dashboard/Inbox), search button (non-functional, decorative for now), "List your home" black pill button (links to `/host/new`, **page doesn't exist yet**).
2. **`Hero.tsx`** + **`HeroSearch.tsx`** — headline, hardcoded photo collage (real `/public/hero/*.jpg` images still need to be dropped in by the user), and a **functional** search card:
   - Reads region suggestions live from `location_tiers`.
   - Swap/Loops mode toggle.
   - On submit, redirects to `/browse?mode=...&region=...&check_in=...&check_out=...`.
   - **Known limitation, flagged at the time:** region text is resolved via a simple `ilike` lookup against `location_tiers`, not real geocoding — good enough for "does this region exist," not for lat/lng.
3. **`HowItWorks.tsx`** — fully static, 3-step explainer, no data.
4. **`FeaturedHomes.tsx`** — **fully functional**, Server Component, single Supabase query with joins (`listings` + `profiles` via `owner_id` + `listing_photos`), shows top 6 live listings, has a real empty state ("No homes listed yet" + CTA to `/host/new`). Cover photo logic sorts `listing_photos` by `sort_order` and takes the first.
5. **`TrustStrip.tsx`** — static, dark card, 3 pillars. **Originally said "Verified IDs" — deliberately changed to "Loops-backed trust"** (the ledger/hold mechanism) since ID verification is optional and a hard claim like "Verified IDs" would be dishonest given §2.1. This is a recurring pattern — watch for other marketing copy that assumes mandatory verification.
6. **`LoopsSystem.tsx`** — static, "How Loops work" explainer section. Originally had international-travel wording ("travel anywhere," "any other member's home" with no geographic qualifier) — **deliberately localized to Sri Lanka** per explicit user instruction, since the platform is SL-only at launch. Also had its "verify your ID" mention removed for the same reason as TrustStrip. The Loops-per-night range shown (~150–250) was adjusted to match the actual `valuation_weights` clamp range `[80, 320]` rather than copying the original mockup's number verbatim.
7. **`/browse` page** (`page.tsx` + `BrowseClient.tsx` + `BrowseMap.tsx`) — **fully functional**, the most complex piece built so far:
   - Live debounced search (400ms) against `listings`, filtering by `region_name`/`title` via `ilike`.
   - All/Swap/Loops mode filter using real `open_to_swap`/`open_to_loops` columns.
   - Bedroom range filter (`bedrooms gte`).
   - Real Google Maps (`@googlemaps/js-api-loader`, `AdvancedMarkerElement`) centered on Sri Lanka, with clickable custom price-bubble pins that route to `/listings/[id]`.
   - Empty state for no results.
   - **Unresolved/flagged risk:** the `geo` column comes back from PostgREST as GeoJSON (`{ coordinates: [lng, lat] }`) in the current code, but this **was never actually confirmed against the live API response** — if it comes back as a WKB hex string instead (version-dependent), the lat/lng extraction breaks silently. **This needs verification before relying on `BrowseMap` rendering correctly.** If it's wrong, the fix is a dedicated `browse_listings` RPC that returns plain `lat`/`lng` floats instead of raw `geo`.
   - **Also unresolved:** `BrowseMap.tsx` uses a placeholder `mapId: 'STAYLOOP_BROWSE_MAP'` — a real Map ID must be created in Google Cloud Console (Maps Platform → Map Management) for Advanced Markers to work at all.

### Explicitly NOT built yet (anywhere in the frontend):
- `/listings/[id]` — individual listing detail page (linked to from cards, **does not exist**)
- `/host/new` — create-listing flow (linked to from nav + empty states, **does not exist**)
- **Any authentication UI** — no login, no signup, no session-aware UI anywhere
- **`/dashboard`** — linked in nav, page does not exist
- **`/inbox`** — linked in nav, page does not exist
- Admin panel / admin views of any kind
- PayHere checkout flow

---

## 6. Explicitly Deferred / Unresolved Items

These were discussed and consciously deferred — don't treat their absence as an oversight:

1. **Phone OTP is deferred.** Email/password auth should be used for now (Supabase default, no extra config). Phone OTP will be added later as an *additional* sign-in method — `signInWithOtp({ phone })` — without restructuring existing auth. When it's added:
   - Use **Supabase test phone numbers** (Authentication → Phone, fixed test number + canned code) during development — genuinely free, no SMS sent.
   - For real delivery, avoid Twilio with a US long code into Sri Lanka — this caused real carrier-filtering problems on a related project (TWWC/Pearmo). Recommended path: a Sri Lankan SMS gateway (text.lk or send.lk, both have free trial credit and free alphanumeric sender ID registration) wired in via Supabase's **Send SMS Auth Hook** (a small Edge Function that forwards to the gateway's API instead of using a native Supabase provider).
   - Register the sender ID early — approval can take 1-2 days.
   - Keep OTP expiry low (Supabase recommends ≤3600s) and leave the default 60-second resend throttle on.

2. **PayHere is fully deferred.** The `payments` table exists but nothing writes to it. The webhook Edge Function (signature verification + crediting `loop_transactions` or `subscriptions`) was drafted in conversation but **never deployed** — confirmed explicitly as out of scope until the client confirms PayHere as the payment provider. The database is 100% functional without it; only `loops_topup` and `membership` purchase flows are blocked, and both are already gated off via `app_config` flags anyway.

3. **`listing-photos` bucket visibility is unresolved.** It was set up as **private** per the original spec's security posture, but the `FeaturedHomes`/`BrowseClient` components call `.getPublicUrl()` on it, which **will return broken/404 links on a private bucket.** This was explicitly flagged as needing a decision: either (a) make `listing-photos` public and keep only `verification-docs` private, or (b) switch all photo-fetching code to `createSignedUrl()` with async per-photo signing. **No decision was made yet — resolve this before testing image rendering.**

4. **`next.config.ts` image domain allow-list** — `<Image>` from `next/image` will refuse to load Supabase storage URLs until the project's storage domain is added to `remotePatterns`. This was mentioned but the user hasn't confirmed it's been added.

5. **Admin signed-URL function** (`get_signed_doc_url` from the original spec) for verification document review — was named in the original architecture doc but **never actually implemented** as a deployed function. Needed before any admin verification-review UI can work.

---

## 7. What This Handoff Is Actually For

The user is moving into building **authentication, the user dashboard, and admin functionality** next — explicitly called out as "a bit tricky" — using Claude Code in VS Code instead of this chat interface. Concretely, that means the next phase of work is:

- **Auth UI**: sign-up/login pages (email/password first, per §6.1), session handling across the App Router (middleware is already in place — build on it, don't replace it), protected routes.
- **User dashboard** (`/dashboard`): likely needs to surface — owned listings (with edit/status toggle), Loops balance (`get_available_balance()`), active/past swaps (`swaps` where `auth.uid() in (guest_id, host_id)`), and a way to initiate `set_listing_location()` / `compute_listing_value()` / `set_listing_price()` for a new listing, since none of that has a UI yet despite the RPCs existing.
- **Inbox** (`/inbox`): list of `conversations` the user participates in, wired to `start_conversation()` / `send_message()` / `read_messages()`, plus Realtime subscription via the private broadcast channel (`conversation:{id}`) already set up in the policy.
- **Admin panel**: needs an `is_admin`-gated route, a verification review queue UI calling `review_verification()`, and — per §6.5 — the signed-URL minting function still needs to be written since it doesn't exist yet.

None of these have any frontend code yet. The database-side RPCs for swaps/messaging/verification already exist and are deployed — the gap is entirely on the Next.js side, plus the two small backend gaps in §6.3–6.5.

---

## 8. Quick Reference — Things Most Likely to Bite You

- `geo` writes **must** go through `set_listing_location()`, never a plain `.insert()`/`.update()` with lat/lng fields.
- `messages` has zero direct table access — everything goes through `send_message()`/`read_messages()`. Don't try to `.select()` the table directly, it'll return nothing even for participants.
- `is_verified`, `verification_status`, `is_admin`, `base_loops_per_night`, `avg_rating` are all revoked from client write — don't add UI that tries to update them directly, route through the relevant RPC or expect it to silently fail.
- `swaps.status` and `loop_transactions` have no client write policy at all — every state change goes through `transition_swap()` / `request_swap()`.
- Verify the `message_enc_key` Vault secret exists in whichever Supabase project you're pointed at before testing messaging — easy to forget since it's a manual one-time `select vault.create_secret(...)` call, not part of the migration files.
- Tailwind v4 here has no config file — theme changes happen in `src/app/globals.css` only. If a styling change seems to do nothing, check `.next` cache before assuming the CSS is wrong.