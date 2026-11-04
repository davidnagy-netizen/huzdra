-- Húzdrá! – kezdeti adatbázis-séma (Supabase / Postgres).
-- A mock adattár (src/lib/db/mock-repository.ts) ugyanezt a modellt követi;
-- a SupabaseRepository a 2. fázisban készül el ugyanazzal az interfésszel.

create extension if not exists "pgcrypto";

-- ---------- Törzsadatok (adminból szerkeszthetők) ----------

create table artists (
  id               text primary key default 'art_' || encode(gen_random_bytes(6), 'hex'),
  kind             text not null default 'house' check (kind in ('celebrity','house')),
  availability     text not null default 'coming_soon' check (availability in ('available','coming_soon')),
  slug             text unique not null,
  name             text not null,
  tagline          text not null default '',
  bio              text not null default '',
  photos           text[] not null default '{}',
  styles           text[] not null default '{}',
  voice_model_id   text not null default '',    -- hangmodell a szolgáltatónál (hamarosan-előadónál üres)
  surcharge_huf    integer not null default 0 check (surcharge_huf >= 0), -- előadónkénti felár, adminból állítható
  royalty_percent  numeric(5,2) not null default 0 check (royalty_percent between 0 and 100),
  requires_approval boolean not null default true,
  license_signed_at date,                       -- híresség: licencszerződés; saját hang: énekesi hozzájárulás
  accent_hue       smallint not null default 12,
  active           boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  constraint available_requires_license check (availability <> 'available' or (license_signed_at is not null and voice_model_id <> ''))
);

create table occasions (
  id text primary key, label text not null, emoji text not null default '', sort_order integer not null default 0
);

create table styles (
  id text primary key, label text not null, description text not null default '', sort_order integer not null default 0
);

create table sample_songs (
  id           text primary key default 'smp_' || encode(gen_random_bytes(6), 'hex'),
  artist_id    text not null references artists(id) on delete cascade,
  title        text not null,
  occasion_id  text not null references occasions(id),
  style_id     text not null references styles(id),
  tempo        text not null check (tempo in ('lassu','kozepes','porgos')),
  duration_sec integer not null,
  audio_path   text not null,                   -- Supabase Storage: samples/<id>.mp3
  blurb        text not null default '',
  featured     boolean not null default false,
  created_at   timestamptz not null default now()
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
  code text primary key, percent_off smallint check (percent_off between 1 and 100),
  amount_off_huf integer check (amount_off_huf > 0), active boolean not null default true,
  valid_until timestamptz, max_uses integer, used_count integer not null default 0
);

create table faqs (
  id text primary key default encode(gen_random_bytes(6), 'hex'),
  question text not null, answer text not null, sort_order integer not null default 0
);

create table reviews (
  id          text primary key default encode(gen_random_bytes(6), 'hex'),
  order_id    text,                             -- ellenőrzött vásárlás
  author_name text not null,
  location    text not null default '',
  occasion_id text references occasions(id),
  artist_id   text references artists(id),
  rating      smallint not null check (rating between 1 and 5),
  text        text not null,
  verified    boolean not null default false,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- Rendelések ----------

create table drafts (
  id         text primary key,
  data       jsonb not null,
  step       smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type order_status as enum (
  'draft','paid_authorized','moderation_hold','lyrics_ready','awaiting_artist_approval',
  'audio_generating','qc','delivered','revision_requested','done','cancelled'
);

create table orders (
  id                 text primary key,
  code               text unique not null,
  status_key         text not null,
  song_token         text unique not null,
  status             order_status not null default 'draft',
  artist_id          text not null references artists(id),
  email              text not null,
  data               jsonb not null,            -- varázsló adatai (a történet GDPR-törlés alá esik)
  price              jsonb not null,
  total_huf          integer not null,
  payment_provider   text not null,
  payment_intent_id  text not null,
  payment_state      text not null check (payment_state in ('authorized','captured','cancelled')),
  moderation         jsonb not null default '{"ok":true,"flags":[]}',
  lyrics             jsonb,
  audio_path         text,
  watermark_id       text,
  revisions_used     smallint not null default 0,
  revision_notes     text[] not null default '{}',
  due_at             timestamptz not null,
  story_retention_until timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index orders_status_idx on orders(status);
create index orders_artist_idx on orders(artist_id, created_at desc);

create table order_events (
  id         bigserial primary key,
  order_id   text not null references orders(id) on delete cascade,
  status     order_status not null,
  note       text,
  actor      text not null check (actor in ('system','customer','admin','artist')),
  created_at timestamptz not null default now()
);

create table leads (
  id         text primary key,
  order_id   text references orders(id) on delete set null,
  artist_id  text not null references artists(id),
  name text not null, email text not null, phone text not null default '',
  event_date date, location text not null default '', note text not null default '',
  created_at timestamptz not null default now()
);

create table waitlist (
  id         text primary key,
  artist_id  text not null references artists(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  unique (artist_id, email)
);

create table email_outbox (
  id text primary key, to_email text not null, subject text not null, html text not null,
  sent_at timestamptz, created_at timestamptz not null default now()
);

create table settings (key text primary key, value jsonb not null);

-- ---------- GDPR: személyes történetek törlése a megőrzési idő után ----------
-- (napi ütemezett feladat, pl. pg_cron: select purge_expired_stories();)
create or replace function purge_expired_stories() returns integer language plpgsql as $$
declare n integer;
begin
  update orders
     set data = data - 'memories' - 'jokes' - 'familyNames' - 'favoriteSaying' - 'avoid'
                     - 'pronunciation' - 'liveEventNote',
         revision_notes = '{}'
   where story_retention_until < now()
     and data ? 'memories';
  get diagnostics n = row_count;
  delete from drafts where updated_at < now() - interval '30 days';
  return n;
end $$;

-- ---------- RLS: a publikus olvasás csak a katalógusra ----------
alter table artists enable row level security;
alter table sample_songs enable row level security;
alter table reviews enable row level security;
alter table packages enable row level security;
alter table extras enable row level security;
alter table faqs enable row level security;
alter table orders enable row level security;
alter table drafts enable row level security;
alter table leads enable row level security;

create policy "public artists" on artists for select using (active);
create policy "public samples" on sample_songs for select using (exists (select 1 from artists a where a.id = artist_id and a.active));
create policy "public reviews" on reviews for select using (published);
create policy "public packages" on packages for select using (active);
create policy "public extras" on extras for select using (active);
create policy "public faqs" on faqs for select using (true);
-- orders / drafts / leads: csak a szerver (service role) éri el, publikus policy nincs.
