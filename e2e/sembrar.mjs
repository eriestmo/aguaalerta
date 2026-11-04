// Crea las cuentas de prueba del entorno local. Nunca se ejecuta contra produccion.
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const env = Object.fromEntries(
  execSync('supabase status -o env', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]
    })
)
if (!/^http:\/\/127\.0\.0\.1/.test(env.API_URL)) throw new Error('Solo para el entorno local')
const db = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const clave = randomBytes(12).toString('base64url')
const cuentas = { oficinista: 'oficina', fontanero: 'fontanero', administrador: 'admin' }
for (const [rol, usuario] of Object.entries(cuentas)) {
  const { error } = await db.auth.admin.createUser({
    email: `${usuario}@prueba.test`,
    password: clave,
    email_confirm: true,
    user_metadata: { nombre: `Prueba ${rol}`, privacidad_aceptada: true },
  })
  if (error && error.code !== 'email_exists') throw error
  const { data } = await db.auth.admin.listUsers()
  const u = data.users.find((x) => x.email === `${usuario}@prueba.test`)
  await db.auth.admin.updateUserById(u.id, { password: clave })
  const r = await db.from('profiles').update({ rol }).eq('id', u.id)
  if (r.error) throw r.error
}
writeFileSync('e2e/.clave-prueba', clave)
