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
  // Se cuenta por cuenta y origen para que un tercero no pueda dejar fuera a una persona desde otra red.
  const origen = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  const clave = await hash(`${correo.trim().toLowerCase()}|${origen}`);
  const { data: previo } = await db.from("intentos_login").select("*").eq("correo_hash", clave).maybeSingle();
  if (previo?.bloqueado_hasta && new Date(previo.bloqueado_hasta) > new Date()) {
    return json({ error: "bloqueado" }, 429);
  }

  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
    body: JSON.stringify({ email: correo.trim(), password: contrasena }),
  });
  const cuerpo = await r.json();

  if (r.ok) {
    await db.from("intentos_login").delete().eq("correo_hash", clave);
    const { data: perfil } = await db.from("profiles").select("activo").eq("id", cuerpo.user.id).maybeSingle();
    if (!perfil?.activo) return json({ error: "credenciales" }, 401);
    return json({ access_token: cuerpo.access_token, refresh_token: cuerpo.refresh_token });
  }
  if (cuerpo.error_code === "email_not_confirmed") return json({ error: "sin_confirmar" }, 401);

  const { data: bloquear } = await db.rpc("registrar_fallo_login", {
    p_clave: clave,
    p_max: MAX_FALLOS,
    p_bloqueo: `${BLOQUEO_MINUTOS} minutes`,
  });
  return json({ error: bloquear ? "bloqueado" : "credenciales" }, bloquear ? 429 : 401);
});
