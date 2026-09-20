#!/usr/bin/env node
// Drives Crystal Ball's full four-phase board flow (Situation -> Options -> Evaluation ->
// Decision -> Sign), plus a look at the read-only export view it links to, in a headless
// browser, end to end, against a running instance —
// the "does the app actually work" check that unit tests and `tsc` can't give you. Run via
// `scripts/run-app.sh`, which starts the dev servers first; or point it at any already-running
// instance: `node scripts/smoke-test.mjs http://localhost:5173`.
//
// Exits 0 and prints "SMOKE TEST PASSED" if every step's assertions hold and the browser logged
// no console errors; otherwise exits 1 with the failing step and a screenshot of what the page
// looked like at that point.
//
// This same step sequence and its per-step screenshots double as the source of the walkthrough
// images in `docs/screenshots/` (see `docs/walkthrough.md`) — regenerated via
// `scripts/capture-doc-screenshots.sh` (`npm run docs:screenshots`), which sets
// SMOKE_SCREENSHOT_DIR and SMOKE_BOARD_TITLE below so the doc images land in a committed
// directory with a clean, stable board title instead of the ephemeral local debug output. That
// way the doc screenshots can never drift from what's actually verified to work here.
//
// Pass --mobile (anywhere in argv) to walk the board in a phone-sized viewport instead of the
// default desktop one, via Playwright's "iPhone 13" device profile (390x844, mobile UA, touch) —
// for checking a responsive/mobile-only change actually renders like a phone, not just a narrow
// desktop window.
//
// Pass --dark to emulate a `prefers-color-scheme: dark` browser — the app has no in-app theme
// toggle (see `App.tsx`'s `defaultColorScheme="auto"`), it just follows the OS/browser
// preference via Mantine, so this is the only way to drive it into dark mode from here.
//
// Both flags can be combined. Screenshots land in a dir named after whichever of
// `screenshots[-mobile][-dark]` applies, so no combination of runs overwrites another (custom
// SMOKE_SCREENSHOT_DIR is used as-is regardless).

import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from 'playwright'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')
const outDir = path.join(here, '.run-app.local')
const cliArgs = process.argv.slice(2)
const mobile = cliArgs.includes('--mobile')
const dark = cliArgs.includes('--dark')
const isCustomScreenshotDir = Boolean(process.env.SMOKE_SCREENSHOT_DIR)
const screenshotDirName = ['screenshots', mobile && 'mobile', dark && 'dark']
  .filter(Boolean)
  .join('-')
const screenshotDir = process.env.SMOKE_SCREENSHOT_DIR
  ? path.resolve(repoRoot, process.env.SMOKE_SCREENSHOT_DIR)
  : path.join(outDir, screenshotDirName)
const baseUrl = cliArgs.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:5173'

// Real worked example from `assets/original-whiteboard-example.png` (a pharma/QC OD test sample
// decision) — text is verbatim off the board, so this exercises the app with realistic content
// instead of a synthetic scenario. The board only ships three rating properties by default (Time,
// Money, Quality); the other three the whiteboard actually scores against (People, Service,
// Price) are added live via the Evaluation column's properties picker, covering that flow too.
const SITUATION_TEXT = 'Reintegrate OD test samples back to final product (already filled + sealed)'

const EXTRA_RATING_PROPERTIES = ['People', 'Service', 'Price']

const OPTIONS = [
  {
    title: 'Return samples in all cases to the lot',
    enabler: 'Simple, consistent',
    blocker: 'Would need to assure no risk to mixing lots/prods and not damaged during transport.',
    scores: { People: 3, Time: 3, Money: 5, Quality: 1, Service: 1, Price: 5 }, // 18
  },
  {
    title: 'Return samples to lot with defined conditions',
    enabler: 'Consistent approach but with rules to follow',
    blocker: 'Must carefully define conditions.',
    scores: { People: 3, Time: 3, Money: 5, Quality: 1, Service: 1, Price: 5 }, // 18
  },
  {
    title: 'Do not return samples to lot',
    enabler: 'Status quo',
    blocker: 'Loss of >60 doses/lot',
    scores: { People: 1, Time: 1, Money: 5, Quality: 3, Service: 1, Price: 5 }, // 16
  },
  {
    title: 'Use samples for Stability, Retains or for QC testing',
    enabler: 'Increase safety of final lot - discussion on retain samples/particles',
    blocker: 'More work to implement (SOP changes)',
    scores: { People: 5, Time: 5, Money: 5, Quality: 3, Service: 3, Price: 1 }, // 22 — chosen
  },
  {
    title: 'Why continue OD testing? Quality stops routine testing',
    enabler: 'Eliminates sample issue',
    blocker: 'May affect filing',
    scores: { People: 5, Time: 3, Money: 5, Quality: 1, Service: 1, Price: 5 }, // 20
  },
]

