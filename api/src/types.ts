export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SECRET_KEY: string;
  APP_URL: string;
  // Optional. Bound in wrangler.jsonc via kv_namespaces. When absent
  // (tests, fresh `wrangler dev`), rate-limit middleware falls back to
  // an in-memory store.
  RATE_LIMIT_KV?: KVNamespace;
};

export type HonoEnv = { Bindings: Bindings };
