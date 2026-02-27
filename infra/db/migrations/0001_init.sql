BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_accounts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS oauth_tokens_encrypted (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source TEXT NOT NULL,
  source_id UUID REFERENCES sources(id),
  author_id TEXT,
  title TEXT,
  body TEXT,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  lang TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, url_hash)
);

CREATE TABLE IF NOT EXISTS content_clusters (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  topic_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_features (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  content_id UUID NOT NULL REFERENCES content_items(id),
  embedding VECTOR(1536),
  topic_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sentiment NUMERIC(5,2),
  spam_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  profile_version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_interest_vectors (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  embedding VECTOR(1536),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_candidates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL REFERENCES content_items(id),
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_rankings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL REFERENCES content_items(id),
  base_score NUMERIC(8,6) NOT NULL,
  importance_score NUMERIC(8,6) NOT NULL,
  trust_score NUMERIC(8,6) NOT NULL,
  urgency_score NUMERIC(8,6) NOT NULL,
  final_score NUMERIC(8,6) NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_rankings_user_score_pub
  ON feed_rankings (tenant_id, user_id, final_score DESC, published_at DESC);

CREATE TABLE IF NOT EXISTS feed_delivery_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  mode TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL,
  action TEXT NOT NULL,
  context_mode TEXT NOT NULL,
  context_category TEXT,
  ts TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_events_composite
  ON feedback_events (tenant_id, user_id, item_id, action, ts);

CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  feed_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary_short TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  personal_importance NUMERIC(8,6) NOT NULL DEFAULT 0.5,
  revisit_score NUMERIC(8,6) NOT NULL DEFAULT 0.5,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, feed_item_id)
);

CREATE TABLE IF NOT EXISTS saved_item_embeddings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  saved_id UUID NOT NULL REFERENCES saved_items(id),
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_item_embeddings_hnsw
  ON saved_item_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS saved_collections (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_notes (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  saved_id UUID NOT NULL REFERENCES saved_items(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_saved_reviews (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  week_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, week_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  mode_minutes INT NOT NULL CHECK (mode_minutes IN (10, 15)),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_started
  ON sessions (tenant_id, user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS time_saved_metrics (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  time_saved_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key TEXT NOT NULL,
  variant TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key, variant)
);

CREATE TABLE IF NOT EXISTS source_trust_history (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_id UUID REFERENCES sources(id),
  trust_score NUMERIC(8,6) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  actor_user_id UUID,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_llm_api_keys_encrypted (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

COMMIT;
