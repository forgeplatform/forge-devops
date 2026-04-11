// Annotated screenshot generator for the Forge Platform user handbook.
//
// This is a documentation tool only. It is intentionally separate from the
// frontend application — it does not ship with the product, it is not part
// of the build, and it has no runtime dependency on forge-frontend code.
// All it needs is a running Forge stack reachable at FORGE_URL.
//
// Run from forge-deploy/docs/screenshots/:
//   npm install                          # one-time setup
//   npx playwright install chromium      # one-time setup
//   npm run screenshots                  # take all screenshots
//   node screenshots.mjs dashboard       # only one shot id
//
// Output: ../img/handbook/<id>.png

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../img/handbook')

const BASE = process.env.FORGE_URL || 'https://localhost'
const USER = process.env.FORGE_USER || 'admin'
const PASS = process.env.FORGE_PASS || 'ForgeAdmin2026!'

const ANNOTATE_CSS = `
[data-forge-highlight] {
  outline: 4px solid #ff3b30 !important;
  outline-offset: 3px !important;
  box-shadow: 0 0 0 8px rgba(255, 59, 48, 0.18) !important;
  border-radius: 6px !important;
  position: relative !important;
}
[data-forge-callout]::before {
  content: attr(data-forge-callout);
  position: absolute;
  top: -14px;
  left: -14px;
  z-index: 99999;
  background: #ff3b30;
  color: white;
  font: 700 14px/1 system-ui, sans-serif;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}
`

/** Highlight one element matching selector with a numbered callout. */
async function annotate(page, items) {
  for (const { selector, n } of items) {
    await page.evaluate(({ sel, num }) => {
      const els = document.querySelectorAll(sel)
      if (!els.length) return
      const el = els[0]
      el.setAttribute('data-forge-highlight', '')
      el.setAttribute('data-forge-callout', String(num))
    }, { sel: selector, num: n })
  }
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.setItem('forge_password_changed_1', 'true')
  })

  const userInput = page.locator('input').first()
  const passInput = page.locator('input[type="password"]').first()
  await userInput.click()
  await userInput.fill(USER)
  await passInput.click()
  await passInput.fill(PASS)

  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/login/') && r.request().method() === 'POST'),
    page.click('button:has-text("Sign in")'),
  ])
  await page.waitForTimeout(800)
  await page.waitForLoadState('networkidle')
}

/** Helper: navigate, settle, optionally annotate, capture full-page. */
async function listPage(page, path, callouts = []) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await annotate(page, callouts)
}

const HEADING = 'main h1, main h2'
const PRIMARY_BTN = 'main button.bg-primary, main button[class*="bg-primary"], main a[class*="bg-primary"]'
const FIRST_BTN = 'main button:not([aria-label*="back"]):not([aria-label*="close"])'

