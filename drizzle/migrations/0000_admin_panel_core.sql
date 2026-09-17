create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users can read their own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  duration text not null default 'Add duration',
  eligibility text not null default 'Add eligibility',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.courses to anon;
grant select, insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;
create policy "Anyone can read courses" on public.courses for select to anon, authenticated using (true);
create policy "Admins can insert courses" on public.courses for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update courses" on public.courses for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete courses" on public.courses for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  course text,
  message text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
grant insert on public.enquiries to anon;
grant select, insert, update, delete on public.enquiries to authenticated;
grant all on public.enquiries to service_role;
alter table public.enquiries enable row level security;
create policy "Anyone can submit an enquiry" on public.enquiries for insert to anon, authenticated with check (true);
create policy "Admins can read enquiries" on public.enquiries for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update enquiries" on public.enquiries for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete enquiries" on public.enquiries for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.courses (name, description, duration, eligibility, sort_order) values
  ('Course Name', 'Short description of the programme and what students will learn.', 'Add duration', 'Add eligibility', 1),
  ('Course Name', 'A second editable programme card for confirmed course details.', 'Add duration', 'Add eligibility', 2);
