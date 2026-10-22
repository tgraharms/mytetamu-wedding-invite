-- =============================================================================
-- Supabase schema for the wedding-landing-page project.
--
-- Purpose: recreate the full schema in a NEW (throwaway) Supabase project so a
-- collaborator can test live features locally without writing into the real
-- guest data. Mirrors production: tables, RLS policies, and SECURITY DEFINER
-- functions (wishlist v2 — identiti tetamu berasaskan nombor telefon).
--
-- HOW TO USE:
--   1. Create a new Supabase project (any name, e.g. "wedding-dev").
--   2. Open the project's SQL Editor.
--   3. Paste this whole file and Run.
--   4. Optionally run the SEED block at the bottom so lists aren't empty.
--   5. Copy the new project's URL + anon key into the collaborator's local .env.
--
-- Safe to Run more than once: every statement above the SEED block is
-- idempotent. The SEED block is NOT — re-running it adds a second copy of each
-- sample row. See the warning above it before you Run this file a second time.
--
-- Contains NO secrets and NO real guest data. Safe to commit.
-- =============================================================================

-- ---------- Tables -----------------------------------------------------------

create table if not exists public.rsvp (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null,
  pax        integer not null check (pax >= 1),
  bermalam   boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.homestay (
  id             bigint generated always as identity primary key,
  nama           text not null,
  jarak_ke_venue text not null default '',
  anggaran_harga text not null default '',
  pautan         text not null default '',
  nota           text not null default '',
  aktif          boolean not null default true,
  urutan         integer not null default 0
);

create table if not exists public.aktiviti (
  id       bigint generated always as identity primary key,
  nama     text not null,
  kategori text not null default '',
  jarak    text not null default '',
  pautan   text not null default '',
  nota     text not null default '',
  aktif    boolean not null default true,
  urutan   integer not null default 0,
  imej     text not null default '',
  -- Kosong = tiada lencana. Kalau berisi, teksnya dipapar sebagai pil kecil
  -- di atas gambar kad pada halaman tetamu.
  lencana  text not null default ''
);

create table if not exists public.gift_item (
  id         bigint generated always as identity primary key,
  nama       text not null,
  pautan     text not null default '',
  gambar_url text not null default '',
  nota       text not null default '',
  aktif      boolean not null default true,
  urutan     integer not null default 0
);

create table if not exists public.fund_goal (
  id      bigint generated always as identity primary key,
  nama    text not null,
  sasaran numeric(10,2) not null check (sasaran > 0),
  emoji   text not null default '🎯',
  aktif   boolean not null default true,
  urutan  integer not null default 0
);

-- ---------- Buang objek wishlist v1 ------------------------------------------
-- Blok ini mencerminkan bahagian "Buang objek v1" dalam migrasi sebenar
-- (docs/superpowers/migrations/2026-08-06-wishlist-v2.sql).
--
-- Kenapa ia perlu di sini: seluruh fail ini menggunakan `create table if not
-- exists`. Jalankan ia ke atas projek yang sudah memegang skema v1, dan jadual
-- `reservation`/`contribution` v1 — berbentuk lama, ada `nama`/`cancel_token`
-- dan tiada `guest_id` — akan DIKEKALKAN secara senyap di sebelah jadual `guest`
-- v2 yang baharu lagi kosong. Tiada apa-apa yang gagal semasa Run; kesilapan itu
-- hanya menyerlah kemudian ketika masa jalan sebagai
-- `column "guest_id" does not exist`. Dengan blok ini, jalanan semula ke atas
-- pangkalan data v1 menumpu kepada skema v2 yang penuh, bukan separuh naik taraf.
--
-- AMARAN: kerana ia menggugurkan jadual, menjalankan semula fail ini ke atas
-- projek dev yang SUDAH v2 akan memadam tempahan/sumbangan ujian di dalamnya.
-- Itu memang diterima untuk projek buangan. Jangan sekali-kali jalankan fail ini
-- ke atas projek sebenar — ia juga menyisipkan baris kandungan contoh di bawah.
drop function if exists public.reserve_gift(bigint, text);
drop function if exists public.cancel_gift_reservation(bigint, uuid);
drop function if exists public.reserved_gift_ids();
drop table if exists public.reservation;
drop table if exists public.contribution;

-- Wishlist v2: a guest is identified by a normalised phone number. `reservation`
-- and `contribution` hang off `guest` instead of carrying a free-text name.
create table if not exists public.guest (
  id         bigint generated always as identity primary key,
  telefon    text not null unique,
  nama       text not null check (char_length(nama) between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.reservation (
  id           bigint generated always as identity primary key,
  gift_item_id bigint not null unique references public.gift_item (id),
  guest_id     bigint not null references public.guest (id),
  created_at   timestamptz not null default now()
);

create table if not exists public.contribution (
  id         bigint generated always as identity primary key,
  goal_id    bigint not null references public.fund_goal (id),
  guest_id   bigint not null references public.guest (id),
  amaun      numeric(10,2) not null check (amaun >= 1 and amaun <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.doa (
  id         bigint generated always as identity primary key,
  nama       text not null check (char_length(btrim(nama)) >= 1 and char_length(btrim(nama)) <= 100),
  mesej      text not null check (char_length(btrim(mesej)) >= 1 and char_length(btrim(mesej)) <= 500),
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------------------------------------------

alter table public.rsvp         enable row level security;
alter table public.homestay     enable row level security;
alter table public.aktiviti     enable row level security;
alter table public.gift_item    enable row level security;
alter table public.fund_goal    enable row level security;
alter table public.doa          enable row level security;

-- The three guest-identity tables below have RLS enabled with NO policies at
-- all — neither read nor write. Every access goes through the SECURITY DEFINER
-- functions further down. Anon selects return an empty set even though rows
-- exist; direct inserts are refused with 42501.
alter table public.guest        enable row level security;
alter table public.reservation  enable row level security;
alter table public.contribution enable row level security;

-- PostgreSQL tiada `create policy if not exists`, jadi setiap dasar digugurkan
-- dahulu. Tanpa ini, Run kali kedua terhenti pada dasar pertama dengan ralat
-- 42710 ("policy … already exists") dan keseluruhan fail berpatah balik.

-- Public read of active rows
drop policy if exists "baca aktiviti aktif"  on public.aktiviti;
create policy "baca aktiviti aktif"  on public.aktiviti  for select to anon, authenticated using (aktif);
drop policy if exists "baca fund_goal aktif" on public.fund_goal;
create policy "baca fund_goal aktif" on public.fund_goal for select to anon, authenticated using (aktif);
drop policy if exists "baca gift_item aktif" on public.gift_item;
create policy "baca gift_item aktif" on public.gift_item for select to anon, authenticated using (aktif);
drop policy if exists "baca homestay aktif"  on public.homestay;
create policy "baca homestay aktif"  on public.homestay  for select to anon, authenticated using (aktif);

-- RSVP: insert only
drop policy if exists "anon boleh insert rsvp" on public.rsvp;
create policy "anon boleh insert rsvp" on public.rsvp for insert to anon with check (true);

-- Doa (guestbook): read + insert
drop policy if exists "anon boleh baca doa"  on public.doa;
create policy "anon boleh baca doa"  on public.doa for select to anon using (true);
drop policy if exists "anon boleh sisip doa" on public.doa;
create policy "anon boleh sisip doa" on public.doa for insert to anon with check (true);

-- guest, reservation and contribution intentionally have no policies —
-- see the RLS block above.

-- ---------- Internal helpers (NOT part of the API) ---------------------------
-- Kedua-dua pembantu ini menetapkan `search_path = public` supaya laluan
-- pemanggil tidak boleh mengalihkan rujukan jadual (lint Supabase:
-- function_search_path_mutable).
--
-- Normalisasi: buang bukan-digit; '0' depan → '60' (format tempatan Malaysia);
-- nombor asing (cth. +65…) lulus tanpa ubah. 10–15 digit sahaja.
create or replace function public.normalkan_telefon(p_telefon text)
returns text language plpgsql immutable set search_path = public
as $$
declare v text;
begin
  v := regexp_replace(coalesce(p_telefon, ''), '\D', '', 'g');
  if left(v, 1) = '0' then v := '60' || substr(v, 2); end if;
  if length(v) < 10 or length(v) > 15 then
    raise exception 'telefon_tidak_sah';
  end if;
  return v;
end $$;

-- Upsert tetamu. `on conflict do update` mengunci baris guest sehingga commit,
-- jadi kiraan had tempahan selepas panggilan ini bersiri per tetamu (tiada
-- perlumbaan 2 peranti melepasi had).
create or replace function public.pastikan_tetamu(p_telefon text, p_nama text)
returns bigint language plpgsql set search_path = public
as $$
declare v_tel text; v_nama text; v_id bigint;
begin
  v_tel := public.normalkan_telefon(p_telefon);
  v_nama := left(btrim(coalesce(p_nama, '')), 100);
  if v_nama = '' then raise exception 'nama_diperlukan'; end if;
  insert into public.guest (telefon, nama) values (v_tel, v_nama)
  on conflict (telefon) do update set nama = excluded.nama
  returning id into v_id;
  return v_id;
end $$;

-- ---------- Guest RPCs (SECURITY DEFINER) ------------------------------------
create or replace function public.tempah_hadiah(p_telefon text, p_nama text, p_gift_item_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare v_guest_id bigint; v_kira int;
begin
  if not exists (select 1 from gift_item where id = p_gift_item_id and aktif) then
    raise exception 'hadiah_tiada';
  end if;
  v_guest_id := pastikan_tetamu(p_telefon, p_nama);
  select count(*) into v_kira from reservation where guest_id = v_guest_id;
  if v_kira >= 2 then raise exception 'had_capai'; end if;
  begin
    insert into reservation (gift_item_id, guest_id) values (p_gift_item_id, v_guest_id);
  exception when unique_violation then
    raise exception 'sudah_ditempah';
  end;
end $$;

create or replace function public.batal_tempahan(p_telefon text, p_gift_item_id bigint)
returns boolean language plpgsql security definer set search_path = public
as $$
declare v_tel text; v_kira int;
begin
  v_tel := normalkan_telefon(p_telefon);
  delete from reservation r using guest g
  where r.guest_id = g.id and g.telefon = v_tel and r.gift_item_id = p_gift_item_id;
  get diagnostics v_kira = row_count;
  return v_kira > 0;
end $$;

-- RPC ini TIDAK memulangkan nama tetamu. Kunci anon memang awam (ia dihantar di
-- dalam bundle klien), jadi kalau `nama` dipulangkan, sesiapa boleh mencuba
-- nombor telefon satu demi satu dan menuai pasangan telefon→nama bagi setiap
-- tetamu yang pernah menggunakan wishlist. Dasar keselamatan projek: nama/telefon
-- tetamu tidak pernah didedahkan oleh mana-mana RPC tetamu.
--
-- Kunci 'nama' sengaja dikekalkan (bernilai null) supaya bentuk JSON tidak
-- berubah dan cawangan nombor-tidak-dikenali kekal serupa dengan yang dikenali —
-- tiada apa-apa pada bentuk jawapan yang memberitahu penyerang sama ada sesuatu
-- nombor itu wujud. Klien hanya membaca `tempahan`.
create or replace function public.status_tetamu(p_telefon text)
returns json language plpgsql stable security definer set search_path = public
as $$
declare v_tel text; v_id bigint;
begin
  v_tel := normalkan_telefon(p_telefon);
  select id into v_id from guest where telefon = v_tel;
  if v_id is null then
    return json_build_object('nama', null, 'tempahan', '[]'::json, 'sumbangan', '[]'::json);
  end if;
  return json_build_object(
    'nama', null,
    'tempahan', coalesce(
      (select json_agg(r.gift_item_id) from reservation r where r.guest_id = v_id),
      '[]'::json),
    'sumbangan', coalesce(
      (select json_agg(json_build_object('goal_id', c.goal_id, 'amaun', c.amaun))
       from contribution c where c.guest_id = v_id),
      '[]'::json)
  );
end $$;

create or replace function public.sumbang(p_telefon text, p_nama text, p_goal_id bigint, p_amaun numeric)
returns void language plpgsql security definer set search_path = public
as $$
declare v_guest_id bigint;
begin
  if not exists (select 1 from fund_goal where id = p_goal_id and aktif) then
    raise exception 'tabung_tiada';
  end if;
  if p_amaun is null or p_amaun < 1 or p_amaun > 1000 then
    raise exception 'amaun_tidak_sah';
  end if;
  v_guest_id := pastikan_tetamu(p_telefon, p_nama);
  insert into contribution (goal_id, guest_id, amaun) values (p_goal_id, v_guest_id, p_amaun);
end $$;

create or replace function public.senarai_ditempah()
returns setof bigint language sql stable security definer set search_path = public
as $$
  select gift_item_id from public.reservation;
$$;

-- `penyumbang` mengira ORANG, bukan sumbangan: label pada kad berbunyi "N orang
-- telah menyumbang", jadi seorang tetamu yang menyumbang dua kali mesti kekal
-- seorang. Setiap baris contribution membawa guest_id, jadi distinct sudah cukup.
-- `jumlah` pula tetap mengira semua sumbangan.
create or replace function public.tabung_totals()
returns table (goal_id bigint, jumlah numeric, penyumbang bigint)
language sql stable security definer set search_path = public
as $$
  select c.goal_id, coalesce(sum(c.amaun), 0), count(distinct c.guest_id)
  from public.contribution c
  group by c.goal_id;
$$;

-- Fungsi dalaman tidak boleh dipanggil melalui API.
revoke execute on function public.normalkan_telefon(text) from public, anon, authenticated;
revoke execute on function public.pastikan_tetamu(text, text) from public, anon, authenticated;

-- ---------- Admin /urus — berkunci frasa laluan (bcrypt) ---------------------
-- TIADA frasa laluan dicommit. Selepas menjalankan fail ini, tetapkan frasa
-- anda sendiri dalam SQL Editor projek anda. Snippet ini boleh diulang — ia
-- juga cara menukar frasa laluan:
--   insert into public.admin_config (kunci_hash)
--   values (extensions.crypt('FRASA-PILIHAN-ANDA', extensions.gen_salt('bf', 10)))
--   on conflict (id) do update set kunci_hash = excluded.kunci_hash;
--
-- Kos bcrypt ditetapkan 10, bukan default gen_salt('bf') iaitu 6. urus_overview
-- boleh dipanggil oleh anon dan kunci anon memang awam, tanpa had kadar mahupun
-- kunci-masuk, jadi setiap tekaan mesti mahal. Pilih frasa yang panjang dan
-- rawak — jangan guna tarikh kahwin atau nama.
--
-- Selagi admin_config kosong, ketiga-tiga RPC urus_* menolak setiap panggilan
-- dengan `kunci_salah` — gagal TERTUTUP, bukan akses terbuka.
--
-- crypt()/gen_salt() datang daripada pgcrypto. Pada Supabase ia dipasang dalam
-- skema `extensions` (bukan `public`); sebab itu semak_kunci() menetapkan
-- search_path = public, extensions dan panggilan di luar fungsi ditulis penuh
-- sebagai extensions.crypt(...). Jika projek anda sudah ada pgcrypto dalam
-- `public`, CREATE EXTENSION di bawah tidak berbuat apa-apa — guna
-- public.crypt(...) / public.gen_salt(...) dalam snippet di atas.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_config (
  id         boolean primary key default true check (id),  -- satu baris sahaja
  kunci_hash text not null
);
alter table public.admin_config enable row level security;
revoke all on table public.admin_config from anon, authenticated;
-- Dua lapis menghalang akses: geran lalai anon/authenticated sudah ditarik
-- balik, dan RLS aktif tanpa sebarang polisi. Hanya fungsi SECURITY DEFINER
-- di bawah membacanya.

-- Gagal TERTUTUP: jadual kosong → kunci_salah, bukan akses terbuka.
--
-- `update ... where false` pada permulaan fungsi BUKAN kod mati. Ia tulisan
-- tanpa kesan yang wujud khusus untuk menolak panggilan melalui GET. PostgREST
-- menjalankan setiap GET dalam transaksi READ ONLY, dan Postgres membatalkan
-- sebarang UPDATE/INSERT/DELETE dalam transaksi begitu pada permulaan executor
-- — sebelum WHERE dinilai — jadi ia tidak menyentuh mahupun menulis satu baris
-- pun. Kesannya: GET /rest/v1/rpc/urus_* gagal 405 / SQLSTATE 25006, manakala
-- POST (transaksi baca-tulis) berjalan seperti biasa. Tujuannya supaya frasa
-- laluan hanya boleh bergerak dalam badan POST dan tidak pernah dalam URL —
-- URL berakhir dalam log permintaan Supabase, log proksi dan sejarah
-- shell/pelayar.
--
-- SUSUNAN PENTING: tulisan itu MESTI dijalankan sebelum perbandingan frasa
-- laluan, bukan selepas. Jika ia diletakkan selepas, GET dengan frasa SALAH
-- gagal `kunci_salah` (400) manakala GET dengan frasa BETUL gagal 25006 (405)
-- — perbezaan kod status itu sendiri menjadi oracle yang memberitahu penyerang
-- bila tekaannya tepat, sedangkan setiap tekaan itu pula ditulis ke dalam log
-- sebagai URL. Dengan tulisan didahulukan, transaksi baca-sahaja ditolak tanpa
-- mengira betul atau salah frasa: setiap GET pulang 25006 yang sama dan tiada
-- apa-apa dapat dipelajari daripadanya.
--
-- Kerana fungsi ini menulis, ia TIDAK boleh ditanda `stable`; Postgres menolak
-- pernyataan tulis di dalam fungsi STABLE. Sebab itu `stable` digugurkan.
create or replace function public.semak_kunci(p_kunci text)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare v_hash text;
begin
  -- Tulisan tanpa kesan: penolak GET. MESTI dahulu — lihat komen di atas.
  update admin_config set kunci_hash = kunci_hash where false;
  select kunci_hash into v_hash from admin_config;
  if v_hash is null or crypt(coalesce(p_kunci, ''), v_hash) <> v_hash then
    raise exception 'kunci_salah';
  end if;
end $$;

-- NOTA, disahkan secara langsung pada 2026-08-07: volatiliti TIDAK menentukan
-- kaedah HTTP. PostgREST menghalakan GET kepada mana-mana RPC tanpa mengira
-- VOLATILE/STABLE/IMMUTABLE — yang membezakan hanyalah transaksi READ ONLY yang
-- digunakannya untuk GET. Sebab itu gerbang semak_kunci() di atas yang menutup
-- laluan GET untuk ketiga-tiga urus_*, bukan penandaan volatiliti fungsi ini.
create or replace function public.urus_overview(p_kunci text)
returns json language plpgsql security definer set search_path = public
as $$
begin
  perform semak_kunci(p_kunci);
  return json_build_object(
    'tempahan', coalesce((
      select json_agg(json_build_object(
        'id', r.id, 'hadiah', gi.nama, 'hadiah_aktif', gi.aktif,
        'nama', g.nama, 'telefon', g.telefon, 'pada', r.created_at)
        order by r.created_at desc)
      from reservation r
      join guest g on g.id = r.guest_id
      join gift_item gi on gi.id = r.gift_item_id), '[]'::json),
    'sumbangan', coalesce((
      select json_agg(json_build_object(
        'id', c.id, 'tabung', fg.nama, 'nama', g.nama, 'telefon', g.telefon,
        'amaun', c.amaun, 'pada', c.created_at)
        order by c.created_at desc)
      from contribution c
      join guest g on g.id = c.guest_id
      join fund_goal fg on fg.id = c.goal_id), '[]'::json),
    'jumlah', json_build_object(
      'tempahan', (select count(*) from reservation),
      'sumbangan', (select count(*) from contribution),
      'rm', (select coalesce(sum(amaun), 0) from contribution))
  );
end $$;

create or replace function public.urus_batal_tempahan(p_kunci text, p_reservation_id bigint)
returns boolean language plpgsql security definer set search_path = public
as $$
declare v_kira int;
begin
  perform semak_kunci(p_kunci);
  delete from reservation where id = p_reservation_id;
  get diagnostics v_kira = row_count;
  return v_kira > 0;
end $$;

create or replace function public.urus_padam_sumbangan(p_kunci text, p_contribution_id bigint)
returns boolean language plpgsql security definer set search_path = public
as $$
declare v_kira int;
begin
  perform semak_kunci(p_kunci);
  delete from contribution where id = p_contribution_id;
  get diagnostics v_kira = row_count;
  return v_kira > 0;
end $$;

revoke execute on function public.semak_kunci(text) from public, anon, authenticated;

-- ---------- Admin /urus — kandungan (sunting hadiah & tabung) ----------------
-- TIADA perubahan skema: semua medan sudah wujud pada gift_item dan fund_goal.
-- Yang ditambah hanyalah tiga RPC di sebalik frasa laluan bcrypt yang sedia ada.
--
-- Tiada satu pun daripada fungsi ini boleh `stable`: semak_kunci() melakukan
-- tulisan tanpa kesan sebagai kenyataan pertamanya, supaya sebarang GET ditolak
-- 25006 dan frasa laluan tidak pernah sampai ke URL. Menandakan fungsi ini
-- stable akan memecahkan sifat itu.

-- ---------- Pembantu dalaman (BUKAN API) -------------------------------------
-- Pautan kosong dibenarkan; selain itu mesti http:// atau https://.
create or replace function public.semak_pautan(p_url text)
returns text language plpgsql immutable set search_path = public
as $$
declare v text;
begin
  v := btrim(coalesce(p_url, ''));
  if v = '' then return ''; end if;
  if v !~* '^https?://' then raise exception 'pautan_tidak_sah'; end if;
  return left(v, 500);
end $$;

revoke execute on function public.semak_pautan(text) from public, anon, authenticated;

-- ---------- Baca kandungan (TERMASUK yang disorok) ---------------------------
-- Polisi anon hanya memulangkan baris `aktif`, jadi papan urus perlu bacaannya
-- sendiri — kalau tidak, item yang disorok jadi halimunan dan tidak boleh
-- dipulihkan semula dari papan.
create or replace function public.urus_senarai_kandungan(p_kunci text)
returns json language plpgsql security definer set search_path = public
as $$
begin
  perform semak_kunci(p_kunci);
  return json_build_object(
    'hadiah', coalesce((
      select json_agg(json_build_object(
        'id', g.id, 'nama', g.nama, 'pautan', g.pautan, 'gambar_url', g.gambar_url,
        'nota', g.nota, 'aktif', g.aktif, 'urutan', g.urutan,
        'ada_tempahan', exists (select 1 from reservation r where r.gift_item_id = g.id))
        order by g.urutan, g.id)
      from gift_item g), '[]'::json),
    'tabung', coalesce((
      select json_agg(json_build_object(
        'id', f.id, 'nama', f.nama, 'sasaran', f.sasaran, 'emoji', f.emoji,
        'aktif', f.aktif, 'urutan', f.urutan,
        'ada_sumbangan', exists (select 1 from contribution c where c.goal_id = f.id))
        order by f.urutan, f.id)
      from fund_goal f), '[]'::json)
  );
end $$;

-- ---------- Simpan (cipta ATAU sunting) --------------------------------------
-- p_id null = cipta baharu, urutan = max + 1 (tiada susun semula; item baharu
-- sentiasa di hujung). aktif dihantar dalam muatan yang sama, jadi "sorok"
-- hanyalah satu simpanan biasa.
create or replace function public.urus_simpan_hadiah(
  p_kunci text, p_id bigint, p_nama text, p_pautan text,
  p_gambar_url text, p_nota text, p_aktif boolean)
returns bigint language plpgsql security definer set search_path = public
as $$
declare v_nama text; v_pautan text; v_gambar text; v_nota text; v_id bigint;
begin
  perform semak_kunci(p_kunci);
  v_nama := left(btrim(coalesce(p_nama, '')), 120);
  if v_nama = '' then raise exception 'nama_diperlukan'; end if;
  v_pautan := semak_pautan(p_pautan);
  v_gambar := semak_pautan(p_gambar_url);
  v_nota := left(btrim(coalesce(p_nota, '')), 300);

  if p_id is null then
    insert into gift_item (nama, pautan, gambar_url, nota, aktif, urutan)
    values (v_nama, v_pautan, v_gambar, v_nota, coalesce(p_aktif, true),
            (select coalesce(max(urutan), 0) + 1 from gift_item))
    returning id into v_id;
  else
    update gift_item
       set nama = v_nama, pautan = v_pautan, gambar_url = v_gambar,
           nota = v_nota, aktif = coalesce(p_aktif, aktif)
     where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'hadiah_tiada'; end if;
  end if;
  return v_id;
end $$;

-- Emoji kosong bermaksud "jangan usik": lalai lajur hanya berlaku pada insert,
-- jadi pada update nilai sedia ada dikekalkan — kalau tidak, medan yang
-- dibiarkan kosong akan memadam emoji secara senyap.
create or replace function public.urus_simpan_tabung(
  p_kunci text, p_id bigint, p_nama text, p_sasaran numeric,
  p_emoji text, p_aktif boolean)
returns bigint language plpgsql security definer set search_path = public
as $$
declare v_nama text; v_emoji text; v_id bigint;
begin
  perform semak_kunci(p_kunci);
  v_nama := left(btrim(coalesce(p_nama, '')), 120);
  if v_nama = '' then raise exception 'nama_diperlukan'; end if;
  -- had bawah ialah 0.01, bukan 0: lajur sasaran ialah numeric(10,2), jadi
  -- nilai lebih kecil (cth. 0.004) akan bundar kepada 0.00 semasa insert dan
  -- melanggar CHECK jadual fund_goal dengan ralat mentah, bukan mesej ini.
  if p_sasaran is null or p_sasaran < 0.01 or p_sasaran > 1000000 then
    raise exception 'sasaran_tidak_sah';
  end if;
  v_emoji := left(btrim(coalesce(p_emoji, '')), 8);

  if p_id is null then
    insert into fund_goal (nama, sasaran, emoji, aktif, urutan)
    values (v_nama, p_sasaran,
            case when v_emoji = '' then '🎯' else v_emoji end,
            coalesce(p_aktif, true),
            (select coalesce(max(urutan), 0) + 1 from fund_goal))
    returning id into v_id;
  else
    update fund_goal
       set nama = v_nama, sasaran = p_sasaran,
           emoji = case when v_emoji = '' then emoji else v_emoji end,
           aktif = coalesce(p_aktif, aktif)
     where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'tabung_tiada'; end if;
  end if;
  return v_id;
end $$;

-- =============================================================================
-- OPTIONAL SEED — a little sample data so the UI isn't empty in dev.
-- Comment out if you don't want it.
--
-- AMARAN: blok ini SAHAJA yang tidak boleh diulang. Jadual kandungan
-- (homestay, aktiviti, gift_item, fund_goal) sengaja tidak digugurkan di atas —
-- data ujian anda sendiri mungkin ada di dalamnya — jadi Run kali kedua akan
-- MENAMBAH satu lagi salinan setiap baris contoh di bawah, bukan menggantikannya.
-- Kalau anda menjalankan fail ini semula, komenkan blok ini dahulu, atau padam
-- baris contoh yang berganda dalam Table Editor selepas itu.
-- =============================================================================

insert into public.homestay (nama, jarak_ke_venue, anggaran_harga, pautan, nota, urutan) values
  ('Homestay Contoh A', '5 min', 'RM150/malam', 'https://example.com', 'Berdekatan dewan', 1),
  ('Homestay Contoh B', '10 min', 'RM120/malam', 'https://example.com', '', 2);

insert into public.aktiviti (nama, kategori, jarak, pautan, urutan) values
  ('Tempat Menarik Contoh', 'Rekreasi', '15 min', 'https://example.com', 1);

insert into public.gift_item (nama, pautan, urutan) values
  ('Hadiah Contoh 1', 'https://example.com', 1),
  ('Hadiah Contoh 2', 'https://example.com', 2);

insert into public.fund_goal (nama, sasaran, emoji, urutan) values
  ('Tabung Contoh', 1000, '🎯', 1);
