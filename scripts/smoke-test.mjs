#!/usr/bin/env node
// Drives Crystal Ball's full four-phase board flow (Situation -> Options -> Evaluation ->
// Decision -> Sign) in a headless browser, end to end, against a running instance —
// the "does the app actually work" check that unit tests and `tsc` can't give you. Run via
// `scripts/run-app.sh`, which starts the dev servers first; or point it at any already-running
// instance: `node scripts/smoke-test.mjs http://localhost:5173`.
//
// Exits 0 and prints "SMOKE TEST PASSED" if every step's assertions hold and the browser logged
// no console errors; otherwise exits 1 with the failing step and a screenshot of what the page
// looked like at that point.

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(here, '.run-app.local')
const screenshotDir = path.join(outDir, 'screenshots')
const baseUrl = process.argv[2] ?? 'http://localhost:5173'

const SCORE_DIMENSIONS = ['People', 'Time', 'Money', 'Quality', 'Service', 'Price']

async function main() {
  await mkdir(screenshotDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } })

  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))

  let stepIndex = 0
  let currentStep = 'startup'
  async function step(name, fn) {
    stepIndex += 1
    currentStep = name
    console.log(`[${stepIndex}] ${name}`)
    await fn()
    await page.screenshot({
      path: path.join(screenshotDir, `${String(stepIndex).padStart(2, '0')}-${slug(name)}.png`),
      fullPage: true,
    })
  }

  function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function fillEditor(index, text) {
    await page.locator('[contenteditable="true"]').nth(index).click()
    await page.keyboard.type(text)
  }

  async function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed at step "${currentStep}": ${message}`)
  }

  try {
    await step('load home page', async () => {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'New board' }).waitFor()
    })

    const boardTitle = `Smoke test ${new Date().toISOString()}`
    await step('create a board', async () => {
      await page.getByRole('button', { name: 'New board' }).click()
      await page.getByLabel('Board title').fill(boardTitle)
      await page.getByRole('button', { name: 'Create Board' }).click()
      await page.waitForURL(/\/board\//)
      await page.getByText('Problem statement. Try to keep it').waitFor()
    })

    await step('phase 1 — situation', async () => {
      await fillEditor(0, 'Our QC lab is backlogged on OD test sample review.')
      await page.locator('label', { hasText: 'Yes' }).click()
      const body = await page.locator('body').innerText()
      await assert(body.includes('Our QC lab is backlogged'), 'situation text should be visible')
      await page.getByRole('button', { name: 'Next >' }).click()
    })

    const optionTitles = ['Hire a temp QC technician', 'Automate the OD test intake queue']
    await step('phase 2 — options', async () => {
      const optionInput = page.getByPlaceholder('Type an option, press Enter')
      for (const title of optionTitles) {
        await optionInput.fill(title)
        await optionInput.press('Enter')
      }
      const body = await page.locator('body').innerText()
      for (const title of optionTitles) {
        await assert(body.includes(title), `option "${title}" should be listed`)
      }
      await page.getByRole('button', { name: 'Next >' }).click()
    })

    const scores = [
      [3, 3, 3, 4, 4, 4], // option 1: totals 21
      [5, 5, 5, 5, 5, 5], // option 2: totals 30
    ]
    await step('phase 3 — evaluation (good/bad + ratings, merged)', async () => {
      // Option 1's walkthrough step: Good/Bad text plus every rating property, side by side —
      // both now live in the same accordion panel (the columns 3+4 merge).
      await fillEditor(0, 'Fast to set up')
      await fillEditor(1, 'Costs overtime budget')
      for (const [dimIndex, dim] of SCORE_DIMENSIONS.entries()) {
        await page.getByRole('button', { name: `${dim}: ${scores[0][dimIndex]}` }).first().click()
      }
      await page.getByRole('button', { name: 'Next >' }).click() // advance to option 2's walkthrough step

      await fillEditor(0, 'Scales well')
      await fillEditor(1, 'Slow to roll out')
      for (const [dimIndex, dim] of SCORE_DIMENSIONS.entries()) {
        await page.getByRole('button', { name: `${dim}: ${scores[1][dimIndex]}` }).first().click()
      }
      await page.getByRole('button', { name: 'Next >' }).click() // advance to phase 4
    })

    await step('phase 4 — decision leaderboard', async () => {
      const leaderboard = page.getByTestId('decision-leaderboard')
      await assert(await page.getByText('Ranking leaderboard').isVisible(), 'Decision column should show its ranking leaderboard')
      const leaderboardText = await leaderboard.innerText()
      await assert(
        leaderboardText.includes('30 pts') && leaderboardText.includes('21 pts'),
        'each option should show its total points',
      )
      const automateIndex = leaderboardText.indexOf('Automate the OD test intake queue')
      const hireIndex = leaderboardText.indexOf('Hire a temp QC technician')
      await assert(
        automateIndex >= 0 && hireIndex >= 0 && automateIndex < hireIndex,
        'higher-scoring option (30 pts) should be listed above the lower-scoring one (21 pts)',
      )
      const body = await page.locator('body').innerText()
      await assert(
        body.includes('Scales well') && body.includes('Fast to set up'),
        'the Evaluation column should stay visible as a read-only reference alongside Decision, showing each option\'s Good/Bad',
      )
    })

    await step('decision — choose, countermeasure, sign', async () => {
      await page.getByRole('button', { name: 'Select Automate the OD test intake queue' }).click()
      await fillEditor(0, 'Provision the automation budget ahead of rollout.')
      await page.getByPlaceholder('e.g. Write an RFC').fill('Kick off automation pilot')
      await page.getByLabel('Owner').fill('Priya')
      await page.getByLabel('Deadline').fill('01 Oct 2026')
      await page.keyboard.press('Escape')
      await page.getByLabel('Approved by').fill('Sam')

      const signButton = page.getByRole('button', { name: 'Sign Decision' })
      await assert(await signButton.isEnabled(), 'Sign Decision should be enabled once every required field is filled')
      await signButton.click()
      await page.getByRole('button', { name: 'Sign and lock' }).click()

      await page.getByText('Board locked').waitFor({ timeout: 5000 })
    })

    await assert(consoleErrors.length === 0, `no browser console errors, got:\n${consoleErrors.join('\n')}`)

    console.log('\nSMOKE TEST PASSED')
    await browser.close()
    process.exit(0)
  } catch (error) {
    console.error(`\nSMOKE TEST FAILED at step "${currentStep}"`)
    console.error(error)
    if (consoleErrors.length > 0) {
      console.error('\nBrowser console errors:')
      for (const line of consoleErrors) console.error(` - ${line}`)
    }
    console.error(`\nScreenshots: ${screenshotDir}`)
    await browser.close()
    process.exit(1)
  }
}

main()
