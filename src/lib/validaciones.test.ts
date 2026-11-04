import { describe, expect, it } from 'vitest'
import {
  contrasenaValida,
  correoValido,
  ERROR_FOTO,
  ubicacionValida,
  validarFoto,
} from './validaciones'
import { ordenarPrioridad } from './formato'
import { errorFuncion } from './errores'
describe('Datos del formulario', () => {
  it('rechaza correos incompletos y contraseñas cortas', () => {
    expect(correoValido('vecino@correo')).toBe(false)
    expect(correoValido(' vecino@correo.cr ')).toBe(true)
    expect(contrasenaValida('1234567')).toBe(false)
    expect(contrasenaValida('12345678')).toBe(true)
  })
  it('acepta señas o coordenadas válidas, incluyendo cero', () => {
    expect(ubicacionValida(null, 'Frente a la plaza')).toBe(true)
    expect(ubicacionValida([0, 0], '')).toBe(true)
    expect(ubicacionValida(null, ' ')).toBe(false)
    expect(ubicacionValida([100, 0], '')).toBe(false)
  })
})
describe('Contenido de fotografías', () => {
  it('reconoce firmas reales sin depender del MIME declarado', async () => {
    await expect(
      validarFoto(new Blob([new Uint8Array([255, 216, 255])], { type: 'text/plain' }))
    ).resolves.toBe('jpg')
    await expect(
      validarFoto(new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]))
    ).resolves.toBe('png')
  })
  it('rechaza archivos falsos, truncados y mayores a 5 MB', async () => {
    await expect(validarFoto(new Blob(['falso'], { type: 'image/png' }))).rejects.toThrow(
      ERROR_FOTO
    )
    await expect(validarFoto(new Blob([new Uint8Array([137, 80])]))).rejects.toThrow(ERROR_FOTO)
    await expect(validarFoto(new Blob([new Uint8Array(5242881)]))).rejects.toThrow(ERROR_FOTO)
  })
  it('acepta exactamente 5 MB', async () => {
    const bytes = new Uint8Array(5242880)
    bytes.set([255, 216, 255])
    await expect(validarFoto(new Blob([bytes]))).resolves.toBe('jpg')
  })
})
it('ordena por prioridad y antigüedad sin modificar la lista original', () => {
  const lista = [
    { prioridad: null, creado_en: '2026-01-01' },
    { prioridad: 'alta', creado_en: '2026-02-01' },
    { prioridad: 'alta', creado_en: '2026-01-01' },
    { prioridad: 'baja', creado_en: '2026-01-01' },
  ]
  expect(ordenarPrioridad(lista)).toEqual([lista[2], lista[1], lista[3], lista[0]])
  expect(lista[0].prioridad).toBeNull()
})
it('lee el cuerpo de errores de funciones', async () => {
  await expect(
    errorFuncion({ context: new Response(JSON.stringify({ error: 'bloqueado' })) })
  ).resolves.toBe('Demasiados intentos. Inténtelo más tarde')
  await expect(errorFuncion({ context: new Response('no es JSON') })).resolves.toBe(
    'No se pudo confirmar el cambio'
  )
})
