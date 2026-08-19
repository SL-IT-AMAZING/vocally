<div align="center">

<img src="docs/vocally-logo.png" alt="Vocally" width="280" />

### Your keyboard is holding you back.

Make voice your new keyboard. Type four times faster by using your voice.

<br/>

**[Website](https://vocally-web.vercel.app)** &nbsp;&middot;&nbsp; **[Download](https://vocally-web.vercel.app/download)**

</div>

---

Vocally is a cross-platform speech-to-text app. Dictate into any desktop application, clean the transcript with AI, and keep your personal glossary in sync. The repo bundles the desktop app, marketing site, Supabase backend, and shared packages in a single Turborepo.

## Highlights

- **Voice input everywhere** &mdash; overlay, hotkeys, and system integrations across macOS, Windows, and Linux.
- **Choose your engine** &mdash; run Whisper locally (with optional GPU acceleration) or use Groq's hosted Whisper.
- **AI text cleanup** &mdash; automatically remove filler words and false starts via the `@repo/voice-ai` pipeline.
- **Personal dictionary** &mdash; glossary terms and replacement rules keep recurring names and phrases accurate.
- **Multi-auth sign-in** &mdash; Google, Kakao, and email/password via Supabase Auth.
- **Pro subscriptions** &mdash; monthly and yearly KRW plans powered by Toss Payments with server-side billing management.
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

| Variable                              | Purpose                                                          |
| ------------------------------------- | ---------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                   | Supabase project URL                                             |
| `VITE_SUPABASE_ANON_KEY`              | Supabase anonymous key                                           |
| `VITE_TOSS_CLIENT_KEY`                | Toss Payments client key                                         |
| `VOQUILL_API_KEY_SECRET`              | Encrypts API keys stored on disk                                 |
| `VOQUILL_WHISPER_MODEL_URL`           | Override Whisper model download URL                              |
| `VOQUILL_WHISPER_DISABLE_GPU`         | Force CPU-only inference                                         |
| `VOQUILL_GOOGLE_CLIENT_ID` / `SECRET` | Google OAuth credentials                                         |
| `GROQ_API_KEY`                        | Groq transcription & cleanup                                     |
| `TOSS_SECRET_KEY`                     | Toss Payments server API key                                     |
| `TOSS_PRICE_MONTHLY_KRW`              | Monthly price in KRW                                             |
| `TOSS_PRICE_SEMIANNUAL_KRW`           | Semiannual price in KRW                                          |
| `TOSS_PRICE_YEARLY_KRW`               | Yearly price in KRW                                              |
| `TOSS_SITE_URL`                       | Public checkout site URL                                         |
| `TOSS_CRON_SECRET`                    | Secret for recurring billing job                                 |
| `KAKAOPAY_SECRET_KEY`                 | Kakao Pay server Secret key                                      |
| `KAKAOPAY_CID_SUBSCRIPTION`           | Kakao Pay recurring-payment CID                                  |
| `KAKAOPAY_CID_SECRET`                 | Optional Kakao Pay CID secret                                    |
| `KAKAOPAY_SITE_URL`                   | Registered checkout site URL                                     |
| `KAKAOPAY_CRON_SECRET`                | Secret for Kakao Pay renewal job                                 |
| `KAKAOPAY_ADMIN_SECRET`               | Server-only refund/reconciliation secret                         |
| `VITE_KAKAOPAY_ENABLED`               | Set to `true` only after approval, issued credentials, and release checks |

Toss automatic billing requires a separate billing agreement. After the agreement is active, configure the secrets above in Supabase Edge Functions, apply the Toss migration, deploy `toss-checkout`, `toss-billing-issue`, `toss-cancel-subscription`, and `toss-recurring`, and invoke `toss-recurring` at least daily with the `x-cron-secret` header. The public checkout uses `/checkout/toss`; success redirects to `/checkout/toss/success` and cancellation redirects to `/checkout/cancel`.

Kakao Pay recurring billing supports the Monthly (KRW 7,000), Semiannual (KRW 39,000), and Annual (KRW 70,000) plans, but requires a separate Kakao Pay recurring CID and Secret key. Before enabling it in production, a representative must complete Partner Center registration, business-app conversion and online-payment approval, then register `https://vocally.site` as a web platform domain. Store the server values only in Supabase Edge Function secrets. Deploy `kakaopay-ready`, `kakaopay-approve`, `kakaopay-recurring`, `subscription-cancel`, `kakaopay-cancel-payment`, and `kakaopay-reconcile`; invoke `kakaopay-recurring` daily with `x-cron-secret`. Keep `VITE_KAKAOPAY_ENABLED` unset until approval, issued live credentials, server-side disabled/enabled smoke checks, and explicit authorization to activate payment. Kakao Pay Money receipts are issued automatically by Kakao Pay, so Vocally does not issue a duplicate cash receipt.

## Branch Strategy

Trunk-based development with short-lived feature branches.

### Branches

| Branch      | Purpose                | Deploys to                                  |
| ----------- | ---------------------- | ------------------------------------------- |
| `main`      | Production-ready trunk | Web (auto), Server (auto), Desktop (manual) |
| `feature/*` | New features           | —                                           |
| `fix/*`     | Bug fixes              | —                                           |
| `chore/*`   | Maintenance, CI, docs  | —                                           |

### Rules

1. **`main` is always deployable.** Never push broken code directly.
2. **All changes go through PRs.** Branch off `main`, open a PR, merge back.
3. **Keep branches short-lived.** Aim for < 1 week. Smaller PRs merge faster.
4. **Delete branches after merge.** Keep the repo clean.

### Workflow

```
main ─────────────────────────●─────── (auto-deploy web/server)
       \                     /
        feature/add-glossary  (PR → squash merge)
```

1. `git checkout -b feature/my-feature`
2. Commit, push, open PR to `main`
3. CI runs tests on the PR
4. Squash merge into `main`
5. Web and Server auto-deploy; Desktop releases are triggered manually

## Releases

- **Desktop**: `.github/workflows/release-desktop.yml` builds all platforms and publishes assets. See [`docs/desktop-release.md`](docs/desktop-release.md).
- **Marketing site**: auto-deployed to Vercel on push to `main`.

## License

Licensed under the [GNU Affero General Public License v3.0](LICENCE). Originally forked from [voquill](https://github.com/josiahsrc/voquill) by Handaptive Software, LLC.
