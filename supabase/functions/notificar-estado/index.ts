// Avisa por correo al ciudadano que cambio el estado de su reporte. Una falla aqui no revierte el cambio.
import nodemailer from "npm:nodemailer@6";
import { admin, cors, json, quienLlama } from "../_shared/comun.ts";

const ESTADOS: Record<string, string> = { pendiente: "Pendiente", en_proceso: "En proceso", resuelto: "Resuelto" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const quien = await quienLlama(req);
  if (!quien || quien.rol === "ciudadano") return json({ error: "sin_permiso" }, 403);

  const { reporte_id } = await req.json().catch(() => ({}));
  const db = admin();
  const { data: r } = await db.from("reportes").select("id, numero, estado, ciudadano_id, responsable_id").eq("id", reporte_id).maybeSingle();
  if (!r || (quien.rol === "fontanero" && r.responsable_id !== quien.id)) return json({ error: "sin_permiso" }, 403);
  if (!r.ciudadano_id) return json({ enviado: false, motivo: "sin_cuenta" });

  // Cada cambio de estado se avisa una sola vez, aunque la funcion se llame de nuevo.
  const [{ data: cambio }, { data: previo }] = await Promise.all([
    db.from("eventos").select("creado_en").eq("reporte_id", r.id).eq("tipo", "estado")
      .order("creado_en", { ascending: false }).limit(1).maybeSingle(),
    db.from("notificaciones").select("creado_en").eq("reporte_id", r.id).eq("enviado", true)
      .order("creado_en", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!cambio || (previo && previo.creado_en >= cambio.creado_en)) {
    return json({ enviado: false, motivo: "sin_cambio" });
  }

  try {
    const { data } = await db.auth.admin.getUserById(r.ciudadano_id);
    if (!data.user?.email) throw new Error("sin correo");
    const transporte = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST"),
      port: Number(Deno.env.get("SMTP_PORT") ?? 587),
      secure: Deno.env.get("SMTP_SEGURO") === "true",
      auth: Deno.env.get("SMTP_USUARIO")
        ? { user: Deno.env.get("SMTP_USUARIO"), pass: Deno.env.get("SMTP_CLAVE") }
        : undefined,
    });
    await transporte.sendMail({
      from: Deno.env.get("SMTP_REMITENTE") ?? "AguaAlerta <no-responder@aguaalerta.local>",
      to: data.user.email,
      subject: `Su reporte ${r.numero} cambió de estado`,
      text: `El estado de su reporte ${r.numero} ahora es: ${ESTADOS[r.estado]}.\n\nPuede ver el detalle en AguaAlerta.`,
    });
    await db.from("notificaciones").insert({ reporte_id: r.id, enviado: true });
    return json({ enviado: true });
  } catch (e) {
    await db.from("notificaciones").insert({ reporte_id: r.id, enviado: false, detalle: String(e).replace(/\S+@\S+/g, "[correo]").slice(0, 300) });
    return json({ enviado: false });
  }
});
