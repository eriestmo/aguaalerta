// Inicio de sesion con bloqueo temporal: 5 intentos fallidos seguidos bloquean la cuenta 15 minutos.
import { admin, cors, json } from "../_shared/comun.ts";

const MAX_FALLOS = 5;
const BLOQUEO_MINUTOS = 15;

async function hash(texto: string) {
  const datos = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(datos)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);

  const { correo, contrasena } = await req.json().catch(() => ({}));
  if (typeof correo !== "string" || typeof contrasena !== "string") {
    return json({ error: "credenciales" }, 400);
  }

  const db = admin();
  // El contador y la autenticacion usan la misma forma del correo, para que una variante no sume aparte.
  const correoNormal = correo.trim().toLowerCase();
  if (!/^[\x21-\x7e]+@[\x21-\x7e]+$/.test(correoNormal)) return json({ error: "credenciales" }, 401);

  // Se cuenta por cuenta: los encabezados de origen los puede falsificar quien llama.
  const clave = await hash(correoNormal);
  const { data: previo } = await db.from("intentos_login").select("*").eq("correo_hash", clave).maybeSingle();
  if (previo?.bloqueado_hasta && new Date(previo.bloqueado_hasta) > new Date()) {
    return json({ error: "bloqueado" }, 429);
  }

  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
    body: JSON.stringify({ email: correoNormal, password: contrasena }),
  });
  const cuerpo = await r.json();

  if (r.ok) {
    await db.from("intentos_login").delete().eq("correo_hash", clave);
    const { data: perfil } = await db.from("profiles").select("activo").eq("id", cuerpo.user.id).maybeSingle();
    if (!perfil?.activo) return json({ error: "credenciales" }, 401);
    return json({ access_token: cuerpo.access_token, refresh_token: cuerpo.refresh_token });
  }
  if (cuerpo.error_code === "email_not_confirmed") return json({ error: "sin_confirmar" }, 401);
  // Una saturacion o falla del servicio no es una contrasena incorrecta.
  if (cuerpo.error_code !== "invalid_credentials") return json({ error: "temporal" }, 503);

  const { data: bloquear } = await db.rpc("registrar_fallo_login", {
    p_clave: clave,
    p_max: MAX_FALLOS,
    p_bloqueo: `${BLOQUEO_MINUTOS} minutes`,
  });
  return json({ error: bloquear ? "bloqueado" : "credenciales" }, bloquear ? 429 : 401);
});
