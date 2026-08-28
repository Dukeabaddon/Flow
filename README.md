<div align="center">

![Flow](./readme-banner.png)

# Flow

**Prompt → looping sound → live visualizer**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Strudel](https://img.shields.io/badge/Strudel-1.3-0f172a)](https://strudel.cc/)
[![Vitest](https://img.shields.io/badge/Vitest-4-729B1B?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)

**A browser music looper you steer with language.**  
**Cerebras writes Strudel. Recording stays on your machine.**

[Features](#-features) · [Tech stack](#️-tech-stack) · [Architecture](#️-architecture) · [Privacy](#-privacy) · [How generation works](#-how-generation-works) · [Setup](#-local-development) · [Cursor](#-how-cursor-was-used-to-build-flow)

</div>

---

## Why Flow

Most AI music tools hide a black box. You wait, you get a file, you cannot see or edit the pattern.

Flow is built for that gap. Type a vibe. Attach a MIDI clip or an audio file. The app asks Cerebras for short Strudel code, validates it, and plays a loop in the browser. A WebGL background reacts to the analyser.

Keys are for local private use, not a public deploy.

## ✨ Features

| Feature | Description |
| --- | --- |
| 🎹 **Prompt-to-loop** | Natural language becomes short Strudel code, then instant playback |
| 🔑 **3-key Cerebras rotation** | `VITE_CEREBRAS_KEY_A/B/C` round-robin with retry on 401 / 402 / 429 |
| 📎 **MIDI attach** | `.mid` / `.midi` distilled to a Strudel loop (first 60s, bar-aligned) |
| 🎧 **Audio attach** | Offline analysis (duration, BPM estimate, energy) steers an experiment prompt |
| 🌊 **WebGL visualizer** | Fullscreen shader background driven by the live analyser |
| ⏺️ **Local recording** | MediaRecorder capture, download on your machine |
| 🧪 **Gates + validator** | 20 MB / 5 min files, 30-line code cap, Strudel primitive check |

## 🛠️ Tech stack

| Layer | Technology | Version |
| --- | --- | --- |
| UI | React | 19.x |
| Bundler | Vite | 6.x |
| Audio | `@strudel/web` + `@strudel/soundfonts` | 1.3.0 |
| MIDI | `@tonejs/midi` | 2.0.x |
| Visuals | Custom WebGL shaders | in-repo |
| Generation | Cerebras `gpt-oss-120b` | rotating keys |
| Unit tests | Vitest | 4.1.x |
| E2E | Playwright | 1.62.x |
| Runtime | Node.js | 22.x |

## 🏗️ Architecture

```text
Browser (React + Vite)
  ├─ Prompt bar + MIDI / audio attach
  ├─ Strudel engine + MediaRecorder
  └─ WebGL visualizer (analyser → shaders)
           │
           ▼  generatePattern(prompt, currentCode)
  Cerebras chat completions
  ├─ 3-key rotator + 20s timeout
  ├─ System prompt + line/primitive validator
  └─ MIDI distill / audio analyze gates
```

- Playback and recording never leave the tab.
- Cerebras only receives the prompt, attach summary, and current code.

## 🔒 Privacy

- ✅ No user accounts and no user database
- ✅ Recordings stay in the browser until you download them
- ✅ Attach files are parsed locally (MIDI distill / offline audio analysis)
- ✅ `.env` is gitignored; only `.env.example` placeholders are committed
- ⚠️ Cerebras keys use a `VITE_` prefix, so they **ship in the client bundle**
- ⚠️ Do not deploy a public site with real keys. Local / private use only
- ⚠️ Prompts and attach-derived text go to Cerebras when generation runs

This is the opposite of Careero's server-only keys. Flow is a Vite SPA. Treat keys as public to anyone who can load the app.

## 🎯 How generation works

Flow separates **deterministic audio** from **optional LLM code**.

| Step | What happens | What “works” means here |
| --- | --- | --- |
| 1. Prompt | Text, optional MIDI, or audio attach | Gates reject >20 MB or >5 min files |
| 2. Generate | Cerebras returns Strudel; validator caps lines and requires primitives | Invalid code never reaches the engine |
| 3. Play | Strudel schedules the loop into one AudioContext | Instant start; visualizer reads the analyser |

**Honest limits**

- The model writes **code**, not a mastered track. You hear a live Strudel loop.
- MIDI / audio attach uses the first minute (or the full file if shorter). It is a sketch, not a stem split.

## 🔁 How it works

```text
prompt and/or attach
       ↓
gates (size, duration, crop window)
       ↓
Cerebras Strudel code
       ↓
validator (primitives, line cap)
       ↓
Strudel loop + WebGL visualizer
       ↓
optional local recording
```

## 🛡️ Safety and reliability

- `.env` and `.env.*` are ignored except `.env.example`
- Attach gates: 20 MB, 5 minutes, 60s analysis window
- Generated code must include a Strudel primitive and stay under 30 lines
- 401 / 402 / 429 rotate to the next Cerebras key
- One AudioContext is shared with superdough (avoids a silent recorder)
- Trace logs (`.flow-trace.ndjson`) stay local and gitignored

## 🚀 Local development

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

The UI runs without keys. Prompt generation needs at least one `VITE_CEREBRAS_KEY_*` value.

## 🔑 Environment variables

Copy names from `.env.example`. These are **browser-side** Vite vars.

| Variable | Purpose |
| --- | --- |
| `VITE_CEREBRAS_KEY_A` | First Cerebras key (`csk-…`) |
| `VITE_CEREBRAS_KEY_B` | Second key for rotation |
| `VITE_CEREBRAS_KEY_C` | Third key for rotation |

Get keys at [cloud.cerebras.ai](https://cloud.cerebras.ai/). Never commit real values. Never put them on a public host.

## ✅ Testing

```bash
npm run test:unit
npm run test:e2e
npm test
```

`test:unit` is Vitest (gates, validator, matcher, MIDI distill, audio prompt copy). `test:e2e` is Playwright against `http://localhost:5173`. `npm test` runs both.

Manual flow:

1. Open the app. Confirm the visualizer and logo render.
2. Type a short vibe (for example `sea`) and send. Status should move, then audio.
3. Attach a small `.mid`. Confirm a crop status, then a loop.
4. Attach a short audio file. Confirm analysis copy, then a loop.
5. Record a few seconds and download. File should have sound.

## 🤝 How Cursor was used to build Flow

Cursor agents were the engineering partner for Flow.

They helped wire the Vite React shell, Strudel engine, Cerebras rotator, attach gates, WebGL visualizer, and Playwright / Vitest coverage. Product calls stayed with us: glass UI, prompt-first loop, local recording, and honest limits when the API is down.

We kept direction and listened to real playback. Agents reproduced bugs (silent record from a second AudioContext, fake “first 1:00” copy on short files) and patched them.

## 📚 Attribution

Playback uses [Strudel](https://strudel.cc/) (`@strudel/web`, `@strudel/soundfonts`), licensed under **AGPL-3.0-or-later**. This repo must stay source-available while those packages ship with the app. MIDI parsing uses `@tonejs/midi`. Generation uses Cerebras Inference.

## 📄 License

No project LICENSE file yet. Do not treat this as MIT. Strudel’s AGPL terms apply to the combined work. If you need a SPDX choice, pick one that can coexist with AGPL-3.0-or-later.
