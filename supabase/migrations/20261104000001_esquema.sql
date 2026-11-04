-- AguaAlerta: esquema, permisos y operaciones del sistema.
-- Las reglas de negocio viven en la base de datos: el cliente solo llama a estas operaciones.

create type public.rol_usuario as enum ('ciudadano', 'oficinista', 'fontanero', 'administrador');
create type public.tipo_incidente as enum ('fuga', 'averia', 'falla_servicio');
create type public.estado_reporte as enum ('pendiente', 'en_proceso', 'resuelto');
create type public.prioridad_reporte as enum ('alta', 'media', 'baja');
create type public.medio_recepcion as enum ('app', 'telefono', 'oficina', 'otro');
create type public.tipo_evento as enum ('creacion', 'estado', 'prioridad', 'asignacion', 'nota');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(trim(nombre)) between 2 and 120),
  telefono text check (telefono is null or char_length(telefono) <= 30),
  rol public.rol_usuario not null default 'ciudadano',
  activo boolean not null default true,
  privacidad_aceptada_en timestamptz,
  creado_en timestamptz not null default now()
);

create sequence public.reporte_numero_seq;

create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default 'AA-' || lpad(nextval('public.reporte_numero_seq')::text, 4, '0'),
  solicitud_id uuid not null,
  registrado_por uuid not null references public.profiles (id),
  ciudadano_id uuid references public.profiles (id),
  medio public.medio_recepcion not null default 'app',
  contacto_nombre text not null,
  contacto_telefono text,
  tipo public.tipo_incidente not null,
  descripcion text not null check (char_length(trim(descripcion)) between 3 and 1000),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  senas text check (senas is null or char_length(senas) <= 300),
  estado public.estado_reporte not null default 'pendiente',
  prioridad public.prioridad_reporte,
  responsable_id uuid references public.profiles (id),
  version integer not null default 1,
  creado_en timestamptz not null default now(),
  estado_cambiado_en timestamptz not null default now(),
  visto_en timestamptz,
  unique (registrado_por, solicitud_id),
  constraint reporte_con_ubicacion check (
    (lat is not null and lng is not null) or char_length(trim(coalesce(senas, ''))) > 0
  )
);
create index reportes_ciudadano_idx on public.reportes (ciudadano_id, creado_en desc);
create index reportes_responsable_idx on public.reportes (responsable_id);

create table public.reporte_fotos (
  id uuid primary key default gen_random_uuid(),
  reporte_id uuid not null references public.reportes (id) on delete cascade,
  ruta text not null unique,
  creado_en timestamptz not null default now()
);
create index reporte_fotos_reporte_idx on public.reporte_fotos (reporte_id);

create table public.eventos (
  id bigint generated always as identity primary key,
  reporte_id uuid not null references public.reportes (id) on delete cascade,
  tipo public.tipo_evento not null,
  valor text not null,
  autor_id uuid references public.profiles (id),
  visible_ciudadano boolean not null default false,
  creado_en timestamptz not null default now()
);
create index eventos_reporte_idx on public.eventos (reporte_id, creado_en desc);

create table public.notificaciones (
  id bigint generated always as identity primary key,
  reporte_id uuid not null references public.reportes (id) on delete cascade,
  enviado boolean not null,
  detalle text,
  creado_en timestamptz not null default now()
);

create table public.intentos_login (
  correo_hash text primary key,
  fallos integer not null default 0,
  bloqueado_hasta timestamptz,
  actualizado_en timestamptz not null default now()
);

-- Rol de la persona con sesion, solo si su cuenta esta activa.
create function public.mi_rol() returns public.rol_usuario
language sql stable security definer set search_path = '' as $$
  select rol from public.profiles where id = auth.uid() and activo
$$;

