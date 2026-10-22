-- Grabaciones del alfabeto de señas: solo los puntos de la mano, nunca imagen ni video
create table public.senas_muestras (
  id bigint generated always as identity primary key,
  creada_en timestamptz not null default now(),
  letra text not null check (letra in ('A','B','C','D','E','F','I','K','L','M','N','O','P','Q','R','T','U','V','W','X','Y')),
  mano text check (mano in ('Left', 'Right')),
  grabador uuid not null,
  cuadros jsonb not null check (
    jsonb_typeof(cuadros) = 'array'
    and jsonb_array_length(cuadros) between 5 and 120
    and pg_column_size(cuadros) < 400000
  ),
  version smallint not null default 1
);

alter table public.senas_muestras enable row level security;

-- Cualquiera puede agregar una grabación; nadie la puede leer desde el navegador
create policy "agregar grabaciones" on public.senas_muestras
  for insert to anon, authenticated
  with check (true);

create index senas_muestras_letra on public.senas_muestras (letra);
