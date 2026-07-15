-- Local development seed. Applied automatically by `supabase db reset`
-- (config.toml [db.seed]). Fixed UUIDs so it is idempotent and easy to
-- reference: users 0..., subjects 1..., bases 2..., guides 3..., revisions 4...
--
-- Login for the seed author: seed@bluelearn.org / password123
--
-- After seeding, rebuild the search index:
--   bun api/scripts/typesense-sync.ts --force

-- ---------------------------------------------------------------------------
-- Auth user (profile row is created by the on_auth_user_created trigger)
-- ---------------------------------------------------------------------------

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'seed@bluelearn.org',
   extensions.crypt('password123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"username":"seeduser"}',
   now(), now(),
   -- GoTrue scans these as text; empty strings avoid null-scan errors.
   '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities
  (id, user_id, provider_id, identity_data, provider,
   last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(),
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '{"sub":"00000000-0000-0000-0000-000000000001","email":"seed@bluelearn.org","email_verified":true}',
   'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

-- ---------------------------------------------------------------------------
-- Subjects
-- ---------------------------------------------------------------------------

insert into public.subjects (id, slug, name, creator_id) values
  ('10000000-0000-0000-0000-000000000001', 'javascript', 'JavaScript', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'react',      'React',      '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'algorithms', 'Algorithms', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', 'databases',  'Databases',  '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000005', 'devops',     'DevOps',     '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Guides: base -> canonical guide -> current (submitted) revision.
-- Inserted as drafts with null pointers, then the canonical/current pointers
-- and published status are set by the updates at the bottom. This sidesteps
-- the circular deferrable FKs without needing a wrapping transaction.
-- ---------------------------------------------------------------------------

insert into public.guide_bases (id, slug, title, knowledge_type, status) values
  ('20000000-0000-0000-0000-000000000001', 'binary-search',             'Binary Search',                'theoretical', 'draft'),
  ('20000000-0000-0000-0000-000000000002', 'react-hooks',               'React Hooks',                  'theoretical', 'draft'),
  ('20000000-0000-0000-0000-000000000003', 'deploy-cloudflare-workers', 'Deploy to Cloudflare Workers', 'practical',   'draft'),
  ('20000000-0000-0000-0000-000000000004', 'sql-joins',                 'SQL Joins',                    'theoretical', 'draft'),
  ('20000000-0000-0000-0000-000000000005', 'debounce-search-input',     'Debounce a Search Input',      'practical',   'draft'),
  -- Stays draft: must NOT appear in /guides or search results.
  ('20000000-0000-0000-0000-000000000006', 'css-grid',                  'CSS Grid',                     'theoretical', 'draft')
on conflict (id) do nothing;

insert into public.guides (id, guide_base_id, slug, status, author_id) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'original', 'draft', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'original', 'draft', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'original', 'draft', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'original', 'draft', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'original', 'draft', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', null,       'draft', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.guide_revisions (id, guide_id, title, summary, body, author_id, status, approved_at) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   'Binary Search',
   'Find an element in a sorted array in O(log n) by halving the search range each step.',
   E'# Binary Search\n\nCompare the target with the middle element and discard the half that cannot contain it. Repeat until found or empty.',
   '00000000-0000-0000-0000-000000000001', 'submitted', now()),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002',
   'React Hooks',
   'useState, useEffect, and friends: managing state and side effects in function components.',
   E'# React Hooks\n\nHooks let function components hold state and tap into lifecycle behavior without classes.',
   '00000000-0000-0000-0000-000000000001', 'submitted', now()),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
   'Deploy to Cloudflare Workers',
   'Ship a Hono API to the edge with wrangler: config, secrets, and a first deploy.',
   E'# Deploy to Cloudflare Workers\n\nInstall wrangler, configure wrangler.jsonc, set secrets, then `wrangler deploy`.',
   '00000000-0000-0000-0000-000000000001', 'submitted', now()),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004',
   'SQL Joins',
   'Inner, left, right, and full joins: combining rows across tables by matching keys.',
   E'# SQL Joins\n\nA join matches rows from two tables on a condition. Inner keeps matches; outer joins keep unmatched rows too.',
   '00000000-0000-0000-0000-000000000001', 'submitted', now()),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005',
   'Debounce a Search Input',
   'Delay firing requests until the user stops typing to avoid hammering the API.',
   E'# Debounce a Search Input\n\nWrap the handler in a timer that resets on every keystroke; only the last call within the window runs.',
   '00000000-0000-0000-0000-000000000001', 'submitted', now()),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006',
   'CSS Grid', 'Two-dimensional layout in CSS.', E'# CSS Grid\n\nDraft in progress.',
   '00000000-0000-0000-0000-000000000001', 'draft', null)
on conflict (id) do nothing;

-- Subject tags (revision-scoped)
insert into public.guide_revision_subjects (guide_revision_id, subject_id) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'), -- binary search: algorithms
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'), -- react hooks: react
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'), -- react hooks: javascript
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005'), -- workers: devops
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004'), -- sql joins: databases
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001'), -- debounce: javascript
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002')  -- debounce: react
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Objectives: objective -> current (published) revision -> nodes over the
-- seeded guides. Same draft-then-publish dance as guides for the circular
-- current_revision_id FK. UUIDs: objectives 5..., objective revisions 6...
-- ---------------------------------------------------------------------------

insert into public.objectives (id, slug, status, created_by) values
  ('50000000-0000-0000-0000-000000000001', 'frontend-fundamentals', 'draft', '00000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002', 'algorithms-basics',     'draft', '00000000-0000-0000-0000-000000000001'),
  -- Stays draft: must NOT appear in /objectives or search results.
  ('50000000-0000-0000-0000-000000000003', 'backend-path',          'draft', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.objective_revisions (id, objective_id, title, summary, author_id, status, published_at) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   'Frontend Fundamentals',
   'Everything you need to build interactive UIs: hooks, state, and responsive inputs.',
   '00000000-0000-0000-0000-000000000001', 'published', now()),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002',
   'Algorithms Basics',
   'A first tour of classic algorithms, starting from searching sorted data.',
   '00000000-0000-0000-0000-000000000001', 'published', now()),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003',
   'Backend Path', 'Draft curriculum for server-side development.',
   '00000000-0000-0000-0000-000000000001', 'draft', null)
on conflict (id) do nothing;

-- Curriculum nodes: pin each included guide base to its canonical variant.
insert into public.objective_revision_nodes (revision_id, guide_base_id, guide_id, is_target) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', true),  -- react hooks (target)
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', false), -- debounce input
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', true)   -- binary search (target)
on conflict do nothing;

insert into public.objective_revision_subjects (objective_revision_id, subject_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'), -- frontend: react
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'), -- frontend: javascript
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003')  -- algorithms basics: algorithms
on conflict do nothing;

-- Publish guides 1-5: point each guide at its live revision, each base at its
-- canonical guide, and flip both to published. Guide/base 6 stays draft.
update public.guides g
set current_revision_id = r.id, status = 'published'
from public.guide_revisions r
where r.guide_id = g.id
  and r.status = 'submitted'
  and g.id::text like '30000000-%';

update public.guide_bases b
set canonical_guide_id = g.id, status = 'published'
from public.guides g
where g.guide_base_id = b.id
  and g.status = 'published'
  and b.id::text like '20000000-%';

-- Publish objectives 1-2 the same way. Objective 3 stays draft.
update public.objectives o
set current_revision_id = r.id, status = 'published'
from public.objective_revisions r
where r.objective_id = o.id
  and r.status = 'published'
  and o.id::text like '50000000-%';
