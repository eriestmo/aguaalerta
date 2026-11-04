import { createClient } from '@supabase/supabase-js'
export const configurado = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sin-configurar'
)
export type Rol = 'ciudadano' | 'oficinista' | 'administrador' | 'fontanero'
export interface Perfil {
  id: string
  nombre: string
  telefono: string | null
  rol: Rol
  activo: boolean
}
export interface Reporte {
  id: string
  numero: string
  ciudadano_id: string | null
  registrado_por: string
  responsable_id: string | null
  medio: string
  contacto_nombre: string
  contacto_telefono: string | null
  tipo: string
  descripcion: string
  lat: number | null
  lng: number | null
  senas: string | null
  estado: string
  prioridad: string | null
  version: number
  creado_en: string
  estado_cambiado_en: string
  visto_en: string | null
}
export interface Evento {
  id: number
  tipo: string
  valor: string
  creado_en: string
  autor_id: string | null
  visible_ciudadano: boolean
}
