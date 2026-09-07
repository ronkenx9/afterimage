CREATE TABLE IF NOT EXISTS investigations (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  input_value text NOT NULL,
  status text NOT NULL,
  coverage jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence (
  id text PRIMARY KEY,
  investigation_id text NOT NULL REFERENCES investigations(id),
  source text NOT NULL,
  payload_hash text NOT NULL,
  protected_payload jsonb,
  retrieved_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS order_intents (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  account_ref text NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL UNIQUE,
  state text NOT NULL,
  expires_at timestamptz NOT NULL,
  provider_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_events (
  id bigserial PRIMARY KEY,
  intent_id text NOT NULL REFERENCES order_intents(id),
  state text NOT NULL,
  provider_payload jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
