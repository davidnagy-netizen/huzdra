-- Húzdrá! – adatbázis-séma (Supabase / Postgres)
-- Az oszlopok a TypeScript-modell (src/lib/types.ts) mezőinek snake_case megfelelői
-- (leképezés: src/lib/db/mapping.ts). Beágyazott adatok jsonb-ben.
--
-- BIZTONSÁG: minden táblán RLS, nyilvános (anon) szabály NINCS → a böngészőből semmi nem olvasható.
-- Az alkalmazás kizárólag szerveroldalon, a service role kulccsal éri el az adatbázist.

-- ------------------------------------------------------------------ katalógus
create table artists (
  id                text primary key,
  kind              text not null default 'house' check (kind in ('celebrity','house')),
  availability      text not null default 'coming_soon' check (availability in ('available','coming_soon')),
  slug              text unique not null,
  name              text not null,
  tagline           text not null default '',
  bio               text not null default '',
  photos            text[] not null default '{}',
  styles            text[] not null default '{}',
  voice_model_id    text not null default '',
  surcharge_huf     integer not null default 0 check (surcharge_huf >= 0),
  royalty_percent   double precision not null default 0 check (royalty_percent between 0 and 100),
  requires_approval boolean not null default false,
  license_signed_at date,
  accent_hue        integer not null default 12,
  active            boolean not null default true,
  sort_order        integer not null default 0,
  -- ismert előadó csak aláírt licenccel és hangmodellel lehet "elérhető"
  constraint available_requires_license check (availability <> 'available' or (license_signed_at is not null and voice_model_id <> ''))
);

create table occasions (id text primary key, label text not null, emoji text not null default '', sort_order integer not null default 0);
create table styles (id text primary key, label text not null, description text not null default '', sort_order integer not null default 0);

create table sample_songs (
  id           text primary key,
  artist_id    text not null references artists(id) on delete cascade,
  title        text not null,
  occasion_id  text not null default '',
  style_id     text not null default '',
  tempo        text not null default 'kozepes',
  duration_sec integer not null default 24,
  audio_url    text not null,              -- "storage:<útvonal>" (samples tároló) vagy generált helykitöltő
  blurb        text not null default '',
  featured     boolean not null default false
);

create table reviews (
  id          text primary key,
  author_name text not null,
  location    text not null default '',
  occasion_id text not null default '',
  artist_id   text not null default '',
  rating      integer not null check (rating between 1 and 5),
  text        text not null,
  created_at  timestamptz not null default now(),
  verified    boolean not null default false,
  published   boolean not null default false
);

create table packages (
  id text primary key, name text not null, delivery_label text not null, delivery_hours integer not null,
  price_huf integer not null check (price_huf >= 0), description text not null default '',
  highlight boolean not null default false, sort_order integer not null default 0, active boolean not null default true
);

create table extras (
  id text primary key, name text not null, description text not null default '',
  price_huf integer not null default 0, kind text not null check (kind in ('addon','lead')),
  sort_order integer not null default 0, active boolean not null default true
);

create table coupons (
  code text primary key,
  percent_off double precision,
  amount_off_huf integer,
  active boolean not null default true,
  valid_until date
);

create table faqs (id text primary key, question text not null, answer text not null, sort_order integer not null default 0);

-- egyetlen sor: az automatizálási beállítások (adminból)
create table settings (id smallint primary key default 1 check (id = 1), data jsonb not null default '{}');

