<div align="center">

<img src="docs/vocally-logo.png" alt="Vocally" width="280" />

### Your keyboard is holding you back.

Make voice your new keyboard. Type four times faster by using your voice.

<br/>

**[Website](https://vocally-web.vercel.app)** &nbsp;&middot;&nbsp; **[Download](https://vocally-web.vercel.app/download)**

</div>

---

Vocally is an open-source, cross-platform speech-to-text app. Dictate into any desktop application, clean the transcript with AI, and keep your personal glossary in sync. The repo bundles the desktop app, marketing site, Supabase backend, and shared packages in a single Turborepo.

## Highlights

- **Voice input everywhere** &mdash; overlay, hotkeys, and system integrations across macOS, Windows, and Linux.
- **Choose your engine** &mdash; run Whisper locally (with optional GPU acceleration) or use Groq's hosted Whisper.
- **AI text cleanup** &mdash; automatically remove filler words and false starts via the `@repo/voice-ai` pipeline.
- **Personal dictionary** &mdash; glossary terms and replacement rules keep recurring names and phrases accurate.
- **Multi-auth sign-in** &mdash; Google, Kakao, and email/password via Supabase Auth.
- **Pro subscriptions** &mdash; monthly and yearly plans powered by Polar with webhook-driven management.
- **Works offline** &mdash; local Whisper inference means no internet required.

## Monorepo Layout

```
apps/
  desktop/          Tauri desktop app (Vite + React + Zustand)
    src-tauri/      Rust API layer — audio, Whisper, SQLite, native integrations
  web/              Marketing site (Vite + React), deployed to Vercel

packages/
  voice-ai/         Audio chunking + Groq client for transcription & cleanup
  types/            Shared domain models
  pricing/          Subscription plan definitions
  utilities/        Reusable helpers (usage limits, collections)
  ui/               UI primitives
  eslint-config/    Shared lint rules
  typescript-config/ Shared TS config

docs/               Architecture notes, release guides, reference material
```

## Getting Started

### Prerequisites

- **Node.js 18+** and **npm 10+**
- **Rust toolchain** with `cargo`, `rustup`, and the Tauri CLI (`cargo install tauri-cli`)
- Platform dependencies for Tauri (see platform-specific notes below)
- **Groq API key** (optional) for hosted transcription

### Install & Build

```sh
npm install
npm run build
```

### Run the Desktop App

```sh
# macOS
npm run dev:mac --workspace apps/desktop

# Windows
npm run dev:windows --workspace apps/desktop

# Linux
npm run dev:linux --workspace apps/desktop

# Linux with Vulkan GPU acceleration
npm run dev:linux:gpu --workspace apps/desktop
```

### Run the Marketing Site

```sh
npm run dev --workspace apps/web
```

### Quality Checks

```sh
npm run lint
npm run check-types
npm run test
```

## Architecture

The desktop app follows a TypeScript-first design. Zustand manages a single global store, pure utility functions read and mutate state, and actions compose those utilities with API calls. Repos abstract local (SQLite via Tauri) vs. remote (Supabase) persistence.

```
User input / system events
        ↓
React + Zustand (TypeScript)
        ↓
Repos → local or remote storage
        ↓
Tauri commands (Rust)
        ↓
SQLite, Whisper, or Supabase Edge Functions
```

Rust handles native integrations (audio capture, keyboard injection, updater, encryption, GPU). TypeScript owns business logic, routing, and UI.

See [`docs/desktop-architecture.md`](docs/desktop-architecture.md) for the full tour.

## Environment Variables

| Variable                              | Purpose                             |
| ------------------------------------- | ----------------------------------- |
| `VITE_SUPABASE_URL`                   | Supabase project URL                |
| `VITE_SUPABASE_ANON_KEY`              | Supabase anonymous key              |
| `VOQUILL_API_KEY_SECRET`              | Encrypts API keys stored on disk    |
| `VOQUILL_WHISPER_MODEL_URL`           | Override Whisper model download URL |
| `VOQUILL_WHISPER_DISABLE_GPU`         | Force CPU-only inference            |
| `VOQUILL_GOOGLE_CLIENT_ID` / `SECRET` | Google OAuth credentials            |
| `GROQ_API_KEY`                        | Groq transcription & cleanup        |
| `POLAR_ACCESS_TOKEN`                  | Polar checkout sessions             |
| `POLAR_WEBHOOK_SECRET`                | Polar webhook verification          |

## Releases

- **Desktop**: `.github/workflows/release-desktop.yml` builds all platforms and publishes assets. See [`docs/desktop-release.md`](docs/desktop-release.md).
- **Marketing site**: auto-deployed to Vercel on push to `main`.

## License

AGPLv3. See [`LICENCE`](LICENCE) for details.
