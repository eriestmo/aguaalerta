// Administracion de cuentas del personal. Solo para administradores activos.
import { admin, cors, json, quienLlama } from "../_shared/comun.ts";

const PERFILES = ["oficinista", "fontanero", "administrador"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const quien = await quienLlama(req);
  if (quien?.rol !== "administrador") return json({ error: "sin_permiso" }, 403);

  const db = admin();
  const { accion, id, nombre, correo, rol } = await req.json().catch(() => ({}));

  if (accion === "listar") {
    const { data: perfiles, error } = await db
      .from("profiles")
      .select("id, nombre, telefono, rol, activo")
      .neq("rol", "ciudadano")
      .order("nombre");
    if (error) return json({ error: "listar" }, 400);
    const personas = await Promise.all(
      perfiles.map(async (p) => {
        const { data } = await db.auth.admin.getUserById(p.id);
        return { ...p, correo: data.user?.email ?? "" };
      }),
    );
    return json({ personas });
  }

  if (accion === "crear") {
    if (!PERFILES.includes(rol) || typeof correo !== "string" || typeof nombre !== "string" || nombre.trim().length < 2) {
      return json({ error: "datos" }, 400);
    }
    const { data, error } = await db.auth.admin.createUser({
      email: correo.trim(),
      email_confirm: true,
      user_metadata: { nombre: nombre.trim(), privacidad_aceptada: true },
    });
    if (error) return json({ error: error.code === "email_exists" ? "correo_registrado" : "crear" }, 400);
    const asignado = await db
      .from("profiles")
      .update({ rol, privacidad_aceptada_en: null })
      .eq("id", data.user.id);
    if (asignado.error) {
      await db.auth.admin.deleteUser(data.user.id);
      return json({ error: "crear" }, 400);
    }
    const enlace = await db.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${Deno.env.get("ORIGEN_APP") ?? "http://127.0.0.1:5173"}${Deno.env.get("RUTA_APP") ?? ""}/nueva-contrasena`,
    });
    return json({ id: data.user.id, enlace_enviado: !enlace.error });
  }

  if (["actualizar", "activar", "desactivar"].includes(accion) && typeof id !== "string") {
    return json({ error: "datos" }, 400);
  }
  if (id === quien.id && (accion === "desactivar" || (accion === "actualizar" && rol !== undefined && rol !== quien.rol))) {
    return json({ error: "cuenta_propia" }, 400);
  }

  if (accion === "actualizar") {
    const cambio: Record<string, unknown> = {};
    if (rol !== undefined) {
      if (!PERFILES.includes(rol)) return json({ error: "datos" }, 400);
      cambio.rol = rol;
    }
    if (nombre !== undefined) cambio.nombre = String(nombre).trim();
    const { data: filas, error } = await db
      .from("profiles")
      .update(cambio)
      .eq("id", id)
      .neq("rol", "ciudadano")
      .select("id");
    if (error) return json({ error: error.message.includes("ultimo_administrador") ? "ultimo_administrador" : "actualizar" }, 400);
    if (!filas?.length) return json({ error: "datos" }, 400);
    return json({ ok: true });
  }

  if (accion === "activar" || accion === "desactivar") {
    const activo = accion === "activar";
    const { data: filas, error } = await db
      .from("profiles")
      .update({ activo })
      .eq("id", id)
      .neq("rol", "ciudadano")
      .select("id");
    if (error) return json({ error: error.message.includes("ultimo_administrador") ? "ultimo_administrador" : "actualizar" }, 400);
    if (!filas?.length) return json({ error: "datos" }, 400);
    const bloqueo = await db.auth.admin.updateUserById(id, { ban_duration: activo ? "none" : "87600h" });
    if (bloqueo.error) {
      await db.from("profiles").update({ activo: !activo }).eq("id", id);
      return json({ error: "actualizar" }, 400);
    }
    return json({ ok: true });
  }

  return json({ error: "accion" }, 400);
});
