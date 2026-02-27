# 2026-02-27 Twitter Real Feed Design (Strict X API, No Fallback)

## 1. Scope and Product Goal

This design defines the final target for FokusFeed feed experience:

1. Twitter/X OAuth 2.0 PKCE authentication is mandatory.
2. Feed data source is only official X API.
3. Demo content, deterministic feed fallback, and RSS fallback are removed from runtime feed path.
4. Feed cards must render as real tweet-like cards:
   - author (name, username, avatar, verified)
   - tweet text
   - media (image/video)
   - links (expanded URL preview)
   - timestamp and engagement metrics
5. If X API data cannot be served, app must hard-block feed with actionable error screen.

## 2. Final Decisions (Approved)

1. Data source strategy: `Only X API` (no RSS/data fallback in feed path).
2. Outage behavior: `Hard block` (do not silently show empty/demo fallback data).
3. Architecture strategy: `API + DB normalize + tweet-card UI`.
4. UX target: close to tweet consumption model, not generic article cards.

## 3. Architecture

## 3.1 Ingestion

1. OAuth callback stores encrypted token set.
2. Initial sync runs after successful connect.
3. Refresh endpoint triggers sync on demand.
4. Sync fetches:
   - user identity
   - timeline tweets
   - media expansions
   - URL entities
5. Data is normalized and upserted into DB.

## 3.2 Read Path

1. `GET /v1/feed` reads only normalized DB records.
2. No direct demo fixture injection in feed route.
3. No deterministic fallback replacement for feed items.
4. If source unavailable, API returns strict error code.

## 4. Data Model

Required tables:

1. `twitter_tokens_encrypted`
   - tenant_id, user_id
   - access_token_ciphertext, refresh_token_ciphertext
   - scopes, expires_at, updated_at
   - last_error_code, last_error_at
2. `twitter_accounts`
   - x_user_id (unique), name, username, avatar_url, verified
3. `twitter_posts`
   - x_tweet_id (unique), author_x_user_id
   - text, created_at
   - like_count, repost_count, reply_count, quote_count
   - permalink, lang
4. `twitter_post_media`
   - x_media_key, x_tweet_id
   - type, media_url, preview_image_url, width, height, duration_ms
5. `twitter_post_links`
   - x_tweet_id
   - url, expanded_url, display_url, title, domain
6. `twitter_user_feed_map`
   - tenant_id, user_id, x_tweet_id
   - rank_score, category, inserted_at

## 5. API Contract

## 5.1 Feed

`GET /v1/feed?mode=digest|live&cursor&limit`

Success shape:

1. `items[]` with fields:
   - `tweetId`
   - `author { id, name, username, avatarUrl, verified }`
   - `text`
   - `media[]`
   - `links[]`
   - `metrics { like, repost, reply, quote }`
   - `createdAt`
   - `permalink`
   - `category`
   - `rankScore`

Errors:

1. `TWITTER_CONNECTION_REQUIRED`
2. `TWITTER_SCOPE_MISSING`
3. `TWITTER_RATE_LIMITED`
4. `TWITTER_TOKEN_EXPIRED`
5. `TWITTER_FEED_UNAVAILABLE`

## 5.2 Refresh

`POST /v1/feed/refresh`

1. Triggers real X sync.
2. Returns sync status.
3. Uses same strict error codes.

## 5.3 Status

`GET /v1/profile/twitter/status`

1. `connected`
2. `lastSyncAt`
3. `lastErrorCode`
4. `lastErrorAt`
5. `scopes`

## 6. UI Design Constraints

1. Remove all demo cards from digest/live screens.
2. Use API-driven cards only.
3. Tweet card composition:
   - top row: avatar + name + username + verified + timestamp
   - body: text
   - media block (if present)
   - link preview cards (if present)
   - footer metrics and open-on-X action
4. Hard-block screen when feed unavailable:
   - clear title + reason
   - `Retry` button
   - `Reconnect Twitter` button

## 7. Non-Goals (for this slice)

1. Multi-network aggregation.
2. Paid-tier upgrade automation.
3. Silent/automatic alternate feed fallback.

## 8. Acceptance Criteria

1. OAuth-connected user sees real X-origin records in feed.
2. Every rendered feed card maps to persisted X tweet record.
3. No runtime demo/deterministic feed injection remains in feed path.
4. Unavailable X data returns strict error response and hard-block UI.
5. Media and links render when present.

