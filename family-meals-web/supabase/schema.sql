-- 家庭三餐 · Supabase 建表脚本
-- 在 Supabase → SQL Editor 中粘贴并 Run

create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  description text default '',
  materials text not null,
  steps text not null,
  uploader_id text not null,
  uploader_nick text not null,
  create_time timestamptz default now()
);

create table if not exists menu (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references dishes(id) on delete cascade,
  name text not null,
  image_url text not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  added_by_id text not null,
  added_by_nick text not null,
  added_time timestamptz default now(),
  unique (dish_id, meal_type)
);

create index if not exists dishes_create_time on dishes (create_time desc);
create index if not exists menu_added_time on menu (added_time desc);

alter table dishes enable row level security;
alter table menu enable row level security;

drop policy if exists "dishes_select" on dishes;
drop policy if exists "dishes_insert" on dishes;
drop policy if exists "menu_select" on menu;
drop policy if exists "menu_insert" on menu;
drop policy if exists "menu_delete" on menu;

create policy "dishes_select" on dishes for select using (true);
create policy "dishes_insert" on dishes for insert with check (true);
create policy "menu_select" on menu for select using (true);
create policy "menu_insert" on menu for insert with check (true);
create policy "menu_delete" on menu for delete using (true);

-- Storage：在控制台创建 public bucket「dish-images」
-- 并在 Storage → Policies 添加允许 anon 上传/读取的策略（见 README）
