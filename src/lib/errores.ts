const mensajes: Record<string, string> = {
  credenciales: 'Correo o contraseña incorrectos',
  bloqueado: 'Demasiados intentos. Inténtelo más tarde',
  temporal: 'No se pudo iniciar sesión. Inténtelo de nuevo en unos minutos',
  sin_confirmar: 'Confirme su correo para ingresar',
  ultimo_administrador: 'Debe existir al menos un administrador activo',
  correo_registrado: 'El correo ya está registrado',
  cuenta_propia: 'No puede desactivar su propia cuenta ni cambiar su perfil',
}
export async function errorFuncion(error: unknown, defecto = 'No se pudo confirmar el cambio') {
  if (
    error &&
    typeof error === 'object' &&
    'context' in error &&
    error.context instanceof Response
  ) {
    try {
      const cuerpo: unknown = await error.context.clone().json()
      if (
        cuerpo &&
        typeof cuerpo === 'object' &&
        'error' in cuerpo &&
        typeof cuerpo.error === 'string'
      )
        return mensajes[cuerpo.error] || defecto
    } catch {
      /* La respuesta puede no contener JSON. */
    }
  }
  return defecto
}
