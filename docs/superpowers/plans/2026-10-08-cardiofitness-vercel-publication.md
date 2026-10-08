# Cardiofitness Vercel Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a sanitized deployable copy of the existing Cardiofitness Next.js app, validate it, publish it to a private GitHub repository named `cardiofitness`, and deploy it to Vercel when authenticated.

**Architecture:** Preserve the existing Next.js server-rendered application, Supabase authorization, read-only Google Forms integration, and PDF/Excel exports. Copy the source into a separate destination, remove local secrets and generated artifacts, validate from the lockfile, then use GitHub as the Vercel deployment source with runtime secrets configured only in Vercel.

**Tech Stack:** Next.js 16.4, React 19.3, TypeScript 5.9, npm, Vitest, Supabase, Google Forms API, GitHub, Vercel, Node.js 22+.

**Spec:** `docs/superpowers/specs/2026-10-08-cardiofitness-vercel-design.md`

## Global Constraints

- The source is `cardiofitness-avaliacoes`; the published local copy is `outputs\cardiofitness`.
- The GitHub repository is private, personal, named `cardiofitness`, with `main` as the primary branch.
- `APP_DEMO_MODE=true` is allowed only for deliberate local demonstrations using fictional local data.
- Production uses `APP_DEMO_MODE=false`; missing credentials never grant unrestricted access.
- Google Forms is read-only on the server; do not add form creation, response submission, feedback import, IA, comments, goals, reminders, or rankings.
- Do not commit `.env.local`, concrete environment files, OAuth tokens, private keys, service-role keys, `node_modules`, `.next`, coverage, test reports, or build caches.
- Never place server secrets in `NEXT_PUBLIC_*`.
- Do not provision a paid Supabase project or claim a real connection without verification.
- Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` in the sanitized copy before publication.
- Use only non-destructive, explicit path operations; do not modify or delete the source application.

---

### Task 1: Create and sanitize the deployable copy

**Files:**
- Create: `C:\Users\italo\Documents\Codex\2026-10-07\referenced-chatgpt-conversation-this-is-an\outputs\cardiofitness\**`
- Source reference: `...\outputs\cardiofitness-avaliacoes\**`
- Verify: `.gitignore`, `.env.example`, `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: the existing application tree and its lockfile.
- Produces: a separate destination tree containing only deployable source, public assets, tests, scripts, Supabase schemas, Google Forms tooling, and documentation.

- [ ] **Step 1: Confirm the destination is absent or empty enough to avoid overwriting unrelated files.**

Run:

```powershell
$destination = 'C:\Users\italo\Documents\Codex\2026-10-07\referenced-chatgpt-conversation-this-is-an\outputs\cardiofitness'
if (Test-Path $destination) { Get-ChildItem -Force $destination | Select-Object Name,Mode,Length } else { Write-Output 'DESTINATION_ABSENT' }
```

Expected: `DESTINATION_ABSENT`, or a manually reviewed destination with no unrelated files.

- [ ] **Step 2: Copy the source while excluding generated and secret paths.**

Use an explicit PowerShell file copy script or `robocopy` invocation with exclusions for `.git`, `node_modules`, `.next`, `.env.local`, all `.env` files except `.env.example`, `*.tsbuildinfo`, `coverage`, test reports, OAuth tokens, credentials, and private-key files. Do not use a wildcard deletion against the source or destination root.

- [ ] **Step 3: Verify the sanitized copy and secret exclusions.**

Run:

```powershell
Set-Location $destination
Get-ChildItem -Force | Select-Object Name,Mode,Length
Get-ChildItem -Recurse -Force -File | Where-Object { $_.Name -match '(^\.env($|\.)|credentials|tokens|\.pem$|\.key$|tsbuildinfo)' } | Select-Object FullName
```

Expected: `.env.example` may appear; `.env.local`, concrete `.env` files, credentials, tokens, private keys, and `tsconfig.tsbuildinfo` do not appear.

- [ ] **Step 4: Check the copy’s ignore rules before Git initialization.**

Confirm `.gitignore` ignores `.env*` except `.env.example`, `node_modules`, `.next`, caches, coverage, reports, credentials, and tokens. If the copy lacks a rule required by the spec, update only the copied `.gitignore`.

- [ ] **Step 5: Commit the sanitized-copy milestone in the destination repository after validation in Task 2.**

This task does not initialize or commit Git before the validation gate.

### Task 2: Validate the sanitized application

**Files:**
- Verify: `package.json`, `package-lock.json`, `src/**`, `tests/**`, `next.config.ts`
- Modify only if required by a failing validation: the specific application file and an accompanying test

**Interfaces:**
- Consumes: the sanitized copy from Task 1.
- Produces: reproducible dependency installation and passing typecheck, tests, production build, and browser smoke checks.

- [ ] **Step 1: Install exactly from the lockfile.**

Run from `outputs\cardiofitness`:

```powershell
npm ci
```

Expected: exit code 0, with dependencies installed from `package-lock.json`.

- [ ] **Step 2: Run the typecheck and test suite.**

Run:

```powershell
npm run typecheck
npm test
```

Expected: both commands pass. If a failure is introduced by copying, fix the root cause in the copy and rerun the smallest failing command before continuing.

- [ ] **Step 3: Run the production build.**

Run:

```powershell
npm run build
```

