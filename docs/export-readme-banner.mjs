import { chromium } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const html = path.join(root, 'docs', 'readme-banner.html');
const out = path.join(root, 'readme-banner.png');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 2172, height: 724 },
  deviceScaleFactor: 1,
});
await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log('wrote', out);
