# Flow — Complete Technical Documentation
## AI-Prompted Generative Sound Looper
### Version 1.0-FINAL | Approved 2026-07-03

---

## Document Control

| Field | Value |
|-------|-------|
| **Project Name** | Flow |
| **Version** | 1.0-FINAL |
| **Date** | 2026-07-03 |
| **Status** | Decision-Locked / Ready for Build |
| **Build Tool** | Kiro CLI + Vite |
| **Team Size** | 2 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Requirements Document (PRD)](#2-product-requirements-document-prd)
3. [Tech Stack & Evaluation](#3-tech-stack--evaluation)
4. [Architecture & System Design](#4-architecture--system-design)
5. [API Strategy — Cerebras Multi-Key Rotation](#5-api-strategy--cerebras-multi-key-rotation)
6. [Sound Engine Specification](#6-sound-engine-specification)
7. [AI Prompting & Code Generation](#7-ai-prompting--code-generation)
8. [UI/UX Specification](#8-uiux-specification)
9. [Visualization Engine — WebGL Shaders](#9-visualization-engine--webgl-shaders)
10. [Recording Feature](#10-recording-feature)
11. [State Management & Data Flow](#11-state-management--data-flow)
12. [Error Handling & Fallbacks](#12-error-handling--fallbacks)
13. [Development Pipeline](#13-development-pipeline)
14. [Team Split & Responsibilities](#14-team-split--responsibilities)
15. [Folder Structure](#15-folder-structure)
16. [Kiro CLI Integration](#16-kiro-cli-integration)
17. [Pre-Cached Template Library](#17-pre-cached-template-library)
18. [System Prompt](#18-system-prompt)
19. [Security & Compliance](#19-security--compliance)
20. [Risk Register](#20-risk-register)
21. [Final Decision Lock](#21-final-decision-lock)
22. [Immediate Next Steps](#22-immediate-next-steps)

---

## 1. Executive Summary

Flow is a zero-installation browser application where a user types a natural-language vibe prompt and the browser instantly generates and loops a musical pattern. The background is a reactive WebGL shader visualization. The experience is continuous, fluid, and immediate — like a DJ who conjures tracks from language.

**Core philosophy:** Use native browser APIs where sufficient. Use battle-tested libraries where they eliminate weeks of work. Do not add abstraction layers that solve no real problem. Optimize for hackathon velocity.

**Key differentiator:** Real-time generative music from text prompts with WebGL cymatic-inspired visuals, cycle-boundary pattern transitions, and session recording — all in the browser, no backend server.

---

## 2. Product Requirements Document (PRD)

### 2.1 Vision
An AI-powered generative sound looper where natural language prompts create, modify, or transition musical loops in real-time. Like a DJ who doesn't play tracks — they speak them into existence.

### 2.2 Core User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-1 | As a user, I type "cyberpunk dark 128bpm" and hear a looping cyberpunk soundscape instantly | P0 |
| US-2 | As a user, I type "add rain" and the rain texture layers onto the existing loop without stopping the music | P1 |
| US-3 | As a user, I type "shift to lo-fi jazz" and the music crossfades smoothly to a new vibe | P0 |
| US-4 | As a user, I click Record and capture my session, then download it when I stop | P1 |
| US-5 | As a user, I see the background visualization react to the bass frequencies in real-time | P0 |
| US-6 | As a user, I can pause and resume recording without stopping the music | P1 |
| US-7 | As a user, the music finishes its current cycle before audibly changing to a new pattern | P0 |

### 2.3 Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | Accept natural language prompts via text input | P0 | Enter key or send button |
| FR-2 | Generate Strudel pattern code from prompt via Cerebras | P0 | < 1.5s end-to-end |
| FR-3 | Play generated patterns continuously (infinite loop) | P0 | Strudel scheduler handles this |
| FR-4 | Pattern updates finish current cycle before audible change | P0 | Strudel native behavior |
| FR-5 | Smooth transition or hard cut at cycle boundary | P0 | GainNode ramp or Strudel native swap |
| FR-6 | WebGL shader background reacts to bass frequencies | P0 | Uniforms passed from AnalyserNode |
| FR-7 | Background shader config changes per prompt (deterministic) | P1 | Hash-based or random selection from 30 configs |
| FR-8 | Play/Stop control toggles AudioContext and scheduler | P0 | Square (stop) when playing, triangle (play) when stopped |
| FR-9 | Record button starts MediaRecorder capture | P1 | Captures Strudel master output |
| FR-10 | Pause/Resume during recording | P1 | MediaRecorder.pause() / .resume() |
| FR-11 | Stop recording triggers auto-download or modal | P1 | WebM/Opus format |
| FR-12 | Prompt input at bottom center; controls at bottom right inside input | P0 | Clean, minimal, fullscreen visualizer |
| FR-13 | Additive prompting via full regeneration with context | P1 | AI receives current code + "add rain" |
| FR-14 | 3-key Cerebras API rotation with instant fallback | P1 | 100ms timeout per key |
| FR-15 | Pre-cached template fallback if all APIs fail | P1 | 15+ templates |
| FR-16 | Session history log | P2 | For debugging and user reference |
| FR-17 | No image upload. No audio upload. No user accounts. | P0 | Scope lock |

### 2.4 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Prompt → Audible sound latency | < 1.5 seconds |
| NFR-2 | API response latency (Cerebras) | < 500ms for short prompts |
| NFR-3 | Visualizer frame rate | 60fps |
| NFR-4 | Bundle size | < 1MB initial (Strudel is largest dependency) |
| NFR-5 | Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR-6 | Offline fallback | Works with pre-cached templates if API unavailable |
| NFR-7 | Recording quality | 128kbps Opus (WebM) minimum |

### 2.5 Out of Scope (Explicitly Excluded)
- Image-to-theme extraction
- Audio file upload or microphone input
- User authentication or persistent accounts
- Backend server deployment
- Social features (sharing, collaboration)
- Export to MP3/WAV (stretch goal only — WebM is native)
- Kaggle or any external compute backend

---

## 3. Tech Stack & Evaluation

### 3.1 Decision Matrix

| Layer | Native Option | Library Option | Evaluation | Verdict |
|-------|--------------|----------------|------------|---------|
| **Framework** | Vanilla JS + DOM | React 19 | React wins: state sync between prompt, API, audio, visualizer, recording is non-trivial. React's reactivity eliminates imperative DOM juggling. | **React 19 + Vite** |
| **Build Tool** | Native ES modules | Vite / Parcel / Webpack | Strudel is distributed as npm packages with imports. Vite is fastest, simplest, Kiro-native. | **Vite** |
| **HTTP Client** | `fetch()` + `AbortController` | Axios | Native fetch handles timeouts, JSON, errors. Axios adds 13KB and zero functional benefit. | **Native fetch** |
| **State Management** | React `useState` + `useRef` | Zustand / Redux / Jotai | App state is small (< 15 fields). No prop drilling. Native hooks sufficient. | **Native React hooks** |
| **Styling** | Plain CSS | Tailwind / Styled Components / Emotion | Single-screen app with 3 UI elements. Plain CSS is faster to write and debug. | **Plain CSS** |
| **Audio Engine** | Raw Web Audio API | Strudel `@strudel/web` | Raw Web Audio requires building: scheduler, pattern language, mini-notation parser, synth abstraction. 3+ weeks of work. Strudel provides all of this. | **@strudel/web** |
| **Synthesis** | Web Audio OscillatorNode | Tone.js (via Strudel) | Tone.js is bundled inside Strudel. Professional synths (FMSynth, AMSynth, MembraneSynth) that raw oscillators cannot match. | **Tone.js (via Strudel)** |
| **Visualization** | Canvas 2D API | Three.js / WebGL / p5.js | Canvas 2D bars are boring. WebGL fragment shaders produce stunning cymatic-like visuals. `shader-web-background` is minimal and focused. | **WebGL fragment shaders via `shader-web-background`** |
| **Pattern Evaluation** | Custom JS parser | Strudel's built-in transpiler | Writing a TidalCycles evaluator is a research project. Strudel has already done this. | **Strudel transpiler** |
| **AI API** | Native `fetch` to Cerebras | OpenAI SDK | OpenAI SDK is 40KB+ and adds no value for a single `fetch` POST. | **Native fetch** |
| **Recording** | MediaRecorder API | External library | MediaRecorder is native, well-supported, and handles WebM/Opus. No library needed. | **Native MediaRecorder** |

### 3.2 Final Stack

```
Frontend:     React 19 + Vite
HTTP:         Native fetch + AbortController
State:        React useState / useRef / useEffect
Audio:        @strudel/web (umbrella package: core + mini + transpiler + webaudio + tonal)
Synthesis:    Tone.js (bundled with Strudel)
Visuals:    WebGL fragment shaders via shader-web-background
Recording:  Native MediaRecorder + createMediaStreamDestination
Styling:    Plain CSS (single stylesheet)
AI:         Cerebras OpenAI-compatible chat completions
Package Mgr: npm
```

### 3.3 Dependencies (package.json)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@strudel/web": "^1.0.0",
    "shader-web-background": "^1.0.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

**Note:** Tone.js is a transitive dependency of `@strudel/web`. You do not install it directly.

---

## 4. Architecture & System Design

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER (Single Page)                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              WebGL SHADER BACKGROUND LAYER            │   │
│  │         (Cymatic-inspired, reactive to bass)          │   │
│  │              z-index: 0                               │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              UI OVERLAY LAYER (z-index: 10)           │   │
│  │                                                       │   │
│  │   ┌─────────────────────────────────────────────┐     │   │
│  │   │  [Prompt Input — Bottom Center]             │     │   │
│  │   │  Placeholder: "Type a vibe..."              │     │   │
│  │   │  Right side: [⏺] [⏸] [⏹] [▶/■]            │     │   │
│  │   │  record pause stop play/stop                │     │   │
│  │   └─────────────────────────────────────────────┘     │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              APPLICATION LOGIC LAYER                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │   │
│  │  │  API        │  │  Strudel    │  │  Audio       │  │   │
│  │  │  Rotator    │  │  Evaluator  │  │  Controller  │  │   │
│  │  │  (3 keys)   │  │  (Pattern   │  │  (GainNode,  │  │   │
│  │  │             │  │   Engine)   │  │  Transport,  │  │   │
│  │  │             │  │             │  │  Recorder)   │  │   │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              FALLBACK LAYER                             │   │
│  │  • Pre-cached Strudel templates (local JSON)            │   │
│  │  • Offline mode (no API calls)                        │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Component Breakdown

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| `App` | Root state holder, orchestrates all subsystems | React |
| `Visualizer` | WebGL shader renderer, fullscreen | shader-web-background + WebGL |
| `PromptInput` | Text input, submission handling, loading state, embedded controls | React + CSS |
| `PlayControl` | Play/stop button, AudioContext lifecycle | React + Web Audio API |
| `RecordControl` | Record/pause/resume/stop, MediaRecorder management | React + MediaRecorder API |
| `AudioEngine` | Strudel scheduler, pattern evaluation, transition control, recording tap | Strudel API + Web Audio API |
| `APIRotator` | 3-key Cerebras management, timeout, fallback | Native fetch |
| `TemplateStore` | Pre-cached pattern library | Static JSON import |

### 4.3 Module Boundaries

```
src/
├── main.jsx              # Entry point, React root
├── App.jsx               # Global state, orchestration
├── features/
│   ├── visualizer/       # WebGL shader background
│   │   ├── Visualizer.jsx
│   │   ├── useVisualizer.js
│   │   ├── shaders/
│   │   │   ├── cymatic.frag      # GLSL fragment shader
│   │   │   └── configs.json      # 30 uniform configurations
│   │   └── index.js
│   ├── prompt/           # Input bar + embedded controls
│   │   ├── PromptInput.jsx
│   │   ├── usePrompt.js
│   │   └── index.js
│   └── player/           # Play/stop + record controls
│       ├── PlayButton.jsx
│       ├── RecordButton.jsx
│       ├── usePlayer.js
│       └── index.js
├── backend/              # Logical backend layer
│   ├── api/
│   │   ├── cerebras.js   # Single fetch wrapper
│   │   ├── rotator.js    # 3-key rotation logic
│   │   └── index.js
│   ├── audio/
│   │   ├── engine.js     # Strudel init, evaluate, play
│   │   ├── analyser.js   # AnalyserNode bridge
│   │   ├── recorder.js   # MediaRecorder integration
│   │   └── index.js
│   ├── fallback/
│   │   ├── templates.js  # 15+ template objects
│   │   ├── matcher.js    # Keyword-based template selection
│   │   └── index.js
│   ├── validation/
│   │   └── validator.js  # Strudel syntax pre-check
│   └── prompts/
│       └── system.js     # System prompt string builder
├── shared/
│   ├── constants.js      # API endpoints, config
│   └── utils.js          # Helpers (hash, debounce, etc.)
├── components/           # Pure UI primitives (Button, Input, Icon)
├── hooks/                # Shared React hooks
├── styles/
│   └── global.css        # Dark theme, neon accents, layout
└── App.jsx
```

**Rules:**
1. `features/` never imports from each other. They import from `backend/`, `shared/`, or `components/`.
2. `backend/` never imports from `features/`.
3. `shared/` has no internal dependencies.
4. `components/` has no business logic.

---

## 5. API Strategy — Cerebras Multi-Key Rotation

### 5.1 Cerebras Free Tier Reality (Post-Hackathon)

| Limit | Value | Impact on Flow |
|-------|-------|------------------|
| Daily Tokens | 1,000,000 (input + output) | ~500–1,000 short prompts/day. Sufficient for dev + demo. |
| Requests Per Minute | **5 RPM** | Hard ceiling. 3 rapid prompts = 429 error. |
| Tokens Per Minute | 30,000 TPM | Not limiting for short Strudel code. |
| Context Window | 8,192 tokens | System prompt + user prompt + current code + response fits easily. |
| Speed | 2,600+ tokens/sec | Response arrives in 50–200ms. |
| Latency | ~100ms | Excellent for real-time feel. |
| Credit Card | Not required | Sign up at cloud.cerebras.ai, get key immediately. |

### 5.2 The 3-Key Rotation Architecture

**Objective:** Enable 3 prompts in under 10 seconds for demo purposes without hitting 429s.

**Mechanism:**

```
Key Pool: [KEY_A, KEY_B, KEY_C]
Current Index: 0

On Prompt Submit:
  1. Try KEY_A with 100ms timeout
     → Success: return response, increment index to 1
     → Timeout / 429 / 5xx: goto 2
  2. Try KEY_B with 100ms timeout
     → Success: return response, increment index to 2
     → Timeout / 429 / 5xx: goto 3
  3. Try KEY_C with 100ms timeout
     → Success: return response, increment index to 0
     → Timeout / 429 / 5xx: goto 4
  4. All keys exhausted
     → Return pre-cached template matching prompt keywords
     → Show "offline mode" indicator in UI
```

**Key Implementation Details:**
- Use `AbortController` with `setTimeout(100)` to enforce the 100ms timeout.
- Do not wait for Cerebras to retry. If the connection stalls, abort and rotate immediately.
- Store keys in environment variables (`VITE_CEREBRAS_KEY_1`, etc.).
- In production/demo, keys are injected at build time or via a config file that is not committed.
- **Round-robin, not random:** Ensures even distribution across keys.
- **Index persistence:** The next prompt starts from the key after the last successful one.
- **Cooldown tracking:** If a key returns 429, mark it as "cooling" for 60 seconds before retrying.

### 5.3 Fallback Strategy

| Scenario | Behavior |
|----------|----------|
| All 3 keys return 429 | Use pre-cached template. Log to console. |
| All 3 keys timeout | Use pre-cached template. Show yellow offline dot. |
| Strudel code is malformed | Catch eval error, keep playing last valid pattern, show "tuning..." briefly. |
| AudioContext suspended | Prompt user to click Play button (browser security). |
| Network completely offline | Use template library exclusively. Show red offline dot. |

---

## 6. Sound Engine Specification

### 6.1 Strudel as the AI's Tool

Strudel is not just a player. It is the **toolkit** you give to the AI agent. The AI does not generate raw audio. It generates **Strudel code** that configures Strudel's built-in capabilities.

**Why `@strudel/web` is the correct choice:**
1. **Pattern language is text:** LLMs excel at generating text. Strudel code is compact text.
2. **Loops are native:** Everything in Strudel is cyclical by design.
3. **Cycle-boundary updates:** When you replace the pattern, Strudel finishes the current cycle before audibly switching.
4. **Real-time evaluation:** Change the code string → Strudel re-evaluates on next scheduler tick (50ms resolution).
5. **Umbrella package:** One import gives you core + mini + transpiler + webaudio + tonal.

**Deprecated packages to avoid:**
- `@strudel.cycles/eval` — deprecated
- `@strudel/react` — no longer maintained
- `@strudel/tone` — replaced by `@strudel/webaudio` (bundled in `@strudel/web`)

### 6.2 Strudel's Update Mechanism (The Critical Detail)

Strudel's scheduler queries the active `Pattern` every 50ms. `Pattern.queryArc` is a pure function mapping a time span to events. When you update the code:

1. A new `Pattern` instance replaces the old one in the scheduler.
2. The scheduler does not stop.
3. On the next 50ms tick, it queries the **new** pattern.
4. Events from the old pattern that were already scheduled finish naturally.
5. New events from the new pattern start at the next cycle boundary.

**Latency:** 50–150ms between code update and audible change.

**Your custom code needed:** None. This is built-in. You only need to call the Strudel evaluator with the new code string.

### 6.3 The AI's Constrained Palette

To ensure fast, reliable, and musically coherent output, the AI is restricted to a specific set of Strudel primitives. The system prompt enumerates these exactly.

**Available Primitives:**

| Category | Strudel Code | Description |
|----------|-------------|-------------|
| **Kick Drum** | `s("bd").bank("RolandTR909")` | 909 bass drum |
| **Snare** | `s("sd").bank("RolandTR909")` | 909 snare |
| **Hi-Hat** | `s("hh").bank("RolandTR909")` | 909 closed hat |
| **Open Hat** | `s("oh").bank("RolandTR909")` | 909 open hat |
| **Clap** | `s("cp").bank("RolandTR909")` | 909 clap |
| **Bass** | `note("c2").sound("sawtooth").lpf(400)` | Sawtooth bass with filter |
| **Lead** | `note("c4").sound("square").lpf(1200)` | Square lead |
| **Pad** | `note("c3 e3 g3").sound("triangle").room(0.6)` | Ambient pad with reverb |
| **Pluck** | `note("c4").sound("pluck")` | Plucked string |
| **Texture** | `s("wind").gain(0.3)` | Wind/texture sample |
| **Tempo** | `.cpm(N)` | Cycles per minute (BPM = CPM × 4) |
| **Low-Pass Filter** | `.lpf(N)` | Cutoff frequency in Hz |
| **High-Pass Filter** | `.hpf(N)` | Cutoff frequency in Hz |
| **Reverb** | `.room(0.0–1.0)` | Room/reverb amount |
| **Delay** | `.delay(0.0–1.0)` | Delay feedback amount |
| **Distortion** | `.distort(0.0–1.0)` | Distortion amount |
| **Layering** | `stack(a, b, c)` | Play multiple patterns simultaneously |
| **Pattern Speed** | `.speed(N)` | Sample playback speed |
| **Gain** | `.gain(0.0–1.0)` | Volume control |
| **Note Pattern** | `n("0 2 4").scale("C:minor")` | Scale-based note sequences |
| **Rhythm Pattern** | `s("bd*4 hh*8")` | Mini-notation for rhythms |
| **Cycle Variation** | `every(4, ...)` | Variation/fills every N cycles |
| **Conditional** | `when(...)` | Conditional pattern application |

### 6.4 Prompt-to-Behavior Mapping

| User Prompt | AI Behavior | Example Output |
|-------------|-------------|----------------|
| `cyberpunk dark 128bpm` | Generate complete new pattern from scratch | `stack(s("bd*4").bank("RolandTR909"), note("c2").sound("sawtooth").lpf(300)).cpm(32)` |
| `add rain` | **Full regeneration with context.** AI receives current code + "add rain". Outputs complete new code including rain layer. | `stack(s("bd*4"), note("c2").sound("sawtooth"), s("wind").gain(0.2)).cpm(32)` |
| `more intense` | Modify existing: open filter, add distortion, faster tempo | Same pattern + `.distort(0.3).lpf(2000).cpm(36)` |
| `slower` | Reduce tempo | Same pattern, `.cpm(24)` instead of `.cpm(32)` |
| `remove drums` | Regenerate without drum layer | Pattern minus `s("bd...")` parts |
| `shift to lo-fi` | Complete vibe change, full regeneration | New pattern with 85 BPM, vinyl crackle, soft drums |

### 6.5 Code Complexity Target

**Target: 10–25 lines of Strudel code per response.**

This is not a hard limit — it is guidance for the AI. A rich cyberpunk track with 4–5 layers, effects, and variation naturally falls in this range. The system prompt should say: "Generate rich, layered patterns. Use 3–5 layers with effects. Aim for 10–25 lines."

**Token impact:** ~500–800 tokens. Well within Cerebras's 8K context window and 30K TPM limit.

### 6.6 Transition Strategy

**Requirement:** When updating the current playing sound, it should finish its last turn (cycle) before playing the new configuration.

**Implementation:** Strudel handles this natively. However, for smooth perceptual transitions, implement a **master gain crossfade**:

```
On Pattern Update:
  1. Old pattern continues playing (Strudel scheduler).
  2. New pattern is evaluated and injected into scheduler.
  3. At the next cycle boundary, Strudel starts scheduling new events.
  4. Simultaneously, apply a 1-bar exponential gain ramp:
     - Old master gain: 1.0 → 0.0 (over 1 bar)
     - New master gain: 0.0 → 1.0 (over 1 bar)
  5. Old pattern is fully silent by the end of the crossfade.
```

**Alternative (simpler):** Hard cut at cycle boundary. Strudel does this by default. The crossfade is a polish layer, not required for MVP.

**Decision:** Implement hard cut at cycle boundary for MVP. Add master gain crossfade if time permits in Hour 10–12.

---

## 7. AI Prompting & Code Generation

### 7.1 System Prompt Architecture

The system prompt is the contract between Flow and Cerebras. It must be:
- **Constrained:** Only allowed primitives can be used.
- **Formatted:** Output must be valid, parseable Strudel code.
- **Contextual:** For "add X" prompts, the current code must be included.

**System Prompt Structure:**

```
ROLE: You are a Strudel pattern generator. You write valid Strudel JavaScript code.

OUTPUT RULES:
- Output ONLY valid Strudel code. No markdown, no explanation, no comments.
- Use stack() to layer sounds. Use 3–5 layers for rich patterns.
- Use .cpm(N) for tempo where N = BPM / 4.
- Use .bank("RolandTR909") for all drum samples.
- Use .sound("sawtooth" | "square" | "triangle" | "sine" | "pluck") for synths.
- Use .lpf(), .room(), .delay(), .distort() for effects.
- Use every(N, ...) for variation/fills.
- Keep patterns to 4–8 bars maximum.
- Aim for 10–25 lines of code.
- If the user says "add X", include the existing pattern plus the new element.
- If the user says "change to X", generate a completely new pattern.

AVAILABLE PRIMITIVES:
[Full table from Section 6.3]

EXAMPLES:
Prompt: "techno 130bpm"
Output:
stack(
  s("bd*4").bank("RolandTR909").gain(0.9),
  s("hh*8").bank("RolandTR909").gain(0.6),
  note("c2").sound("sawtooth").lpf(400).gain(0.7),
  note("c4 e4 g4").sound("square").lpf(1500).delay(0.25).gain(0.5)
).cpm(32.5)
```

### 7.2 Context Passing for Additive Prompts

When the user says "add rain":

```
User Message Format:
Current Pattern: stack(s('bd*4'), note('c2').sound('sawtooth')).cpm(32)
Request: add rain

Expected AI Output:
stack(
  s("bd*4").bank("RolandTR909").gain(0.9),
  note("c2").sound("sawtooth").lpf(400).gain(0.7),
  s("wind").gain(0.2)
).cpm(32)
```

**Implementation:** The app prepends the current pattern code to the user prompt before sending to Cerebras.

### 7.3 Output Validation

Before passing AI output to Strudel:
1. Trim whitespace.
2. Check that output starts with a valid Strudel function (`stack`, `s`, `note`, `n`, etc.).
3. Wrap evaluation in `try/catch`.
4. If eval fails, discard new code and keep playing the last valid pattern.
5. Show a brief "tuning..." indicator in the UI.

---

## 8. UI/UX Specification

### 8.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                                                              │
│                    WebGL SHADER BACKGROUND                   │
│              (Cymatic-inspired geometric patterns)            │
│                                                              │
│              Reactive to bass frequencies                   │
│              Dark background (#0a0a0f)                      │
│              Neon cyan (#00f0ff) and magenta (#ff00aa)      │
│                                                              │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  [Type a vibe...                              ]     │    │
│  │                                                      │    │
│  │  Left side:              Right side (inside input):  │    │
│  │  (empty / status)        [⏺] [⏸] [⏹] [▶/■]        │    │
│  │                          record pause stop play/stop   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 Elements

| Element | Position | Behavior | States |
|---------|----------|----------|--------|
| **Background WebGL** | Fixed, fullscreen, z-index: 0 | GLSL fragment shader. Cymatic-inspired geometric patterns. Bass frequencies (FFT bins 0–10) drive pattern intensity via uniform. Color palette shifts per prompt (hash-based config selection). | Always active. Idle animation when no audio (gentle slow morph). |
| **Prompt Input** | Bottom center, fixed, z-index: 10 | Single-line `<input>`. Auto-focused on load. Placeholder: "Type a vibe...". Submit on Enter key. | Normal, Loading (subtle pulse), Error (red border). |
| **Record Button** | Inside input, right side | Circular button with ⏺ icon. | Idle (grayed when not playing). Active (red pulse when recording). |
| **Pause Button** | Inside input, right side | ⏸ icon. Visible only during recording. | Pauses MediaRecorder. Music continues. |
| **Stop Button** | Inside input, right side | ⏹ icon. Visible during recording or playing. | During recording: stops recorder, assembles Blob, triggers download/modal. During playback: stops AudioContext. |
| **Play/Stop Button** | Inside input, right side | ▶ (play) / ■ (stop) inside circle. | ▶ when AudioContext suspended. ■ when playing. |
| **Loading Indicator** | Inside prompt input or as overlay | Brief "Generating..." or spinner when API request is in flight. | Visible during API call. Hidden on response or fallback. |
| **Offline Indicator** | Top-right corner, small dot | Green = online (API working). Yellow = using fallback template. Red = all keys failed, no templates match. | Persistent status. |

### 8.3 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0a0a0f` | Page background |
| `--bar-cyan` | `#00f0ff` | Primary accent |
| `--bar-magenta` | `#ff00aa` | Secondary accent |
| `--input-bg` | `rgba(20, 20, 30, 0.8)` | Prompt input background |
| `--input-border` | `#333` | Input border |
| `--input-focus` | `#00f0ff` | Input border on focus |
| `--text` | `#e0e0e0` | Input text |
| `--button-bg` | `#1a1a2e` | Button background |
| `--button-active` | `#00f0ff` | Button active state |
| `--record-active` | `#ff0044` | Recording indicator |

### 8.4 Typography
- **Font:** System sans-serif stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`). No custom font files.
- **Input:** 16px (prevents iOS zoom).
- **Button icons:** 24px (⏺ ⏸ ⏹ ▶ ■).

### 8.5 Interaction Flow

```
1. User opens page.
   → WebGL shows idle animation (gentle morphing geometry).
   → Input is focused.
   → Play button shows ▶. Record is grayed.

2. User clicks Play (▶).
   → AudioContext resumes (browser requirement).
   → Strudel scheduler starts with default idle pattern.
   → Button changes to ■.
   → Record button becomes active (no longer grayed).
   → WebGL reacts to audio.

3. User types "cyberpunk dark" and hits Enter.
   → Input shows loading state.
   → API rotator sends request (Key A → B → C).
   → Response arrives with Strudel code.
   → Code is evaluated.
   → Scheduler swaps pattern on next cycle boundary.
   → Music changes. WebGL config shifts (hash-based).
   → Input clears, ready for next prompt.

4. User clicks Record (⏺).
   → MediaRecorder starts capturing from MediaStreamDestination.
   → ⏺ pulses red. ⏸ and ⏹ appear.
   → Music continues playing.

5. User clicks Pause (⏸).
   → MediaRecorder.pause().
   → ⏺ changes to ⏺ (resume). ⏹ remains.
   → Music continues.

6. User clicks Stop (⏹).
   → MediaRecorder.stop().
   → Blob assembled from chunks.
   → Auto-download triggers: flow-session-{timestamp}.webm
   → OR show modal: "Download recording?" with filename.
   → Controls return to playback state (■).

7. User clicks Stop (■) during playback.
   → AudioContext suspends.
   → Scheduler pauses.
   → WebGL returns to idle animation.
   → Button changes to ▶.
```

---

## 9. Visualization Engine — WebGL Shaders

### 9.1 Concept
A **cymatic-inspired geometric pattern visualization** — not simple bars. Think fluid, mandala-like geometries that morph and pulse with the audio. The aesthetic is **synthwave/cyberpunk neon**.

### 9.2 Technology: `shader-web-background`

**Why this library:**
- Minimal footprint (transpiled with Google Closure Compiler)
- Cross-browser WebGL 1 & 2 support
- Shadertoy-compatible GLSL
- Supports uniforms (time, resolution, bass level, config index)
- No Three.js dependency
- Handles canvas resizing, error handling, context loss

**Installation:** `npm install shader-web-background`

### 9.3 Shader Architecture

**One fragment shader + 30 uniform configurations.**

The shader code stays the same. You change uniforms:
- `u_time` — animation time
- `u_resolution` — canvas size
- `u_bass` — bass level from AnalyserNode (0.0–1.0)
- `u_config` — configuration index (0–29), selected by prompt hash or random
- `u_color1`, `u_color2` — primary/secondary colors from config
- `u_complexity` — pattern complexity from config
- `u_speed` — animation speed from config

**Config selection:**
```javascript
function selectConfig(prompt) {
  const hash = stringHash(prompt); // simple hash function
  const index = hash % 30;
  return CONFIGS[index]; // returns { color1, color2, complexity, speed }
}
```

**No AI for background.** Deterministic, instant, zero tokens.

### 9.4 Shader Example Structure

```glsl
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform int u_config;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_complexity;
uniform float u_speed;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv = uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Cymatic-inspired pattern based on polar coordinates
  float r = length(uv);
  float a = atan(uv.y, uv.x);

  // Pattern morphs with bass and time
  float pattern = sin(r * u_complexity * 10.0 - u_time * u_speed) 
                * cos(a * 3.0 + u_bass * 5.0);

  // Color mixing based on config and bass
  vec3 color = mix(u_color1, u_color2, pattern + u_bass);

  // Glow effect
  float glow = exp(-r * 2.0) * (0.5 + u_bass);
  color += u_color1 * glow;

  gl_FragColor = vec4(color, 1.0);
}
```

### 9.5 Performance
- WebGL fragment shaders run on GPU.
- One fullscreen quad = trivial workload.
- 60fps guaranteed on any device with WebGL support.
- No Canvas 2D CPU overhead.

---

## 10. Recording Feature

### 10.1 Architecture

```
Strudel Master Output → GainNode (tap) → MediaStreamDestination → MediaRecorder
                                    │
                                    └──→ Speakers (user still hears it)
```

**Key challenge:** Strudel's `@strudel/webaudio` manages its own audio graph. You must insert a `GainNode` between Strudel's output and the destination to tap the stream.

**Strudel does NOT have built-in export.** There is a WIP PR (#1414) for audio recording, not merged. You must implement this yourself.

### 10.2 Implementation

```javascript
// 1. Create tap node
const tapNode = audioContext.createGain();
tapNode.gain.value = 1.0;

// 2. Create MediaStreamDestination
const destination = audioContext.createMediaStreamDestination();

// 3. Connect Strudel output to tap, tap to destination, tap to speakers
//    (Strudel's master output connects to audioContext.destination by default)
//    You need to intercept this connection
strudelMasterOutput.disconnect();
strudelMasterOutput.connect(tapNode);
tapNode.connect(destination);
tapNode.connect(audioContext.destination);

// 4. Create MediaRecorder
const recorder = new MediaRecorder(destination.stream, {
  mimeType: 'audio/webm;codecs=opus'
});

const chunks = [];
recorder.ondataavailable = (e) => {
  if (e.data.size > 0) chunks.push(e.data);
};

recorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flow-${Date.now()}.webm`;
  a.click();
  URL.revokeObjectURL(url);
};

// 5. Controls
function startRecording() {
  chunks.length = 0;
  recorder.start();
}

function pauseRecording() {
  recorder.pause();
}

function resumeRecording() {
  recorder.resume();
}

function stopRecording() {
  recorder.stop();
}
```

### 10.3 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| `MediaRecorder` | ✅ | ✅ | ✅ | ✅ |
| `createMediaStreamDestination` | ✅ | ✅ | ✅ | ✅ |
| WebM/Opus output | ✅ | ✅ | ✅ | ✅ |

### 10.4 Output Format

- **Native:** WebM container with Opus audio codec.
- **Quality:** 128kbps Opus (excellent for music).
- **File size:** ~1MB per minute.
- **Stretch goal:** WAV export requires additional client-side encoding (not recommended for hackathon).

### 10.5 UI States for Recording

| State | Visible Controls | Behavior |
|-------|-----------------|----------|
| **Idle (not playing)** | ▶ (Play) | Record button grayed/disabled |
| **Playing, not recording** | ■ (Stop) | ⏺ (Record) active, clickable |
| **Recording** | ⏸ (Pause) ⏹ (Stop) | ⏺ pulses red. ⏸ pauses recorder. ⏹ stops + downloads. |
| **Paused recording** | ⏺ (Resume) ⏹ (Stop) | ⏺ resumes recorder. ⏹ stops + downloads. |

---

## 11. State Management & Data Flow

### 11.1 Global State (React useState)

```javascript
// App-level state
{
  isPlaying: boolean,           // AudioContext state
  isRecording: boolean,         // MediaRecorder state
  isPaused: boolean,            // MediaRecorder paused state
  isLoading: boolean,           // API request in flight
  currentPrompt: string,        // Last submitted prompt
  currentPatternCode: string,   // Raw Strudel code
  patternObject: Pattern | null, // Evaluated Strudel pattern
  apiKeyIndex: number,          // Which key to try next (0,1,2)
  fallbackMode: boolean,        // Using pre-cached template
  error: string | null,         // Last error message
  history: Array<{              // Prompt history
    prompt: string,
    pattern: string,
    timestamp: number
  }>
}
```

### 11.2 Refs (useRef)

```javascript
// Non-reactive, mutable references
{
  audioContext: AudioContext,     // The Web Audio API context
  analyser: AnalyserNode,         // FFT analyser
  scheduler: Scheduler,           // Strudel scheduler instance
  gainNode: GainNode,             // Master gain for crossfade
  tapNode: GainNode,              // Recording tap node
  mediaRecorder: MediaRecorder,   // Recording instance
  canvasRef: HTMLCanvasElement,   // WebGL canvas element
  animationId: number,            // requestAnimationFrame ID
  abortController: AbortController // For fetch cancellation
}
```

### 11.3 Data Flow Diagram

```
User Input (PromptInput)
    │
    ▼
App State Update (isLoading = true)
    │
    ▼
API Rotator (backend/api/rotator.js)
    │
    ├── Success ──► CerebrasClient ──► AI Response (Strudel code)
    │                                   │
    │                                   ▼
    │                           Strudel Evaluator (backend/audio/engine.js)
    │                                   │
    │                                   ▼
    │                           Scheduler swaps pattern
    │                                   │
    │                                   ▼
    │                           App State Update (patternCode, isLoading = false)
    │                                   │
    │                                   ▼
    │                           WebGL Visualizer reads bass uniform
    │
    └── Failure ──► TemplateStore (fallback template)
                    │
                    ▼
            App State Update (fallbackMode = true, patternCode = template)
```

---

## 12. Error Handling & Fallbacks

### 12.1 Error Scenarios

| Error | Cause | Handling |
|-------|-------|----------|
| **API 429 (Rate Limit)** | Single key exceeded 5 RPM | Rotate to next key instantly. |
| **API Timeout** | Cerebras slow/stalled | Abort after 100ms. Rotate to next key. |
| **All Keys Failed** | All 3 keys exhausted or network down | Use pre-cached template. Show yellow offline dot. |
| **Malformed Strudel Code** | AI generated invalid syntax | Catch eval error. Keep playing last valid pattern. Show "tuning..." for 2 seconds. Log error. |
| **AudioContext Blocked** | Browser autoplay policy | Require Play button click. Never auto-init AudioContext. |
| **Strudel Evaluator Crash** | Rare internal error | Fallback to silent mode. Show error message. |
| **Network Offline** | No internet | Use template library exclusively. Show red offline dot. |
| **Recording Fail** | MediaRecorder not supported | Show "Recording not available" tooltip. |

### 12.2 Pre-Cached Template Library

Store 15+ templates as a static JSON array. Each template has:
- `id`: unique identifier
- `tags`: array of keywords for matching
- `name`: human-readable name
- `code`: valid Strudel code string
- `bpm`: tempo for display

**Matching Strategy:**
- If API fails, extract keywords from user prompt.
- Find template with highest tag overlap.
- If no match, default to Template 1 (ambient drone).

---

## 13. Development Pipeline

### 13.1 Phase 1: Skeleton (Hours 0–3)

| Task | Deliverable | Owner |
|------|-------------|-------|
| 1.1 Initialize Vite + React project with Kiro | `npm run dev` works | Kiro / Any |
| 1.2 Install dependencies | `@strudel/web`, `shader-web-background` | Any |
| 1.3 Verify Strudel plays sound | Button click → `stack(s("bd sd")).cpm(30)` plays | You (Audio) |
| 1.4 Verify WebGL shader renders | Background shows geometric pattern | Friend (Frontend) |
| 1.5 Scaffold UI components | Visualizer, PromptInput, controls render | Friend |
| 1.6 Apply dark theme + neon CSS | Looks like the spec | Friend |

### 13.2 Phase 2: Core Loop (Hours 3–8)

| Task | Deliverable | Owner |
|------|-------------|-------|
| 2.1 Build API rotator with 3 keys | Function `generatePattern(prompt)` returns string | You |
| 2.2 Write system prompt v1 | Cerebras outputs valid Strudel code 80% of the time | You |
| 2.3 Wire prompt → API → Strudel | Type prompt, hear music change | Both |
| 2.4 Verify cycle-boundary transition | Old pattern finishes, new starts smoothly | You |
| 2.5 Connect AnalyserNode to WebGL uniforms | Bass drives shader intensity | You |
| 2.6 Implement config selection | Prompt hash → shader config | Friend |

### 13.3 Phase 3: Recording & Polish (Hours 8–12)

| Task | Deliverable | Owner |
|------|-------------|-------|
| 3.1 Implement MediaRecorder tap | Recording captures Strudel output | You |
| 3.2 Wire record/pause/resume/stop UI | Controls work, states correct | Friend |
| 3.3 Auto-download on stop | Blob assembles, download triggers | You |
| 3.4 Additive prompting with context | "add rain" includes current code | You |
| 3.5 Pre-cache 15+ templates | `templates.json` loaded, fallback works | You |
| 3.6 Error handling + offline indicators | Graceful degradation, visual feedback | Friend |
| 3.7 Prompt engineering v2 | Better musical output, fewer syntax errors | You |
| 3.8 Idle animation for shader | Gentle morph when no audio | Friend |

### 13.4 Phase 4: Demo Hardening (Hours 12–14)

| Task | Deliverable | Owner |
|------|-------------|-------|
| 4.1 Stress test: 3 prompts in 10 seconds | API rotator handles load, no 429s | You |
| 4.2 Test recording end-to-end | Record 30 seconds, download plays back | You |
| 4.3 Test all fallback templates | Each plays correctly offline | You |
| 4.4 Test on Chrome, Firefox, Safari | No audio context bugs | Friend |
| 4.5 Demo script + pre-planned prompts | 3-minute walkthrough ready | Both |
| 4.6 Final Kiro review | Delete dead code, verify bundle size | Both |

---

## 14. Team Split & Responsibilities

### 14.1 You (Backend/Logic/Audio/API)

| Module | File(s) | Responsibility |
|--------|---------|----------------|
| API | `backend/src/api/cerebras.js`, `rotator.js` | Cerebras client, 3-key rotation, timeout logic |
| Audio | `backend/src/audio/engine.js`, `analyser.js`, `recorder.js` | Strudel init, pattern evaluation, MediaRecorder tap |
| Fallback | `backend/src/fallback/templates.js`, `matcher.js` | 15+ templates, keyword matcher, offline mode |
| Validation | `backend/src/validation/validator.js` | Strudel syntax pre-check, error handling |
| Prompts | `backend/src/prompts/system.js` | System prompt builder, context formatting |
| Shared | `shared/templates/`, `shared/prompts/` | Template library, system prompt drafts |

**Testing responsibilities:**
- API response times (measure with `performance.now()`)
- Key rotation stress test (fire 10 prompts rapidly)
- Fallback trigger test (block API calls, verify template selection)
- Recording functionality (record, pause, resume, stop, verify playback)
- Strudel output validation (test 20 prompts, measure syntax error rate)
- No API key leaks (verify keys only in env vars, never in source)

### 14.2 Your Friend (Frontend/UI/Visuals)

| Module | File(s) | Responsibility |
|--------|---------|----------------|
| Visualizer | `frontend/src/features/visualizer/Visualizer.jsx`, `useVisualizer.js` | WebGL shader background, uniform updates |
| Prompt | `frontend/src/features/prompt/PromptInput.jsx`, `usePrompt.js` | Input component, loading states, submission |
| Player | `frontend/src/features/player/PlayButton.jsx`, `RecordButton.jsx`, `usePlayer.js` | Play/stop, record/pause/resume/stop controls |
| Styles | `frontend/src/styles/global.css` | Dark theme, neon colors, layout, animations |
| Components | `frontend/src/components/` | Pure UI primitives (Button, Input, Icon) |
| Shared | `shared/shaders/` | GLSL shader, 30 uniform configs |

**Testing responsibilities:**
- WebGL performance (60fps on target devices)
- Responsive layout (mobile, tablet, desktop)
- Control state transitions (record → pause → resume → stop)
- Accessibility (keyboard navigation, focus states, aria-labels)
- Visual consistency (colors, spacing, animations)

### 14.3 Interface Contract

```javascript
// backend/src/api/index.js — You expose this
export async function generatePattern(userPrompt, currentCode) { ... }

// backend/src/audio/index.js — You expose this
export function initAudio() { ... }
export function playPattern(strudelCode) { ... }
export function stopAudio() { ... }
export function getBassLevel() { ... } // 0.0–1.0 for visualizer
export function startRecording() { ... }
export function pauseRecording() { ... }
export function resumeRecording() { ... }
export function stopRecording() { ... } // returns Promise<Blob>

// frontend imports
import { generatePattern } from '@backend/api';
import { 
  initAudio, playPattern, stopAudio, getBassLevel,
  startRecording, pauseRecording, resumeRecording, stopRecording 
} from '@backend/audio';
```

**Vite path aliases:**
```javascript
// vite.config.js
resolve: {
  alias: {
    '@backend': '/backend/src',
    '@shared': '/shared',
    '@frontend': '/frontend/src'
  }
}
```

---

## 15. Folder Structure

```
flow/
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── visualizer/
│   │   │   │   ├── Visualizer.jsx
│   │   │   │   ├── useVisualizer.js
│   │   │   │   ├── shaders/
│   │   │   │   │   ├── cymatic.frag
│   │   │   │   │   └── configs.json
│   │   │   │   └── index.js
│   │   │   ├── prompt/
│   │   │   │   ├── PromptInput.jsx
│   │   │   │   ├── usePrompt.js
│   │   │   │   └── index.js
│   │   │   └── player/
│   │   │       ├── PlayButton.jsx
│   │   │       ├── RecordButton.jsx
│   │   │       ├── usePlayer.js
│   │   │       └── index.js
│   │   ├── components/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   └── Icon.jsx
│   │   ├── hooks/
│   │   │   └── useAnimationFrame.js
│   │   ├── styles/
│   │   │   └── global.css
│   │   └── App.jsx
│   ├── public/
│   ├── index.html
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── cerebras.js
│   │   │   ├── rotator.js
│   │   │   └── index.js
│   │   ├── audio/
│   │   │   ├── engine.js
│   │   │   ├── analyser.js
│   │   │   ├── recorder.js
│   │   │   └── index.js
│   │   ├── fallback/
│   │   │   ├── templates.js
│   │   │   ├── matcher.js
│   │   │   └── index.js
│   │   ├── validation/
│   │   │   └── validator.js
│   │   └── prompts/
│   │       └── system.js
│   └── package.json
│
├── shared/
│   ├── templates/
│   │   └── library.json
│   ├── shaders/
│   │   └── configs.json
│   ├── prompts/
│   │   └── system-v1.md
│   └── types/
│       └── index.ts (or .js)
│
├── docs/
│   └── (this documentation)
│
├── .env.example
├── .gitignore
├── vite.config.js
└── package.json (root workspace)
```

---

## 16. Kiro CLI Integration

### 16.1 Kiro Setup

```bash
# Install Kiro CLI (if not already)
npm install -g kiro-cli

# Initialize project
kiro init Flow

# Set up project type
kiro config set framework react
kiro config set build_tool vite
```

### 16.2 Kiro Spec File (`kiro/spec.md`)

```markdown
# Flow Spec

## Overview
Single-page React app that generates music from text prompts using Strudel and Cerebras AI.
Features: WebGL shader background, real-time audio visualization, session recording.

## Tech Stack
- React 19 + Vite
- @strudel/web (Strudel umbrella package)
- shader-web-background (WebGL fragment shaders)
- Native fetch for API calls
- Native MediaRecorder for recording
- Plain CSS for styling

## Key Features
1. Fullscreen WebGL shader background (cymatic-inspired, reactive to bass).
2. Bottom-center prompt input with embedded record/pause/stop/play controls.
3. Prompt → Cerebras API → Strudel code → audible loop.
4. 3-key API rotation with 100ms timeout.
5. Pre-cached template fallback.
6. Cycle-boundary pattern updates (Strudel native).
7. Session recording via MediaRecorder (WebM/Opus).

## Constraints
- No image upload.
- No audio upload.
- No backend server.
- No user accounts.
- Maximize native APIs. Minimize dependencies.
```

### 16.3 Kiro Steering File (`.kiro/steering.md`)

```markdown
# Flow Steering

## Philosophy
- Prefer native browser APIs where sufficient and fast.
- Use Strudel for audio engine (do not rebuild a sequencer).
- Use shader-web-background for WebGL (do not write raw WebGL setup).
- Do not add dependencies for problems already solved by the browser.
- Keep code pragmatic. Ponytail is a guide, not a religion.

## Rules
- Use `fetch()`, not Axios.
- Use React `useState`, not Redux/Zustand.
- Use WebGL shaders via shader-web-background, not Three.js.
- Use plain CSS, not Tailwind.
- Validate all API responses before passing to Strudel.
- Every `fetch` must have an `AbortController` timeout.
- AudioContext must be initialized by user gesture only.
- MediaRecorder for recording, no external libraries.
- No backend deployment. Everything runs in the browser.
```

### 16.4 Kiro Workflow

```
1. kiro init
2. Paste spec.md into Kiro chat
3. Kiro generates task list
4. For each task:
   a. Ask Kiro to implement
   b. Review generated code
   c. Test in browser
   d. Ask Kiro to fix if broken
5. Use `kiro review` before final build
```

---

## 17. Pre-Cached Template Library

### 17.1 Template Structure

```json
[
  {
    "id": "ambient-fallback",
    "name": "Ambient Drone",
    "tags": ["ambient", "calm", "soft", "default", "fallback", "chill"],
    "bpm": 60,
    "code": "note("c3 g3 c4").sound("triangle").room(0.8).gain(0.5).cpm(15)"
  },
  {
    "id": "cyberpunk-dark",
    "name": "Cyberpunk Dark",
    "tags": ["cyberpunk", "dark", "techno", "industrial", "distorted", "synthwave"],
    "bpm": 128,
    "code": "stack(s("bd*4").bank("RolandTR909").gain(0.9), note("c2").sound("sawtooth").lpf(300).distort(0.4), s("hh*8").bank("RolandTR909").gain(0.6)).cpm(32)"
  },
  {
    "id": "cyberpunk-synthwave",
    "name": "Cyberpunk Synthwave",
    "tags": ["cyberpunk", "synthwave", "retro", "neon", "80s"],
    "bpm": 120,
    "code": "stack(s("bd*2 sd").bank("RolandTR909"), note("c3 e3 g3").sound("square").lpf(1200).delay(0.25), note("c2").sound("sawtooth").lpf(400)).cpm(30)"
  },
  {
    "id": "lofi-chill",
    "name": "Lo-Fi Chill",
    "tags": ["lofi", "chill", "relax", "study", "soft", "vinyl"],
    "bpm": 85,
    "code": "stack(s("bd*2, sd").bank("RolandTR909").gain(0.7), note("f3 a3 c4 e4").sound("triangle").room(0.6).gain(0.5), s("wind").gain(0.15)).cpm(21.25)"
  },
  {
    "id": "lofi-study",
    "name": "Lo-Fi Study Beats",
    "tags": ["lofi", "study", "beats", "soft", "rain"],
    "bpm": 80,
    "code": "stack(s("bd sd").bank("RolandTR909").gain(0.6), note("d3 f3 a3").sound("sine").room(0.7).gain(0.4), s("wind").gain(0.1)).cpm(20)"
  },
  {
    "id": "nature-rain",
    "name": "Nature Rain",
    "tags": ["nature", "rain", "ambient", "water", "soft", "calm"],
    "bpm": 90,
    "code": "stack(s("wind").gain(0.3), note("d3 a3 d4").sound("sine").room(0.7).gain(0.4), s("hh*4").bank("RolandTR909").gain(0.2)).cpm(22.5)"
  },
  {
    "id": "nature-forest",
    "name": "Forest Morning",
    "tags": ["nature", "forest", "morning", "birds", "calm", "ambient"],
    "bpm": 70,
    "code": "stack(note("c3 e3 g3").sound("triangle").room(0.8).gain(0.4), s("wind").gain(0.2), note("c4").sound("pluck").gain(0.3)).cpm(17.5)"
  },
  {
    "id": "techno-warehouse",
    "name": "Techno Warehouse",
    "tags": ["techno", "warehouse", "dark", "industrial", "heavy"],
    "bpm": 130,
    "code": "stack(s("bd*4").bank("RolandTR909").gain(0.95), note("c2").sound("sawtooth").lpf(200).distort(0.5), s("hh*8").bank("RolandTR909").gain(0.7)).cpm(32.5)"
  },
  {
    "id": "techno-minimal",
    "name": "Minimal Techno",
    "tags": ["techno", "minimal", "clean", "precise", "electronic"],
    "bpm": 125,
    "code": "stack(s("bd*4").bank("RolandTR909").gain(0.8), s("hh*4").bank("RolandTR909").gain(0.5), note("c2").sound("sine").lpf(300).gain(0.6)).cpm(31.25)"
  },
  {
    "id": "house-deep",
    "name": "Deep House",
    "tags": ["house", "deep", "dance", "smooth", "club"],
    "bpm": 122,
    "code": "stack(s("bd*4").bank("RolandTR909").gain(0.85), s("hh*8").bank("RolandTR909").gain(0.6), note("c3 e3 g3").sound("triangle").lpf(1000).room(0.5).gain(0.5)).cpm(30.5)"
  },
  {
    "id": "house-progressive",
    "name": "Progressive House",
    "tags": ["house", "progressive", "upbeat", "bright", "dance"],
    "bpm": 128,
    "code": "stack(s("bd*4").bank("RolandTR909").gain(0.9), note("c3 e3 g3").sound("square").lpf(1500).gain(0.6), s("cp*2").bank("RolandTR909").gain(0.7)).cpm(32)"
  },
  {
    "id": "jazz-lounge",
    "name": "Jazz Lounge",
    "tags": ["jazz", "lounge", "smooth", "rhodes", "sophisticated"],
    "bpm": 110,
    "code": "stack(s("bd*2 sd").bank("RolandTR909").gain(0.6), note("c3 e3 g3 b3").sound("triangle").room(0.6).gain(0.5), note("c2 g2 c3").sound("sine").lpf(400).gain(0.4)).cpm(27.5)"
  },
  {
    "id": "jazz-funk",
    "name": "Jazz Funk",
    "tags": ["jazz", "funk", "groovy", "bass", "rhodes"],
    "bpm": 115,
    "code": "stack(s("bd sd cp").bank("RolandTR909").gain(0.7), note("c3 e3 g3").sound("pluck").gain(0.5), note("c2").sound("sawtooth").lpf(500).gain(0.6)).cpm(28.75)"
  },
  {
    "id": "ambient-space",
    "name": "Space Ambient",
    "tags": ["ambient", "space", "cosmic", "drone", "vast"],
    "bpm": 50,
    "code": "stack(note("c2 g2 c3 e3").sound("sine").room(0.9).gain(0.4), note("c3").sound("triangle").lpf(800).gain(0.3)).cpm(12.5)"
  },
  {
    "id": "ambient-ocean",
    "name": "Deep Ocean",
    "tags": ["ambient", "ocean", "deep", "water", "calm"],
    "bpm": 55,
    "code": "stack(note("d2 a2 d3").sound("sine").room(0.8).gain(0.4), s("wind").gain(0.25)).cpm(13.75)"
  },
  {
    "id": "experimental-glitch",
    "name": "Glitch Experimental",
    "tags": ["experimental", "glitch", "noise", "abstract", "avant-garde"],
    "bpm": 100,
    "code": "stack(s("bd*2 sd").bank("RolandTR909").gain(0.8).speed(2), note("c2").sound("sawtooth").lpf(200).distort(0.6), s("wind").gain(0.3).speed(0.5)).cpm(25)"
  },
  {
    "id": "experimental-noise",
    "name": "Noise Drone",
    "tags": ["experimental", "noise", "drone", "harsh", "industrial"],
    "bpm": 40,
    "code": "stack(note("c2").sound("sawtooth").lpf(100).distort(0.8).gain(0.5), s("wind").gain(0.4)).cpm(10)"
  },
  {
    "id": "trap-dark",
    "name": "Dark Trap",
    "tags": ["trap", "dark", "hiphop", "808", "heavy"],
    "bpm": 140,
    "code": "stack(s("bd*2 sd").bank("RolandTR909").gain(0.9), note("c1").sound("sine").lpf(200).gain(0.8), s("hh*8").bank("RolandTR909").gain(0.6)).cpm(35)"
  }
]
```

### 17.2 Matching Algorithm

```javascript
function findFallbackTemplate(userPrompt) {
  const words = userPrompt.toLowerCase().split(/\s+/);
  let bestMatch = templates[0]; // default ambient
  let bestScore = 0;

  for (const template of templates) {
    const score = template.tags.filter(tag => words.includes(tag)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }
  return bestMatch;
}
```

---

## 18. System Prompt

### 18.1 Full System Prompt (v1.0)

```
You are a Strudel pattern generator. You write valid Strudel JavaScript code that produces looping musical patterns.

OUTPUT RULES:
1. Output ONLY valid Strudel code. No markdown. No explanation. No comments. No natural language.
2. Use stack() to layer sounds. Use 3–5 layers for rich, full patterns.
3. Use .cpm(N) for tempo where N = BPM / 4. Example: 128 BPM = .cpm(32).
4. Use .bank("RolandTR909") for all drum samples.
5. Use .sound("sawtooth" | "square" | "triangle" | "sine" | "pluck") for synths.
6. Use .lpf(freq), .hpf(freq), .room(0–1), .delay(0–1), .distort(0–1) for effects.
7. Use .gain(0–1) for volume control per layer.
8. Use every(N, ...) for variation/fills every N cycles.
9. Use when(...) for conditional pattern application.
10. Keep patterns to 4–8 bars maximum.
11. Aim for 10–25 lines of code.
12. If the user says "add X", include the existing pattern plus the new element.
13. If the user says "change to X" or "shift to X", generate a completely new pattern.
14. If the user says "remove X", regenerate without that element.
15. If the user says "more intense", open filters, add distortion, increase tempo slightly.
16. If the user says "slower" or "faster", adjust .cpm() accordingly.

AVAILABLE PRIMITIVES:

Drums (all use .bank("RolandTR909")):
- s("bd") — kick drum
- s("sd") — snare
- s("hh") — closed hi-hat
- s("oh") — open hi-hat
- s("cp") — clap

Synths:
- note("c2").sound("sawtooth") — bass
- note("c4").sound("square") — lead
- note("c3 e3 g3").sound("triangle") — pad/chords
- note("c4").sound("pluck") — plucked
- note("c3").sound("sine") — sub/bass

Textures:
- s("wind").gain(0.2) — wind/ambient

Effects:
- .lpf(400) — low-pass filter (Hz)
- .hpf(200) — high-pass filter (Hz)
- .room(0.6) — reverb amount
- .delay(0.25) — delay amount
- .distort(0.3) — distortion
- .gain(0.7) — volume

Rhythm:
- s("bd*4") — kick every beat
- s("hh*8") — hi-hat every 8th note
- s("bd*2 sd") — kick on 1 and 3, snare on 4
- note("c2 ~ c2 ~") — rests with ~

Melody:
- note("c3 e3 g3") — chord
- n("0 2 4").scale("C:minor") — scale-based
- every(4, note("c4")) — fill every 4 cycles

EXAMPLE 1 — Techno 130bpm:
stack(
  s("bd*4").bank("RolandTR909").gain(0.9),
  s("hh*8").bank("RolandTR909").gain(0.6),
  note("c2").sound("sawtooth").lpf(400).gain(0.7),
  note("c4 e4 g4").sound("square").lpf(1500).delay(0.25).gain(0.5)
).cpm(32.5)

EXAMPLE 2 — Lo-Fi 85bpm:
stack(
  s("bd*2, sd").bank("RolandTR909").gain(0.7),
  note("f3 a3 c4 e4").sound("triangle").room(0.6).gain(0.5),
  s("wind").gain(0.15)
).cpm(21.25)

EXAMPLE 3 — Add rain to existing:
Current: stack(s("bd*4"), note("c2").sound("sawtooth")).cpm(32)
Request: add rain
Output: stack(s("bd*4").bank("RolandTR909").gain(0.9), note("c2").sound("sawtooth").lpf(400).gain(0.7), s("wind").gain(0.2)).cpm(32)
```

### 18.2 Context Format for Additive Prompts

```
Current Pattern: [current strudel code]
Request: [user prompt]
```

The AI receives this as the user message. The system prompt (above) is sent simultaneously.

---

## 19. Security & Compliance

### 19.1 API Key Security
- Keys stored in `.env` files, never in source code.
- `.env` is in `.gitignore`.
- In production build, keys injected via environment variables at build time.
- For demo purposes, if keys must be in the client, accept the risk (free tier, no billing).
- **No API key leaks:** Verify keys only appear in env vars and rotator config. Never log to console. Never expose in error messages.

### 19.2 AGPL Compliance (Strudel)
- Strudel is licensed under AGPL.
- If Flow is distributed (hosted on a URL), the source code must be made available to users.
- **Action:** Add a "Source Code" link in the footer pointing to the project's GitHub repository.
- Include Strudel attribution: "Powered by Strudel (tidalcycles.org)".

### 19.3 Cerebras Terms of Service
- Using multiple personal free-tier accounts for a single project is a gray area.
- Mitigation: Each key belongs to a team member. The app is a team project. If questioned, explain as "load balancing across team members' allocated quotas."
- Do not automate account creation. Only use existing legitimate accounts.

### 19.4 Recording Privacy
- Recording happens entirely client-side.
- No audio data is sent to any server.
- Blob is created in browser memory and downloaded directly.
- No privacy concerns — user owns their recording.

---

## 20. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cerebras rotates/changes models post-hackathon | Medium | High | Use generic endpoint. Do not hardcode model names. Have Groq fallback config ready. |
| Strudel npm package has breaking changes | Low | Medium | Pin versions in package.json. Test `npm install` in clean env. |
| Generated Strudel code is invalid > 20% of the time | Medium | High | Better system prompt. Output validation. Pre-cached templates as floor. |
| Browser blocks AudioContext until user gesture | High | Medium | Play button is mandatory. Clear UX. Never autoplay. |
| 3 Cerebras keys all hit rate limit simultaneously | Low | Medium | Keys are independent accounts. Unlikely to all hit 5 RPM at same second. |
| Strudel bundle size too large for fast load | Low | Medium | Vite tree-shaking. Test with `vite build`. |
| WebGL shader fails on old/mobile devices | Medium | Low | shader-web-background handles WebGL 1 fallback. Test on target devices. |
| MediaRecorder not supported | Low | Low | Show "Recording not available" tooltip. Graceful degradation. |
| Recording quality is poor | Low | Low | Opus at 128kbps is excellent. Test playback. |
| AGPL compliance question at demo | Low | Low | Add "Source Code" link to footer. Link to GitHub repo with Strudel attribution. |

---

## 21. Final Decision Lock

| # | Decision | Final Choice |
|---|----------|--------------|
| 1 | **Project Name** | Flow |
| 2 | **Strudel Package** | `@strudel/web` umbrella |
| 3 | **System Prompt** | Static + dynamic context, every request |
| 4 | **Background Visuals** | WebGL fragment shaders via `shader-web-background`, 30 uniform configs, no AI |
| 5 | **Fallback Templates** | 18 pre-cached patterns |
| 6 | **Code Line Limit** | 10–25 lines of Strudel (guidance, not hard limit) |
| 7 | **Recording** | MediaRecorder + `createMediaStreamDestination()` on Strudel output tap. WebM/Opus. Auto-download on stop. |
| 8 | **UI Controls** | ⏺ Record, ⏸ Pause, ⏹ Stop, ▶/■ Play/Stop — all inside search bar |
| 9 | **Cerebras RPM** | 5 RPM per key (verified official) |
| 10 | **Infrastructure** | No backend deployment; logical backend layer in repo |
| 11 | **Team Split** | You: `backend/` + `shared/`. Friend: `frontend/` + `shared/`. |
| 12 | **Kaggle** | ❌ Rejected. Not an inference API. |
| 13 | **Build Tool** | Kiro CLI + Vite |
| 14 | **Framework** | React 19 |
| 15 | **HTTP Client** | Native `fetch` |
| 16 | **State Management** | React `useState` / `useRef` |
| 17 | **Styling** | Plain CSS |
| 18 | **Transition** | Hard cut at cycle boundary (MVP). Crossfade is stretch goal. |
| 19 | **Additive Prompting** | Full regeneration with context |
| 20 | **Max Lines** | None — write what is needed |

---

## 22. Immediate Next Steps

1. **Create GitHub repository** for Flow.
2. **Acquire 3 Cerebras API keys** (one per team member) at `cloud.cerebras.ai`.
3. **Test each key** with a simple curl to verify 5 RPM limit.
4. **Write `kiro/spec.md`** and `.kiro/steering.md`.
5. **Run `kiro init`** and scaffold the project.
6. **Install dependencies** (`@strudel/web`, `shader-web-background`) and verify sound + shader output.
7. **Draft system prompt** and test with 5 example prompts.
8. **Create `templates.json`** with 18 fallback patterns.
9. **Begin Phase 1** of the development pipeline.

---

*End of Documentation. Ready for build.*
