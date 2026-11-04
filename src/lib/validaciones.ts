export const correoValido = (valor: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())
export const contrasenaValida = (valor: string) => valor.length >= 8
export const ubicacionValida = (punto: [number, number] | null, senas: string) =>
  Boolean(
    senas.trim() ||
    (punto && punto.every(Number.isFinite) && Math.abs(punto[0]) <= 90 && Math.abs(punto[1]) <= 180)
  )
export const ERROR_FOTO = 'Adjunte una imagen JPG o PNG de hasta 5 MB'
export async function validarFoto(archivo: Blob): Promise<'jpg' | 'png'> {
  if (archivo.size > 5 * 1024 * 1024) throw new Error(ERROR_FOTO)
  const bytes = new Uint8Array(await archivo.slice(0, 8).arrayBuffer())
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg'
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return 'png'
  throw new Error(ERROR_FOTO)
}
