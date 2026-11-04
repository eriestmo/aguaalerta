# Publicar AguaAlerta para la ASADA

## 1. Lo que necesita antes de empezar

- Una cuenta de Supabase y un proyecto nuevo.
- Un correo para enviar los mensajes del sistema con SMTP, por ejemplo una cuenta de Gmail de la ASADA con verificación en dos pasos y una contraseña de aplicación.
- Un repositorio de GitHub para publicar con GitHub Pages. En un plan gratuito el repositorio debe ser público; el código no contiene secretos.

## 2. Base de datos y funciones

```bash
supabase login
cp .env.produccion.example .env.produccion
```

Complete `.env.produccion` y ejecute:

```bash
./scripts/publicar-supabase.sh
```

El script aplica el esquema, guarda los secretos y publica las funciones. Ejecute `supabase/tests/permisos.test.sql` solo en local: las pruebas borran datos dentro de su transacción.

## 3. Ajustes manuales en el panel de Supabase

En **Authentication**:

1. **URL Configuration:** Site URL `https://eriestmo.github.io/aguaalerta/` y Redirect URLs `https://eriestmo.github.io/aguaalerta/**`.
2. **SMTP Settings:** active el SMTP propio con los mismos datos de `.env.produccion`. Sin esto no se confirman correos con normalidad.
3. **Sign In / Providers, Email:** deje activo Confirm email y use una contraseña mínima de 8 caracteres.
4. **Email Templates:** pegue `supabase/templates/confirmacion.html` y `recuperacion.html`, con los asuntos indicados en `supabase/config.toml`.
5. **Rate Limits:** revise los límites de inicio de sesión. Es la protección que cubre las llamadas directas al servicio de autenticación.

## 4. Publicar la interfaz

En GitHub, dentro del repositorio:

1. **Settings > Pages:** elija **GitHub Actions** como origen.
2. **Settings > Secrets and variables > Actions > Variables:** cree `VITE_BASE` (`/aguaalerta/`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_MAPA_CENTRO`, con la clave pública del proyecto. Nunca use aquí la clave de servicio.
3. Suba la rama `main`; el flujo `Publicar` compila y publica.

Con un dominio propio, cambie `VITE_BASE` a `/`, `ORIGEN_APP`, `RUTA_APP` y las URL del paso 3.

## 5. Primera cuenta de administrador

Regístrese en la app con el correo de quien administrará, confirme el correo y copie su identificador desde **Authentication > Users**. En **SQL Editor** ejecute:

```sql
update public.profiles set rol = 'administrador'
where id = '<id de la cuenta>';
```

Después, esa persona crea al personal desde **Personal**.

## 6. Antes de abrirla a los vecinos

- [ ] La ASADA aprueba el aviso de privacidad, los perfiles, las prioridades y las coordenadas del mapa (`VITE_MAPA_CENTRO`).
- [ ] La ASADA define quién responde las solicitudes de corrección o eliminación de datos.
- [ ] Respaldos activos y una restauración de prueba hecha. El plan gratuito de Supabase no incluye respaldos automáticos diarios y pausa los proyectos inactivos; valore el plan de pago para uso real.
- [ ] Prueba completa en un Android y un iPhone reales: registro, reporte con foto y ubicación, correo de aviso e instalación en la pantalla de inicio.
- [ ] Verifique la política de uso de los mosaicos de OpenStreetMap según el volumen real.

## 7. Límites conocidos

- El bloqueo de 5 intentos aplica al inicio de sesión de la app. Las llamadas directas al servicio de autenticación solo tienen sus límites por IP. Para cerrarlo se puede activar un captcha.
- El correo de cambio de estado lo solicita el navegador de quien hace el cambio; si pierde la conexión justo después, ese correo no se envía, aunque el cambio queda guardado y visible en la app.
- La firma real de las imágenes se valida en el navegador; el servidor limita el tamaño y el tipo declarado. Las fotos son privadas y se sirven como imagen.
