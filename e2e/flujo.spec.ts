import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const clave = readFileSync('e2e/.clave-prueba', 'utf8').trim()
const marca = Date.now()
const correo = `vecino${marca}@prueba.test`
const contrasena = `Vecino-${marca}`
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)
let numero = ''

async function ingresar(page: Page, usuario: string, pass = clave) {
  await page.goto('/ingresar')
  await page.getByLabel('Correo').fill(usuario)
  await page.getByLabel('Contraseña').fill(pass)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}
async function salir(page: Page) {
  const boton = page.getByRole('button', { name: 'Cerrar sesión' })
  if (!(await boton.isVisible())) await page.getByRole('link', { name: 'Cuenta' }).click()
  await boton.click()
  await expect(page).toHaveURL(/ingresar/)
}
async function correosDe(destino: string) {
  const r = await fetch(
    `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${destino}`)}`
  )
  return (await r.json()).messages as { ID: string; Subject: string }[]
}

test.describe.serial('recorrido completo', () => {
  test('RF-01 registro con validaciones y confirmación de correo', async ({ page }) => {
    await page.goto('/crear-cuenta')
    await page.getByLabel('Nombre').fill('Vecino de prueba')
    await page.getByLabel('Correo').fill('vecino@correo')
    await page.getByLabel('Teléfono').fill('88880000')
    await page.getByLabel('Contraseña').fill('corta')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Formato de correo inválido')).toBeVisible()
    await expect(page.getByText(/al menos 8 caracteres/)).toBeVisible()
    await page.getByLabel('Correo').fill(correo)
    await page.getByLabel('Contraseña').fill(contrasena)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Debe aceptar el aviso de privacidad para continuar')).toBeVisible()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Revise su correo para continuar')).toBeVisible()
    await expect.poll(async () => (await correosDe(correo)).length).toBeGreaterThan(0)
    const [m] = await correosDe(correo)
    const texto = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${m.ID}`)).json()
    const enlace = texto.Text.match(/http\S+verify\S+/)[0]
    await page.goto(enlace)
  })

  test('RF-02 credenciales incorrectas y bloqueo temporal', async ({ page }) => {
    await ingresar(page, correo, 'incorrecta1')
    await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible()
    const otro = `bloqueo${marca}@prueba.test`
    for (let i = 0; i < 4; i++) {
      await ingresar(page, otro, 'incorrecta1')
      await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible()
    }
    await ingresar(page, otro, 'incorrecta1')
    await expect(page.getByText('Demasiados intentos. Inténtelo más tarde')).toBeVisible()
  })

  test('RF-03 a RF-06 reporte con foto, ubicación y consulta', async ({ page }) => {
    await ingresar(page, correo, contrasena)
    await expect(page).toHaveURL(/\/reportes/)
    await expect(page.getByText('Aún no tiene reportes')).toBeVisible()
    await page.goto('/reportes/nuevo')
    await page.getByRole('button', { name: 'Enviar reporte' }).click()
    await expect(page.getByText('Indique la ubicación en el mapa o con señas')).toBeVisible()
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({
        name: 'falsa.png',
        mimeType: 'image/png',
        buffer: Buffer.from('no es imagen'),
      })
    await expect(page.getByText('Adjunte una imagen JPG o PNG de hasta 5 MB')).toBeVisible()
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({ name: 'fuga.png', mimeType: 'image/png', buffer: png })
    await page.getByLabel('¿Qué pasa?').selectOption({ label: 'Fuga de agua' })
    await page.getByLabel('Descripción').fill('Agua saliendo de la acera')
    await page.getByRole('button', { name: 'Usar mi ubicación' }).click()
    await page.getByLabel(/Señas/).fill('Frente a la plaza')
    await page.getByRole('button', { name: 'Enviar reporte' }).click()
    await expect(page.getByText('Reporte enviado')).toBeVisible()
    numero = (
      await page
        .getByText(/^AA-\d+/)
        .first()
        .innerText()
    ).trim()
    await page.goto('/reportes')
    await page.getByText(numero).click()
    await expect(page.getByText('Agua saliendo de la acera')).toBeVisible()
    await expect(page.locator('img[alt*="otograf"]').first()).toBeVisible()
    await page.goto('/panel')
    await expect(page).toHaveURL(/\/reportes/)
    await salir(page)
  })

  test('RF-08 a RF-11 gestión por la oficina', async ({ page }) => {
    await ingresar(page, 'oficina@prueba.test')
    await expect(page).toHaveURL(/\/panel/)
    await page.getByText(numero).click()
    await expect(page.getByRole('heading', { name: numero })).toBeVisible()
    await page.getByRole('button', { name: 'Guardar prioridad' }).waitFor()
    await page.getByLabel('Prioridad').selectOption({ label: 'Alta' })
    await page.getByRole('button', { name: 'Guardar prioridad' }).click()
    await expect(page.getByLabel('Prioridad')).toHaveValue('alta')
    await page.getByLabel('Responsable').selectOption({ label: 'Prueba fontanero' })
    await page.getByRole('button', { name: 'Guardar responsable' }).click()
    await expect(page.getByRole('definition').filter({ hasText: 'Prueba fontanero' })).toBeVisible()
    await page.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page.getByText('Escriba el contenido de la nota')).toBeVisible()
    await page.getByLabel(/Nota/).fill('Nota interna de prueba')
    await page.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(page.getByText('Nota interna de prueba')).toBeVisible()
    await salir(page)
  })

  test('RF-10 el fontanero atiende y confirma la resolución', async ({ page }) => {
    await ingresar(page, 'fontanero@prueba.test')
    await expect(page).toHaveURL(/\/asignados/)
    await page.getByText(numero).click()
    await page.getByRole('button', { name: 'Guardar estado' }).waitFor()
    await page.getByLabel('Actualizar estado').selectOption({ label: 'Resuelto' })
    await page.getByRole('button', { name: 'Guardar estado' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const aviso = page.waitForResponse(/notificar-estado/)
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, marcar resuelto' }).click()
    await aviso
    await expect(page.getByRole('dialog')).toBeHidden()
    await salir(page)
  })

  test('RF-07 el ciudadano ve la novedad, sin notas internas, y recibe correo', async ({
    page,
  }) => {
    await ingresar(page, correo, contrasena)
    await expect(page.getByText('Novedad')).toBeVisible()
    await page.getByText(numero).click()
    await expect(page.getByText('Resuelto').first()).toBeVisible()
    await expect(page.getByText('Nota interna de prueba')).toHaveCount(0)
    await expect
      .poll(async () => (await correosDe(correo)).some((m) => m.Subject.includes(numero)))
      .toBe(true)
    await salir(page)
  })

  test('RF-12 reporte asistido y personal', async ({ page }) => {
    await ingresar(page, 'admin@prueba.test')
    await expect(page).toHaveURL(/\/panel/)
    await page.goto('/panel/registrar')
    await page.getByRole('button', { name: 'Guardar reporte' }).click()
    await expect(page.getByText('Falta el teléfono de contacto')).toBeVisible()
    await page.goto('/panel/personal')
    await expect(page.getByText('oficina@prueba.test')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Desactivar a Prueba administrador' })
    ).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Desactivar a Prueba oficinista' })).toBeEnabled()
  })
})
