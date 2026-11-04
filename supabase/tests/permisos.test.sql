begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- Las pruebas parten de una base vacia; el rollback final restaura todo.
set local session_replication_role = replica;
delete from public.reportes;
delete from public.profiles;
delete from auth.users;
set local session_replication_role = origin;

-- Usuarios de prueba
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'c1@prueba.cr', '{}', '{"nombre":"Ciudadano Uno","telefono":"88880001","privacidad_aceptada":true}'),
  ('00000000-0000-0000-0000-00000000000b', 'c2@prueba.cr', '{}', '{"nombre":"Ciudadano Dos","privacidad_aceptada":true}'),
  ('00000000-0000-0000-0000-00000000000c', 'o@prueba.cr', '{}', '{"nombre":"Oficina","privacidad_aceptada":true}'),
  ('00000000-0000-0000-0000-00000000000d', 'f1@prueba.cr', '{}', '{"nombre":"Fontanero Uno","privacidad_aceptada":true}'),
  ('00000000-0000-0000-0000-00000000000e', 'f2@prueba.cr', '{}', '{"nombre":"Fontanero Dos","privacidad_aceptada":true}'),
  ('00000000-0000-0000-0000-00000000000f', 'a@prueba.cr', '{"rol":"administrador"}', '{"nombre":"Admin","privacidad_aceptada":true}');

update public.profiles set rol='oficinista' where id='00000000-0000-0000-0000-00000000000c';
update public.profiles set rol='fontanero' where id in ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e');
update public.profiles set rol='administrador' where id='00000000-0000-0000-0000-00000000000f';

select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000011','x@prueba.cr','{"nombre":"Sin aviso"}')$$,
  'privacidad_no_aceptada', 'registro sin aviso de privacidad se rechaza');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000012','y@prueba.cr','{"rol":"administrador"}','{"nombre":"Intruso","rol":"administrador","privacidad_aceptada":true}');
select is((select rol::text from public.profiles where id='00000000-0000-0000-0000-000000000012'), 'ciudadano', 'el registro publico siempre crea ciudadano');

create function pg_temp.como(uid text) returns void language sql as $$
  select set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',uid,'role','authenticated')::text, true);
$$;

-- Ciudadano crea reporte
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
create temp table r1 on commit drop as
  select * from public.crear_reporte('10000000-0000-0000-0000-000000000001','fuga','Tubo roto en la acera',10.3,-85.7,null);
select is((select count(*)::int from public.crear_reporte('10000000-0000-0000-0000-000000000001','fuga','Tubo roto en la acera',10.3,-85.7,null) x join r1 on x.id=r1.id), 1, 'reintento devuelve el mismo reporte');
select is((select count(*)::int from public.reportes), 1, 'el reintento no duplica');
select public.crear_reporte('10000000-0000-0000-0000-000000000001','fuga','Descripcion corregida',10.3,-85.7,null);
select is((select descripcion from public.reportes where id=(select id from r1)), 'Descripcion corregida', 'el reintento aplica las correcciones');
select throws_ok($$select public.crear_reporte('10000000-0000-0000-0000-000000000002','fuga','Sin ubicacion',null,null,'  ')$$, null, 'exige mapa o senas');
select lives_ok($$select public.crear_reporte('10000000-0000-0000-0000-000000000003','averia','Solo con senas',null,null,'Porton verde')$$, 'acepta solo senas');
select throws_ok($$select public.crear_reporte('10000000-0000-0000-0000-000000000004','fuga','Foto ajena',1,1,null,array['otro/ruta.jpg'])$$, 'foto_invalida', 'rechaza fotos fuera de su carpeta');
select throws_ok($$select public.crear_reporte('10000000-0000-0000-0000-000000000005','fuga','Ruta maliciosa',1,1,null,array['00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000005/../../otro.jpg'])$$, 'foto_invalida', 'rechaza rutas con saltos de carpeta');
select throws_ok($$update public.reportes set estado='resuelto'$$, '42501', null, 'no puede actualizar reportes directamente');
select throws_ok($$update public.profiles set rol='administrador' where id=auth.uid()$$, '42501', null, 'no puede cambiar su rol');
select throws_ok($$select public.cambiar_estado((select id from r1),'resuelto',1)$$, 'sin_permiso', 'ciudadano no cambia estado');

-- Otro ciudadano
select pg_temp.como('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.reportes), 0, 'no ve reportes ajenos');
select is((select count(*)::int from public.profiles where id<>auth.uid()), 0, 'no ve perfiles ajenos');

-- Oficinista
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.reportes), 2, 'oficinista ve todos');
select is((select count(*)::int from public.profiles where rol = 'ciudadano'), 0, 'oficinista no consulta el padron de ciudadanos');
select lives_ok($$select public.cambiar_prioridad((select id from r1),'alta',1)$$, 'clasifica prioridad');
select throws_ok($$select public.cambiar_estado((select id from r1),'en_proceso',1)$$, 'conflicto', 'detecta cambio simultaneo');
select lives_ok($$select public.asignar_responsable((select id from r1),'00000000-0000-0000-0000-00000000000d',2)$$, 'asigna fontanero');
select throws_ok($$select public.asignar_responsable((select id from r1),'00000000-0000-0000-0000-00000000000a',3)$$, 'responsable_invalido', 'no asigna a un ciudadano');
select lives_ok($$select public.agregar_nota((select id from r1),'Nota interna')$$, 'agrega nota');

-- Fontaneros
select pg_temp.como('00000000-0000-0000-0000-00000000000e');
select is((select count(*)::int from public.reportes), 0, 'fontanero no asignado no ve el reporte');
select throws_ok($$select public.cambiar_estado((select id from r1),'en_proceso',3)$$, 'sin_permiso', 'fontanero no asignado no cambia estado');
select pg_temp.como('00000000-0000-0000-0000-00000000000d');
select lives_ok($$select public.cambiar_estado((select id from r1),'en_proceso',3)$$, 'fontanero asignado cambia estado');

-- El ciudadano no ve notas internas
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.eventos where reporte_id=(select id from r1) and tipo in ('nota','prioridad','asignacion')), 0, 'ciudadano no ve eventos internos');

-- Ultimo administrador y cuentas inactivas
reset role;
select throws_ok($$update public.profiles set activo=false where id='00000000-0000-0000-0000-00000000000f'$$, 'ultimo_administrador', 'protege al ultimo administrador');
update public.profiles set activo=false where id='00000000-0000-0000-0000-00000000000a';
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.reportes), 0, 'cuenta desactivada no ve datos');

reset role;
select is(public.registrar_fallo_login('prueba', 1, '15 minutes'), true, 'el limite de intentos bloquea');
create temp table bloqueo on commit drop as select bloqueado_hasta from public.intentos_login where correo_hash='prueba';
select is(public.registrar_fallo_login('prueba', 5, '15 minutes'), true, 'un intento tardio sigue bloqueado');
select is((select bloqueado_hasta from public.intentos_login where correo_hash='prueba'), (select bloqueado_hasta from bloqueo), 'un intento tardio no acorta el bloqueo');

select * from finish();
rollback;