// Verbatim from the whiteboard's Decision box.
const COUNTERMEASURE_TEXT = 'Perform a one time SOP change with training'

async function main() {
  if (isCustomScreenshotDir) {
    // Only ever touch the configured directory itself — clear it fresh each run so a doc
    // walkthrough regeneration never leaves behind stale images from a previous step count/order.
    await rm(screenshotDir, { recursive: true, force: true })
  }
  await mkdir(screenshotDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({
    ...(mobile ? devices['iPhone 13'] : { viewport: { width: 1400, height: 1100 } }),
    ...(dark ? { colorScheme: 'dark' } : {}),
  })

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
    // A step normally screenshots the main `page`; `fn` can instead return a different Page (e.g.
    // a tab opened via target="_blank") to screenshot that one instead.
    const screenshotTarget = (await fn()) ?? page
    await screenshotTarget.screenshot({
      path: path.join(screenshotDir, `${String(stepIndex).padStart(2, '0')}-${slug(name)}.png`),
      fullPage: true,
    })
  }

  function slug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
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

    const boardTitle = process.env.SMOKE_BOARD_TITLE ?? `Smoke test ${new Date().toISOString()}`
    await step('create a board', async () => {
      await page.getByRole('button', { name: 'New board' }).click()
      await page.getByLabel('Board title').fill(boardTitle)
      await page.getByRole('button', { name: 'Create Board' }).click()
      await page.waitForURL(/\/board\//)
      await page.getByText('What is the problem?').waitFor()
    })

    await step('phase 1 — situation', async () => {
      await fillEditor(0, SITUATION_TEXT)
      await page.locator('label', { hasText: 'Yes' }).click()
      const body = await page.locator('body').innerText()
      await assert(body.includes(SITUATION_TEXT), 'situation text should be visible')
      await page.getByRole('button', { name: 'Next >' }).click()
    })

    await step('phase 2 — options', async () => {
      const optionInput = page.getByPlaceholder('Type an option, press Enter')
      for (const { title } of OPTIONS) {
        await optionInput.fill(title)
        await optionInput.press('Enter')
      }
      const body = await page.locator('body').innerText()
      for (const { title } of OPTIONS) {
        await assert(body.includes(title), `option "${title}" should be listed`)
      }
      await page.getByRole('button', { name: 'Next >' }).click()
    })

    await step('phase 3 — evaluation (good/bad + ratings, merged)', async () => {
      // The board only ships Time/Money/Quality by default — add the other three properties the
      // whiteboard example actually scores against before walking through any option, since
      // they're shared board configuration rather than per-option data.
      const propertyInput = page.getByPlaceholder('Add a rating property, press Enter')
      for (const label of EXTRA_RATING_PROPERTIES) {
        await propertyInput.fill(label)
        await propertyInput.press('Enter')
      }

      for (const option of OPTIONS) {
        // Each option's walkthrough step: Good/Bad text plus every rating property, side by side
        // — both live in the same accordion panel (the columns 3+4 merge).
        await fillEditor(0, option.enabler)
        await fillEditor(1, option.blocker)
        for (const [dim, value] of Object.entries(option.scores)) {
          await page
            .getByRole('button', { name: `${dim}: ${value}` })
            .first()
            .click()
        }
        // On every option but the last this advances the walkthrough to the next option's panel;
        // on the last it advances the phase instead.
        await page.getByRole('button', { name: 'Next >' }).click()
      }
    })

    await step('phase 4 — decision leaderboard', async () => {
      const leaderboard = page.getByTestId('decision-leaderboard')
      await assert(
        await page.getByText('Leaderboard').isVisible(),
        'Decision column should show its ranking leaderboard',
      )
      const leaderboardText = await leaderboard.innerText()
      for (const option of OPTIONS) {
        const total = Object.values(option.scores).reduce((sum, value) => sum + value, 0)
        await assert(
          leaderboardText.includes(`${total} points`),
          `option "${option.title}" should show its total of ${total} points`,
        )
      }
      const chosenIndex = leaderboardText.indexOf(OPTIONS[3].title) // 22 points, the top scorer
      const runnerUpIndex = leaderboardText.indexOf(OPTIONS[4].title) // 20 points
      const lowestIndex = leaderboardText.indexOf(OPTIONS[2].title) // 16 points, the bottom scorer
      await assert(
        chosenIndex >= 0 &&
          runnerUpIndex >= 0 &&
          lowestIndex >= 0 &&
          chosenIndex < runnerUpIndex &&
          runnerUpIndex < lowestIndex,
        'options should be ranked highest-scoring first',
      )
      const body = await page.locator('body').innerText()
      await assert(
        body.includes(OPTIONS[0].enabler) && body.includes(OPTIONS[3].enabler),
        "the Evaluation column should stay visible as a read-only reference alongside Decision, showing each option's Good/Bad",
      )
    })

    // Fourth option added in phase 2, so it's canonically "D" (spreadsheet-style display ID) —
    // matches the whiteboard's own "CHOSEN: Option 4".
    const chosenOption = OPTIONS[3]
    await step('decision — choose, countermeasure', async () => {
      await page.getByRole('button', { name: `Select D: ${chosenOption.title}` }).click()
      await fillEditor(0, COUNTERMEASURE_TEXT)
    })

    await step('decision — agree, sign', async () => {
      // Clicking Sign Decision before approver/agreement are filled shouldn't open the
      // confirmation modal — it should highlight the missing fields in place instead.
      const signButton = page.getByRole('button', { name: 'Sign Decision' })
      await signButton.click()
      await assert(
        !(await page.getByRole('dialog', { name: 'Sign this decision?' }).isVisible()),
        'clicking Sign Decision with missing fields should not open the confirmation modal',
      )

      await page.getByPlaceholder('select…').click()
      await page.getByRole('option', { name: 'by all' }).click()
      await page.getByPlaceholder('Name of the approver').fill('Sam')

      await signButton.click()
      const modal = page.getByRole('dialog', { name: 'Sign this decision?' })
      await modal.getByRole('button', { name: 'Sign Decision' }).click()

      await page.getByText('Board locked').waitFor({ timeout: 5000 })
    })

    await step('next steps — add a step and commit', async () => {
      // Signing hands focus to Next Steps — it stays editable after sign (only locked by its own
      // "Commit to Action", not by the board's sign-off) so the team can fill in the plan. The
      // table always keeps at least one blank row present, so there's no separate "add the first
      // one" input to fill first.
      await page
        .getByPlaceholder('e.g. Write an RFC')
        .first()
        .fill('Implement the one-time SOP change and train QC staff')
      await page.getByPlaceholder("Who's driving this").first().fill('Priya')
      await page.getByPlaceholder('Pick a date').first().fill('15 Oct 2026')
      await page.keyboard.press('Escape')

      const commitButton = page.getByRole('button', { name: 'Commit to Action' })
      await assert(
        await commitButton.isEnabled(),
        'Commit to Action should be enabled once a step has an action',
      )
      await commitButton.click()
      await page.getByText('Actions committed ✅').waitFor({ timeout: 5000 })
    })

    await step('export view', async () => {
      // Signed boards surface an "Export" link (also present unsigned, in the header) — follow
      // it rather than constructing the /export URL by hand, so this step also covers the link
      // actually being wired up. Opens in a new tab (target="_blank" in `BoardView`), so hand
      // that page back to `step` to screenshot instead of the original one (left as-is, still on
      // the board). Left open rather than closed — `browser.close()` at the end sweeps it up.
      const [exportPage] = await Promise.all([
        page.context().waitForEvent('page'),
        page.getByRole('link', { name: 'Export' }).first().click(),
      ])
      await exportPage.getByText('This is a read-only export.').waitFor()
      return exportPage
    })

    await assert(
      consoleErrors.length === 0,
      `no browser console errors, got:\n${consoleErrors.join('\n')}`,
    )

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