-- Crea el perfil al crear el usuario, siempre como ciudadano. Solo el servidor asigna perfiles de personal.
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_acepto boolean := coalesce((new.raw_user_meta_data ->> 'privacidad_aceptada')::boolean, false);
begin
  if not v_acepto then
    raise exception 'privacidad_no_aceptada' using errcode = 'P0001';
  end if;
  insert into public.profiles (id, nombre, telefono, privacidad_aceptada_en)
  values (
    new.id,
    case when char_length(trim(coalesce(new.raw_user_meta_data ->> 'nombre', ''))) >= 2
      then trim(new.raw_user_meta_data ->> 'nombre') else 'Sin nombre' end,
    nullif(trim(new.raw_user_meta_data ->> 'telefono'), ''),
    now()
  );
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- Siempre debe quedar un administrador activo.
create function public.proteger_ultimo_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.rol = 'administrador' and old.activo
     and (tg_op = 'DELETE' or new.rol <> 'administrador' or not new.activo) then
    perform pg_advisory_xact_lock(hashtext('aguaalerta_admins'));
    if not exists (
      select 1 from public.profiles
      where rol = 'administrador' and activo and id <> old.id
    ) then
      raise exception 'ultimo_administrador' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger guardar_ultimo_admin before update or delete on public.profiles
  for each row execute function public.proteger_ultimo_admin();

-- Operaciones del ciudadano
create function public.crear_reporte(
  p_solicitud uuid, p_tipo public.tipo_incidente, p_descripcion text,
  p_lat double precision, p_lng double precision, p_senas text, p_fotos text[] default '{}'
) returns table (id uuid, numero text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.profiles;
  v_id uuid;
  v_ruta text;
begin
  if public.mi_rol() is distinct from 'ciudadano' then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_fotos, 1), 0) > 3 then
    raise exception 'demasiadas_fotos' using errcode = 'P0001';
  end if;
  foreach v_ruta in array coalesce(p_fotos, '{}') loop
    if v_ruta !~ ('^' || v_uid::text || '/' || p_solicitud::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$') then
      raise exception 'foto_invalida' using errcode = 'P0001';
    end if;
  end loop;

  select r.id into v_id from public.reportes r
    where r.registrado_por = v_uid and r.solicitud_id = p_solicitud;
  if v_id is null then
    select * into v_perfil from public.profiles where profiles.id = v_uid;
    insert into public.reportes (
      solicitud_id, registrado_por, ciudadano_id, medio, contacto_nombre, contacto_telefono,
      tipo, descripcion, lat, lng, senas
    ) values (
      p_solicitud, v_uid, v_uid, 'app', v_perfil.nombre, v_perfil.telefono,
      p_tipo, trim(p_descripcion), p_lat, p_lng, nullif(trim(p_senas), '')
    ) returning reportes.id into v_id;
    insert into public.reporte_fotos (reporte_id, ruta) select v_id, unnest(coalesce(p_fotos, '{}'));
    insert into public.eventos (reporte_id, tipo, valor, autor_id, visible_ciudadano)
      values (v_id, 'creacion', 'pendiente', v_uid, true);
  else
    -- La respuesta anterior se perdio: se aplican las correcciones mientras nadie lo haya atendido.
    update public.reportes r
      set tipo = p_tipo, descripcion = trim(p_descripcion), lat = p_lat, lng = p_lng, senas = nullif(trim(p_senas), '')
      where r.id = v_id and r.version = 1;
    if found then
      delete from public.reporte_fotos f where f.reporte_id = v_id;
      insert into public.reporte_fotos (reporte_id, ruta) select v_id, unnest(coalesce(p_fotos, '{}'));
    end if;
  end if;
  return query select r.id, r.numero from public.reportes r where r.id = v_id;
end $$;

create function public.marcar_visto(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.reportes set visto_en = now()
  where id = p_id and ciudadano_id = auth.uid() and public.mi_rol() = 'ciudadano'
$$;

-- Operaciones del personal
create function public.registrar_reporte_asistido(
  p_solicitud uuid, p_medio public.medio_recepcion, p_nombre text, p_telefono text,
  p_tipo public.tipo_incidente, p_descripcion text,
  p_lat double precision, p_lng double precision, p_senas text
) returns table (id uuid, numero text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('oficinista', 'administrador') then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if p_medio = 'app' then
    raise exception 'medio_invalido' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_nombre, ''))) < 2 or char_length(trim(coalesce(p_telefono, ''))) < 8 then
    raise exception 'contacto_incompleto' using errcode = 'P0001';
  end if;
  select r.id into v_id from public.reportes r
    where r.registrado_por = v_uid and r.solicitud_id = p_solicitud;
  if v_id is null then
    insert into public.reportes (
      solicitud_id, registrado_por, medio, contacto_nombre, contacto_telefono,
      tipo, descripcion, lat, lng, senas
    ) values (
      p_solicitud, v_uid, p_medio, trim(p_nombre), trim(p_telefono),
      p_tipo, trim(p_descripcion), p_lat, p_lng, nullif(trim(p_senas), '')
    ) returning reportes.id into v_id;
    insert into public.eventos (reporte_id, tipo, valor, autor_id, visible_ciudadano)
      values (v_id, 'creacion', 'pendiente', v_uid, true);
  else
    update public.reportes r
      set medio = p_medio, contacto_nombre = trim(p_nombre), contacto_telefono = trim(p_telefono),
          tipo = p_tipo, descripcion = trim(p_descripcion), lat = p_lat, lng = p_lng, senas = nullif(trim(p_senas), '')
      where r.id = v_id and r.version = 1;
  end if;
  return query select r.id, r.numero from public.reportes r where r.id = v_id;
