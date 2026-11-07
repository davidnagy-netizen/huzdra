-- Supabase Storage tárolók (mind privát; a fájlokat a szerver aláírt URL-lel adja ki).
--   training  – tanító zeneminták (admin feltöltés, akár több száz MB)
--   songs     – kész dalok
--   samples   – a weboldal mintadalai
--   previews  – 15 mp-es hirdetési előnézetek
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('training', 'training', false, 209715200, array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/flac','audio/x-flac','audio/ogg','audio/mp4','audio/x-m4a','audio/aac']),
  ('songs',    'songs',    false, 104857600, array['audio/mpeg','audio/wav','audio/flac']),
  ('samples',  'samples',  false, 52428800,  array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/mp4']),
  ('previews', 'previews', false, 20971520,  array['audio/mpeg','audio/wav'])
on conflict (id) do nothing;

-- Nincs storage.objects szabály anon/authenticated szerepkörre: csak a service role (szerver) fér hozzá,
-- illetve az aláírt fel-/letöltési URL birtokosa.

-- (Opcionális) Ha nem Vercel Cront használsz, a háttérfeldolgozót a Supabase is hívhatja percenként:
--   create extension if not exists pg_cron; create extension if not exists pg_net;
--   select cron.schedule('huzdra-worker', '* * * * *', $$
--     select net.http_post(url := 'https://huzdra.hu/api/cron/worker',
--                          headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'));
--   $$);
