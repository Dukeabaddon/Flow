import { test, expect } from '@playwright/test';
import * as ToneMidi from '@tonejs/midi';

const Midi =
  ToneMidi.Midi ||
  ToneMidi.default?.Midi ||
  ToneMidi.default;

function buildHookMidiBuffer() {
  const midi = new Midi();
  const track = midi.addTrack();
  track.addNote({ midi: 60, time: 0, duration: 0.4 });
  track.addNote({ midi: 64, time: 0.5, duration: 0.4 });
  track.addNote({ midi: 67, time: 1, duration: 0.4 });
  const uint8 = midi.toArray();
  return Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength);
}

function buildSilentWavBuffer(durationSec = 0.2, sampleRate = 44100) {
  const numSamples = Math.floor(durationSec * sampleRate);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

test.beforeEach(async ({ page }) => {
  await page.route('https://api.cerebras.ai/v1/chat/completions', (route) =>
    route.abort(),
  );
});

test('app loads with prompt input and send button', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('textbox', { name: 'Enter a music vibe prompt' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send prompt' })).toBeVisible();
});

test('cyberpunk plays with 909 drums', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', (msg) => consoleMessages.push(msg.text()));

  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Enter a music vibe prompt' })
    .fill('cyberpunk');
  await page.getByRole('button', { name: 'Send prompt' }).click();

  const playBtn = page.locator('.bottom-bar__play');
  await expect(playBtn).toHaveAttribute('aria-label', 'Stop', { timeout: 60_000 });

  const timer = page.locator('.top-bar__time');
  await expect
    .poll(async () => timer.textContent(), { timeout: 3_000 })
    .not.toBe('0:00');

  const allConsole = consoleMessages.join('\n');
  expect(allConsole).not.toContain('Sound bake failed');
  expect(allConsole).not.toContain('Strudel init failed');

  await expect
    .poll(
      () =>
        consoleMessages.some((m) => /drums ok: RolandTR909_bd=true/.test(m)),
      { timeout: 30_000 },
    )
    .toBe(true);

  await expect
    .poll(
      () => consoleMessages.join('\n'),
      { timeout: 2_000 },
    )
    .not.toMatch(/evalError/i);
});

test('lupang hinirang template plays', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Enter a music vibe prompt' })
    .fill('lupang hinirang');
  await page.getByRole('button', { name: 'Send prompt' }).click();

  const playBtn = page.locator('.bottom-bar__play');
  await expect(playBtn).toHaveAttribute('aria-label', 'Stop', { timeout: 60_000 });
});

test('midi attach loops first minute', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', (msg) => consoleMessages.push(msg.text()));

  await page.goto('/');

  await page.locator('[data-testid="attach-file"]').setInputFiles({
    name: 'hook.mid',
    mimeType: 'audio/midi',
    buffer: buildHookMidiBuffer(),
  });

  await page.getByRole('button', { name: 'Send prompt' }).click();

  const playBtn = page.locator('.bottom-bar__play');
  await expect(playBtn).toHaveAttribute('aria-label', 'Stop', { timeout: 60_000 });

  const allConsole = consoleMessages.join('\n');
  expect(allConsole).not.toMatch(/evalError/i);
  expect(allConsole).not.toContain('Strudel init failed');

  await expect(page.locator('.bottom-bar__status')).toContainText(/Looping first/i);
});

test('mp3 attach does not crash', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', (msg) => consoleMessages.push(msg.text()));

  await page.goto('/');

  await page.locator('[data-testid="attach-file"]').setInputFiles({
    name: 'clip.wav',
    mimeType: 'audio/wav',
    buffer: buildSilentWavBuffer(),
  });

  await page.getByRole('button', { name: 'Send prompt' }).click();

  const playBtn = page.locator('.bottom-bar__play');
  await expect(playBtn).toHaveAttribute('aria-label', 'Stop', { timeout: 60_000 });

  const allConsole = consoleMessages.join('\n');
  expect(allConsole).not.toContain('Strudel init failed');
});
