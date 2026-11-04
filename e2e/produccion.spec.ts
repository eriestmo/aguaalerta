import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Comprueba la compilacion de produccion servida bajo su ruta base.
test.skip(!process.env.URL_PRODUCCION, 'solo con URL_PRODUCCION')

test('la compilacion carga, inicia sesion y respeta la politica de contenido', async ({ page }) => {
  const url = process.env.URL_PRODUCCION!
  const errores: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text())
  })
  page.on('pageerror', (e) => errores.push(e.message))
  await page.goto(`${url}ingresar`)
  await page.getByLabel('Correo').fill('oficina@prueba.test')
  await page.getByLabel('Contraseña').fill(readFileSync('e2e/.clave-prueba', 'utf8').trim())
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL(/\/aguaalerta\/panel/)
  await page.getByRole('link', { name: 'Registrar reporte' }).first().click()
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible()
  await expect(page.locator('img[alt=""]').first()).toBeVisible()
  expect(errores.filter((e) => /Content Security Policy|violates/i.test(e))).toEqual([])
})
