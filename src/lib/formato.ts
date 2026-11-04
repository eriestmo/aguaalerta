export const tipos: Record<string, string> = {
  fuga: 'Fuga de agua',
  averia: 'Avería',
  falla_servicio: 'Falla en el servicio',
}
export const estados: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
}
export const prioridades: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  sin: 'Sin clasificar',
}
export const medios: Record<string, string> = {
  app: 'App',
  telefono: 'Teléfono',
  oficina: 'En la oficina',
  otro: 'Otro',
}
export const fecha = (valor: string) =>
  new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Costa_Rica',
  }).format(new Date(valor))
export const dia = (valor: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(valor))
export function ordenarPrioridad<T extends { prioridad: string | null; creado_en: string }>(
  lista: T[]
) {
  const orden: Record<string, number> = { alta: 0, media: 1, baja: 2 }
  return [...lista].sort(
    (a, b) =>
      (orden[a.prioridad ?? ''] ?? 3) - (orden[b.prioridad ?? ''] ?? 3) ||
      Date.parse(a.creado_en) - Date.parse(b.creado_en)
  )
}

// Enlace absoluto dentro de la app, respetando la ruta base de la publicacion.
export const enlaceApp = (ruta: string) => `${location.origin}${import.meta.env.BASE_URL}${ruta}`

// Lleva el foco al primer campo con error para que el lector de pantalla lo anuncie.
export const enfocarError = () =>
  requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