end $$;

create function public.cambiar_estado(p_id uuid, p_estado public.estado_reporte, p_version integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_rol public.rol_usuario := public.mi_rol();
  v public.reportes;
begin
  select * into v from public.reportes where id = p_id for update;
  if not found or v_rol is null or v_rol = 'ciudadano'
     or (v_rol = 'fontanero' and v.responsable_id is distinct from auth.uid()) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if v.version <> p_version then
    raise exception 'conflicto' using errcode = 'P0001';
  end if;
  if v.estado = p_estado then
    return v.version;
  end if;
  update public.reportes
    set estado = p_estado, estado_cambiado_en = now(), version = version + 1
    where id = p_id;
  insert into public.eventos (reporte_id, tipo, valor, autor_id, visible_ciudadano)
    values (p_id, 'estado', p_estado::text, auth.uid(), true);
  return v.version + 1;
end $$;

create function public.cambiar_prioridad(p_id uuid, p_prioridad public.prioridad_reporte, p_version integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v public.reportes;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('oficinista', 'administrador') then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select * into v from public.reportes where id = p_id for update;
  if not found then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if v.version <> p_version then
    raise exception 'conflicto' using errcode = 'P0001';
  end if;
  update public.reportes set prioridad = p_prioridad, version = version + 1 where id = p_id;
  insert into public.eventos (reporte_id, tipo, valor, autor_id)
    values (p_id, 'prioridad', p_prioridad::text, auth.uid());
  return v.version + 1;
end $$;

create function public.asignar_responsable(p_id uuid, p_responsable uuid, p_version integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v public.reportes;
  v_nombre text;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('oficinista', 'administrador') then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select nombre into v_nombre from public.profiles
    where id = p_responsable and rol = 'fontanero' and activo;
  if v_nombre is null then
    raise exception 'responsable_invalido' using errcode = 'P0001';
  end if;
  select * into v from public.reportes where id = p_id for update;
  if not found then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if v.version <> p_version then
    raise exception 'conflicto' using errcode = 'P0001';
  end if;
  update public.reportes set responsable_id = p_responsable, version = version + 1 where id = p_id;
  insert into public.eventos (reporte_id, tipo, valor, autor_id)
    values (p_id, 'asignacion', v_nombre, auth.uid());
  return v.version + 1;
end $$;

create function public.agregar_nota(p_id uuid, p_texto text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_rol public.rol_usuario := public.mi_rol();
  v_resp uuid;
begin
  select responsable_id into v_resp from public.reportes where id = p_id;
  if not found or v_rol is null or v_rol = 'ciudadano'
     or (v_rol = 'fontanero' and v_resp is distinct from auth.uid()) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_texto, ''))) = 0 then
    raise exception 'nota_vacia' using errcode = 'P0001';
  end if;
  insert into public.eventos (reporte_id, tipo, valor, autor_id)
    values (p_id, 'nota', left(trim(p_texto), 1000), auth.uid());
end $$;

-- Conteo atomico de intentos fallidos: solo lo usa la funcion del servidor.
create function public.registrar_fallo_login(p_clave text, p_max integer, p_bloqueo interval)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_fallos integer;
  v_hasta timestamptz;
begin
  insert into public.intentos_login as i (correo_hash, fallos, actualizado_en)
    values (p_clave, 1, now())
    on conflict (correo_hash) do update
      set fallos = case
            when i.bloqueado_hasta > now() then i.fallos
            when i.bloqueado_hasta is not null then 1
            else i.fallos + 1 end,
          bloqueado_hasta = case when i.bloqueado_hasta > now() then i.bloqueado_hasta end,
          actualizado_en = now()
    returning fallos, bloqueado_hasta into v_fallos, v_hasta;
  -- Un intento que llega tarde nunca acorta un bloqueo vigente.
  if v_hasta is not null then
    return true;
  end if;
  if v_fallos >= p_max then
    update public.intentos_login
      set fallos = 0, bloqueado_hasta = now() + p_bloqueo
      where correo_hash = p_clave;
    return true;
  end if;
  return false;
end $$;

-- Quien puede ver que
alter table public.profiles enable row level security;
alter table public.reportes enable row level security;
alter table public.reporte_fotos enable row level security;
alter table public.eventos enable row level security;
alter table public.notificaciones enable row level security;
alter table public.intentos_login enable row level security;

create policy perfil_propio_o_oficina on public.profiles for select to authenticated
  using (id = auth.uid() or (rol <> 'ciudadano' and public.mi_rol() in ('oficinista', 'administrador')));
create policy perfil_editar_propio on public.profiles for update to authenticated
  using (id = auth.uid() and public.mi_rol() is not null) with check (id = auth.uid());

create policy reportes_lectura on public.reportes for select to authenticated using (
  public.mi_rol() in ('oficinista', 'administrador')
  or (public.mi_rol() = 'ciudadano' and ciudadano_id = auth.uid())
  or (public.mi_rol() = 'fontanero' and responsable_id = auth.uid())
);
create policy fotos_lectura on public.reporte_fotos for select to authenticated
  using (exists (select 1 from public.reportes r where r.id = reporte_id));
create policy eventos_lectura on public.eventos for select to authenticated using (
  exists (select 1 from public.reportes r where r.id = reporte_id)
  and (visible_ciudadano or public.mi_rol() <> 'ciudadano')
);
create policy notificaciones_lectura on public.notificaciones for select to authenticated
  using (public.mi_rol() in ('oficinista', 'administrador'));

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.profiles, public.reportes, public.reporte_fotos, public.eventos, public.notificaciones to authenticated;
grant update (nombre, telefono) on public.profiles to authenticated;

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.mi_rol(),
  public.crear_reporte(uuid, public.tipo_incidente, text, double precision, double precision, text, text[]),
  public.marcar_visto(uuid),
  public.registrar_reporte_asistido(uuid, public.medio_recepcion, text, text, public.tipo_incidente, text, double precision, double precision, text),
  public.cambiar_estado(uuid, public.estado_reporte, integer),
  public.cambiar_prioridad(uuid, public.prioridad_reporte, integer),
  public.asignar_responsable(uuid, uuid, integer),
  public.agregar_nota(uuid, text)
to authenticated;
grant execute on function public.registrar_fallo_login(text, integer, interval) to service_role;

-- Fotografias: privadas, solo JPG o PNG, hasta 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png']);

create policy fotos_subir on storage.objects for insert to authenticated with check (
  bucket_id = 'fotos'
  and public.mi_rol() = 'ciudadano'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy fotos_ver on storage.objects for select to authenticated using (
  bucket_id = 'fotos' and exists (
    select 1 from public.reporte_fotos f
    join public.reportes r on r.id = f.reporte_id
    where f.ruta = name
  )
);