-- ------------------------------------------------------------------ rendelések
create table drafts (
  id text primary key, data jsonb not null, step smallint not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table orders (
  id                    text primary key,
  code                  text unique not null,
  status_key            text not null,
  song_token            text unique not null,
  status                text not null,
  data                  jsonb not null,             -- varázsló adatai (a történet GDPR-törlés alá esik)
  price                 jsonb not null,
  payment               jsonb not null,
  moderation            jsonb not null,
  lyrics                jsonb,
  audio                 jsonb,
  revisions_used        integer not null default 0,
  revision_notes        text[] not null default '{}',
  due_at                timestamptz not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  story_retention_until timestamptz not null,
  events                jsonb not null default '[]',
  preview_id            text,
  name_corrections      integer not null default 0,
  notes                 jsonb not null default '[]',
  delivered_at          timestamptz,
  version               integer not null default 1,  -- optimista zárolás
  audio_job             jsonb,
  regen_mode            text,
  attention             text,
  failures              integer not null default 0,
  moderation_released   boolean not null default false,
  -- származtatott keresőoszlopok
  email                 text not null,
  artist_id             text not null references artists(id)
);
create index orders_status_idx on orders(status);
create index orders_email_idx on orders(email);
create index orders_created_idx on orders(created_at desc);

create table leads (
  id text primary key, order_id text references orders(id) on delete set null, artist_id text not null,
  name text not null, email text not null, phone text not null default '', event_date text not null default '',
  location text not null default '', note text not null default '', created_at timestamptz not null default now()
);

create table waitlist (
  id text primary key, artist_id text not null references artists(id) on delete cascade,
  email text not null, created_at timestamptz not null default now(), unique (artist_id, email)
);

create table email_outbox (
  id text primary key, "to" text not null, subject text not null, html text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ szupport
create table support_tickets (
  id          text primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  channel     text not null,
  from_email  text not null,
  subject     text not null default '',
  message     text not null,
  order_id    text references orders(id) on delete set null,
  order_code  text,
  verified    boolean not null default false,
  intent      text,
  confidence  double precision not null default 0,
  extracted   jsonb not null default '{}',
  status      text not null default 'open',
  actions     jsonb not null default '[]',
  replies     jsonb not null default '[]',
  agent       text not null default ''
);
create index tickets_status_idx on support_tickets(status, created_at desc);
create index tickets_email_idx on support_tickets(from_email);

-- ------------------------------------------------------------------ tanítás
create table training_samples (
  id               text primary key,
  title            text not null,
  storage_path     text not null,               -- training tároló
  file_name        text not null default '',
  mime_type        text not null default '',
  size_bytes       bigint not null default 0,
  duration_sec     double precision,
  bpm              double precision,
  musical_key      text,
  style_ids        text[] not null default '{}',
  occasion_ids     text[] not null default '{}',
  instruments      text[] not null default '{}',
  mood             text not null default '',
  notes            text not null default '',
  rights_confirmed boolean not null check (rights_confirmed),  -- csak jogtiszta minta kerülhet be
  rights_note      text not null default '',
  status           text not null default 'uploaded',
  uploaded_at      timestamptz not null default now(),
  uploaded_by      text not null
);

create table training_jobs (
  id              text primary key,
  name            text not null,
  sample_ids      text[] not null default '{}',
  style_ids       text[] not null default '{}',
  provider        text not null,
  provider_job_id text,
  status          text not null,
  progress        integer not null default 0,
  model_id        text,
  error           text,
  active          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------------ hirdetési előnézetek
create table previews (
  id         text primary key,
  token      text not null,
  created_at timestamptz not null default now(),
  status     text not null,
  data       jsonb not null,
  lyrics     jsonb,
  audio_url  text,
  moderation jsonb not null,
  ip_hash    text not null,
  order_id   text,
  audio_job  jsonb,
  error      text
);
create index previews_ip_idx on previews(ip_hash, created_at desc);

-- ------------------------------------------------------------------ háttérfeladat-sor
create table jobs (
  id          bigserial primary key,
  name        text not null,
  payload     jsonb not null default '{}',
  status      text not null default 'queued' check (status in ('queued','running','done','failed')),
  run_at      timestamptz not null default now(),
  attempts    integer not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index jobs_due_idx on jobs(status, run_at);

-- Feladatok lefoglalása: FOR UPDATE SKIP LOCKED → párhuzamos workerek nem ütköznek;
-- a 10 percnél régebben "running" (elakadt) feladatok újra kioszthatók.
create or replace function claim_jobs(batch_size integer default 5)
returns setof jobs
language sql
as $$
  update jobs
     set status = 'running', attempts = attempts + 1, started_at = now()
   where id in (
     select id from jobs
      where (status = 'queued' and run_at <= now())
         or (status = 'running' and started_at < now() - interval '10 minutes')
      order by run_at
      limit batch_size
      for update skip locked
   )
  returning *;
$$;

-- ------------------------------------------------------------------ admin felhasználók
-- A belépés Supabase Auth-tal történik; admin az, akinek az e-mail-címe itt szerepel.
create table admins (email text primary key, created_at timestamptz not null default now());

-- ------------------------------------------------------------------ GDPR-karbantartás
-- A worker óránként hívja: a megőrzési időn túli személyes történetek törlése, régi piszkozatok,
-- lezárt feladatok és előnézetek takarítása.
create or replace function purge_expired_stories() returns integer language plpgsql as $$
declare n integer;
begin
  update orders
     set data = data - 'memories' - 'jokes' - 'familyNames' - 'favoriteSaying' - 'avoid' - 'pronunciation' - 'liveEventNote',
         revision_notes = '{}'
   where story_retention_until < now() and data ? 'memories';
  get diagnostics n = row_count;
  delete from drafts where updated_at < now() - interval '30 days';
  delete from previews where order_id is null and created_at < now() - interval '30 days';
  delete from jobs where status in ('done','failed') and created_at < now() - interval '14 days';
  return n;
end $$;

-- ------------------------------------------------------------------ RLS: mindenhol be, anon szabály nincs
alter table artists enable row level security;
alter table occasions enable row level security;
alter table styles enable row level security;
alter table sample_songs enable row level security;
alter table reviews enable row level security;
alter table packages enable row level security;
alter table extras enable row level security;
alter table coupons enable row level security;
alter table faqs enable row level security;
alter table settings enable row level security;
alter table drafts enable row level security;
alter table orders enable row level security;
alter table leads enable row level security;
alter table waitlist enable row level security;
alter table email_outbox enable row level security;
alter table support_tickets enable row level security;
alter table training_samples enable row level security;
alter table training_jobs enable row level security;
alter table previews enable row level security;
alter table jobs enable row level security;
alter table admins enable row level security;
