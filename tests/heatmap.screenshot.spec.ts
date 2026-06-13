import { expect, test } from '@playwright/test'

// Run the dev server first:
// npm.cmd run dev -- --host 127.0.0.1 --port 5174
test('captures the Yeongju heatmap screen', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (/shader|webgl|deck/i.test(text)) browserErrors.push(text)
  })
  page.on('pageerror', (error) => {
    browserErrors.push(error.message)
  })

  await page.goto('http://127.0.0.1:5174/', {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForTimeout(1000)
  expect(browserErrors.join('\n')).not.toMatch(/supabase|ERR_NAME_NOT_RESOLVED/i)

  await page.goto('http://127.0.0.1:5174/heatmap', {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForTimeout(5000)

  const controller = page.locator('.heatmap-map-controller')
  await expect(controller).toBeVisible()

  const locationText = await controller.locator('small').last().textContent()
  const locationCount = Number(locationText?.replace(/[^\d]/g, '') ?? 0)
  expect(locationCount).toBeGreaterThanOrEqual(400)
  await expect(page.getByText(/Compilation error in fragment shader/)).toHaveCount(0)
  expect(browserErrors.join('\n')).not.toMatch(/Compilation error in fragment shader/)

  await page.screenshot({
    path: 'screenshots/heatmap.png',
    fullPage: true,
  })
})