Expected: Next.js production build succeeds. Treat missing environment variables as a configuration issue to document or fix in the copy; never add real secrets to source.

- [ ] **Step 4: Perform the browser smoke check with fictional data only.**

Create a temporary local `.env.local` in the destination containing only:

```dotenv
APP_DEMO_MODE=true
```

Start `npm run dev`, inspect the app in a browser at `http://127.0.0.1:3000`, and verify navigation, collaborator selection/edit/deactivation, results, settings, and PDF/Excel export. Stop the server, remove that specific temporary `.env.local`, and confirm it is absent.

- [ ] **Step 5: Record validation evidence without committing generated output.**

Re-run `git status` after Git initialization, or inspect the file tree before Git initialization, ensuring no `.env.local`, `node_modules`, `.next`, or reports are staged.

### Task 3: Initialize and publish the private GitHub repository

**Files:**
- Create: `outputs\cardiofitness\.git\`
- Verify: `outputs\cardiofitness\.gitignore`
- Commit: sanitized application files only

**Interfaces:**
- Consumes: validated sanitized copy from Task 2.
- Produces: private GitHub repository `cardiofitness`, `main` branch, initial commit, and pushed remote.

- [ ] **Step 1: Initialize Git in the destination and review the staging set.**

Run:

```powershell
Set-Location 'C:\Users\italo\Documents\Codex\2026-10-07\referenced-chatgpt-conversation-this-is-an\outputs\cardiofitness'
git init -b main
git add .
git status --short
```

Expected: only source, documentation, configuration templates, lockfile, tests, scripts, and public assets are staged. Unstage and investigate any secret or generated file.

- [ ] **Step 2: Commit the sanitized application.**

Run:

```powershell
git commit -m "chore: prepare Cardiofitness for deployment" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 3: Create the private personal GitHub repository only if GitHub authentication is available.**

Use the authenticated GitHub integration or an authenticated GitHub CLI/API flow to create `cardiofitness` as private and empty. Do not create a public fallback, embed credentials in a remote URL, or claim success if authentication is unavailable.

- [ ] **Step 4: Add the remote and push `main`.**

Run with the authenticated HTTPS or SSH remote returned by GitHub:

```powershell
git remote add origin <authenticated-repository-url>
git push -u origin main
```

Expected: `main` is visible in the private repository. If blocked by GitHub auth, preserve the local commit and report the exact blocker.

- [ ] **Step 5: Confirm the remote and clean working tree.**

Run:

```powershell
git remote -v
git status --short
git log -1 --oneline
```

Expected: correct private repository remote, clean status, and the deployment commit at `main`.

### Task 4: Connect and deploy through Vercel

**Files:**
- Verify: Vercel project settings, environment variables, deployment logs
- Do not commit: Vercel tokens, environment values, or deployment metadata containing secrets

**Interfaces:**
- Consumes: private GitHub repository `cardiofitness` and validated `main` branch.
- Produces: Vercel production deployment, or an explicit authentication/configuration blocker.

- [ ] **Step 1: Confirm Vercel authentication before changing project settings.**

Use the authenticated Vercel integration or CLI. If unavailable, stop this task without creating an unauthenticated or public project and report that Vercel authentication is required.

- [ ] **Step 2: Import the private GitHub repository as a Next.js project.**

Select `cardiofitness`, preserve the repository’s build command `npm run build`, use Node.js 22 or newer, and do not configure a static export.

- [ ] **Step 3: Configure production environment variables only in Vercel.**

Set `APP_DEMO_MODE=false`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `APP_URL` with the final HTTPS domain, Google server-side OAuth/service variables, and `GOOGLE_LOGIN_ENABLED` according to the verified production configuration. Do not set service-role keys in `NEXT_PUBLIC_*`; do not invent missing values.

- [ ] **Step 4: Deploy and inspect the production build.**

Trigger a production deployment from `main`. Expected: build succeeds and the deployment URL is returned. If a required environment value is missing, mark the deployment blocked rather than enabling demo mode in production.

- [ ] **Step 5: Perform post-deployment acceptance checks.**

Verify the public domain rejects unauthenticated protected access, a non-RH user cannot access RH data, an authorized RH user can log in and navigate, and PDF/Excel exports work. Verify Google synchronization only with explicit authorization and read-only scopes. Do not query real responses merely to make the deployment appear complete.

### Task 5: Update deployment documentation with verified results

**Files:**
- Modify: `docs/PUBLICAR_NA_VERCEL.md`
- Modify only if needed: `README.md`

**Interfaces:**
- Consumes: actual GitHub/Vercel results from Tasks 3–4.
- Produces: documentation that distinguishes completed deployment facts from authentication or environment blockers.

- [ ] **Step 1: Compare the deployment guide with the actual configuration.**

Keep the existing security instructions, Node.js requirement, environment names, and Supabase/RH authorization rules. Do not add secrets, tokens, private URLs, or unverifiable claims.

- [ ] **Step 2: Record only verified repository/deployment status.**

If GitHub or Vercel authentication was unavailable, state the exact pending step and required credential. If deployment succeeded, record only the verified repository/production URL and date, excluding secret values.

- [ ] **Step 3: Re-run the documentation-sensitive validation and inspect Git status.**

Run:

```powershell
npm run typecheck
npm test
npm run build
git status --short
```

Expected: validation passes and only intended documentation changes are uncommitted or committed.