const SHOTS = {
  // VIEWS
  dashboard: async (p) => {
    await p.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(800)
    await annotate(p, [
      { selector: HEADING, n: 1 },
      { selector: 'main [class*="card"], main [class*="Card"]', n: 2 },
    ])
  },
  jobs: (p) => listPage(p, '/jobs', [
    { selector: HEADING, n: 1 },
    { selector: 'main input[type="search"], main input[placeholder*="earch"]', n: 2 },
  ]),
  schedules: (p) => listPage(p, '/schedules', [
    { selector: HEADING, n: 1 },
  ]),
  activity: (p) => listPage(p, '/activity', [
    { selector: HEADING, n: 1 },
  ]),
  audit_log: (p) => listPage(p, '/audit', [
    { selector: HEADING, n: 1 },
  ]),
  analytics: (p) => listPage(p, '/analytics', [
    { selector: HEADING, n: 1 },
  ]),

  // AUTOMATION
  event_rules: (p) => listPage(p, '/event_rules', [
    { selector: HEADING, n: 1 },
  ]),
  event_logs: (p) => listPage(p, '/event_logs', [
    { selector: HEADING, n: 1 },
  ]),
  outbound_webhooks: (p) => listPage(p, '/outbound_webhooks', [
    { selector: HEADING, n: 1 },
  ]),

  // SELF-SERVICE
  service_portal: (p) => listPage(p, '/service_portal', [
    { selector: HEADING, n: 1 },
  ]),
  my_requests: (p) => listPage(p, '/my_requests', [
    { selector: HEADING, n: 1 },
  ]),
  approvals: (p) => listPage(p, '/service_approvals', [
    { selector: HEADING, n: 1 },
  ]),
  catalog_admin: (p) => listPage(p, '/service_catalog', [
    { selector: HEADING, n: 1 },
  ]),

  // TENANCY
  tenants: (p) => listPage(p, '/tenants', [
    { selector: HEADING, n: 1 },
  ]),
  quota_events: (p) => listPage(p, '/tenant_quota_events', [
    { selector: HEADING, n: 1 },
  ]),

  // COMPLIANCE
  drift_detections: (p) => listPage(p, '/drift_detections', [
    { selector: HEADING, n: 1 },
  ]),
  drift_alerts: (p) => listPage(p, '/drift_alerts', [
    { selector: HEADING, n: 1 },
  ]),
  alert_rules: (p) => listPage(p, '/drift_alert_rules', [
    { selector: HEADING, n: 1 },
  ]),
  fact_snapshots: (p) => listPage(p, '/fact_snapshots', [
    { selector: HEADING, n: 1 },
  ]),
  policies: (p) => listPage(p, '/policies', [
    { selector: HEADING, n: 1 },
  ]),
  policy_decisions: (p) => listPage(p, '/policy_decisions', [
    { selector: HEADING, n: 1 },
  ]),
  scanners: (p) => listPage(p, '/scanners', [
    { selector: HEADING, n: 1 },
  ]),
  scan_results: (p) => listPage(p, '/scan_results', [
    { selector: HEADING, n: 1 },
  ]),
  observability: (p) => listPage(p, '/observability', [
    { selector: HEADING, n: 1 },
  ]),

  // RESOURCES
  templates: (p) => listPage(p, '/templates', [
    { selector: HEADING, n: 1 },
  ]),
  inventories: (p) => listPage(p, '/inventories', [
    { selector: HEADING, n: 1 },
  ]),
  hosts: (p) => listPage(p, '/hosts', [
    { selector: HEADING, n: 1 },
  ]),
  projects: (p) => listPage(p, '/projects', [
    { selector: HEADING, n: 1 },
  ]),
  credentials: (p) => listPage(p, '/credentials', [
    { selector: HEADING, n: 1 },
  ]),

  // ACCESS
  organizations: (p) => listPage(p, '/organizations', [
    { selector: HEADING, n: 1 },
  ]),
  users: (p) => listPage(p, '/users', [
    { selector: HEADING, n: 1 },
  ]),
  teams: (p) => listPage(p, '/teams', [
    { selector: HEADING, n: 1 },
  ]),

  // ADMIN
  instances: (p) => listPage(p, '/instances', [
    { selector: HEADING, n: 1 },
  ]),
  instance_groups: (p) => listPage(p, '/instance_groups', [
    { selector: HEADING, n: 1 },
  ]),
  execution_environments: (p) => listPage(p, '/execution_environments', [
    { selector: HEADING, n: 1 },
  ]),
  notifications: (p) => listPage(p, '/notification_templates', [
    { selector: HEADING, n: 1 },
  ]),
  topology: (p) => listPage(p, '/topology', [
    { selector: HEADING, n: 1 },
  ]),
  settings: (p) => listPage(p, '/settings', [
    { selector: HEADING, n: 1 },
  ]),
}

async function main() {
  const only = process.argv[2]
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()

  page.on('framenavigated', async () => {
    try { await page.addStyleTag({ content: ANNOTATE_CSS }) } catch {}
  })

  await login(page)

  const ids = only ? [only] : Object.keys(SHOTS)
  for (const id of ids) {
    const fn = SHOTS[id]
    if (!fn) {
      console.error(`unknown shot: ${id}`)
      continue
    }
    try {
      await fn(page)
      await page.addStyleTag({ content: ANNOTATE_CSS })
      await page.waitForTimeout(150)
      const out = resolve(OUT_DIR, `${id}.png`)
      await page.screenshot({ path: out, fullPage: true })
      console.log(`✓ ${id}`)
    } catch (e) {
      console.error(`✗ ${id}: ${e.message}`)
    }
  }

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
