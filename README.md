# Pharma ERP: Monorepo

Turborepo + pnpm monorepo. Unified multi-tenant architecture for pharmacy Point-of-Sale (POS), inventory, controlled medicines, fiscal billing, and peripheral hardware control.

```
apps/
  api/        NestJS 11 · Prisma 7 (driver adapter) · Zod · JWT + RBAC · Google login · Resend
              integrations/: soap · signature (XML-DSig, RSA, .p12) · bank (signed REST) · mail
              billing/: FiscalAdapter interface + SIN Bolivia SIAT skeleton
  web/        React 19 + Vite · Tailwind 4 · shadcn/ui · TanStack Query/Table · Zustand · RHF + Zod · Axios · Sonner
  desktop/    Tauri 2 native shell loading apps/web (Rust hardware commands: printer, drawer, scale)
  mobile/     React Native (Expo) · Offline-first POS · 2G/3G sync engine · Local Outbox · Device XML-DSig signer
packages/
  contracts/  Zod schemas + permissions catalog shared by api, web, desktop, and mobile
```

---

## Quick start

```bash
pnpm install
cp apps/api/.env.example apps/api/.env     # set JWT_SECRET (32+ chars)
cp apps/web/.env.example apps/web/.env
pnpm db:up                                  # PostgreSQL 17 via docker compose
pnpm db:migrate                             # creates the database schema
pnpm dev                                    # contracts (watch) + api :3000 + web :5173
```

Open http://localhost:5173: the home page calls `GET /api/hello` and verifies the database connection.

### Desktop (Tauri 2 - requires Rust: https://tauri.app/start/prerequisites/)
```bash
pnpm dev:desktop        # starts web + opens the native Tauri window
pnpm build:desktop      # generates the native installer (.exe / .msi / .dmg)
```

### Mobile (React Native / Expo)
```bash
pnpm dev:mobile         # starts the Expo development server (scan QR with Expo Go or run on emulator)
```

---

## Core Architecture Goals & Design Principles

> **Major Rule — Keep It Simple (Less is More):**
> Prioritize simplicity and pragmatic solutions above all else. Avoid premature abstractions, speculative generalizations, and over-engineering. Less code and fewer moving parts mean fewer points of failure, lower cognitive load, and easier maintainability across all platforms.

1. **Keep It Simple & Less is More (KISS)**:
   - Prefer straightforward, readable implementations over complex architectural layers or unnecessary abstractions.
   - Build strictly for current requirements rather than hypothetical future needs.
   - Fewer dependencies and fewer lines of code reduce bugs and keep maintenance friction low.

2. **Single Source of Truth (`@pharma/contracts`)**:
   - Every Zod schema, DTO type, and permission key is defined in `packages/contracts` and imported across backend, web, desktop, and mobile.
   - Eliminates contract drift, duplicated validation logic, and type mismatches.

3. **Unified Cross-Platform Strategy**:
   - **Web (`apps/web`)**: Cloud management dashboard, backoffice reporting, and browser POS.
   - **Desktop (`apps/desktop`)**: Stationed cashier counters. Reuses the Web UI inside a native Tauri 2 container with direct OS-level access to thermal receipt printers (ESC/POS), cash drawer kickers, and weighing scales.
   - **Mobile (`apps/mobile`)**: Handheld warehouse barcode scanning, field deliveries, and portable offline POS terminals.

4. **Multi-Tenancy & Default-Deny Security**:
   - Strict tenant isolation (`tenantId` on all operational records).
   - All API endpoints require a valid JWT unless explicitly decorated with `@Public()`.
   - Granular RBAC permissions enforced on the backend with `@RequirePermissions(...)` and checked on clients with `can('permission.key')`.

---

## Offline-First & 2G/3G Working Rules

In pharmacy retail and rural operations, networks frequently drop or suffer high latency (2G/3G). The following engineering rules are mandatory:

* **Rule 1: Local-First Writes (Zero UI Blocking)**:
  - The UI must never show a blocking spinner waiting for an HTTP response during sales or inventory counts.
  - All writes commit immediately to the local on-device database (SQLite / Outbox) and notify the user with instant confirmation (0ms latency).
* **Rule 2: Client-Generated UUIDv7**:
  - All entities use UUIDv7 primary keys. Mobile and desktop clients generate time-ordered, globally unique IDs offline without asking the server for the next sequence.
* **Rule 3: Outbox Pattern for Guaranteed Delivery**:
  - Offline actions are stored in an `outbox` table with status `PENDING`.
  - A background worker monitors connectivity and flushes pending mutations when a connection is detected.
  - Outbox retries use exponential backoff and idempotency keys to prevent duplicate records.
* **Rule 4: Low-Bandwidth (2G/3G) Delta Sync**:
  - Never sync full tables. The client requests deltas via `GET /sync?since=<last_synced_timestamp>`.
  - Payloads are batched (5–10 items on 2G/3G) and compressed (GZIP/Brotli) to reduce transfer sizes down to tens of kilobytes.

---

## Electronic Billing & Offline Digital Signing Rules

Electronic invoicing (such as Bolivia's SIN SIAT v2) must continue operating legally during internet outages (*Modo Fuera de Línea / Contingencia*):

* **Rule 1: Digital Signing is Local Math**:
  - XML-DSig (RSA-SHA256 + Canonicalization `c14n`) does **not** require an internet connection.
  - Invoices generated offline are signed immediately on the local device using the tenant's digital certificate (`.p12` / `.pfx`) or hardware token.
* **Rule 2: Daily Credential Pre-Caching**:
  - The system pre-caches authorization codes (e.g., CUIS and the daily CUFD, valid for 24 hours) and sequential invoice ranges.
  - The Control Code (CUF) is calculated on-device using the cached CUFD and the offline sale timestamp.
* **Rule 3: Secure Certificate Protection**:
  - Digital certificates must **never** be stored in plain text.
  - On Mobile: Stored in the hardware-backed keystore (Android Keystore / Apple Secure Enclave).
  - On Desktop: Stored using OS-level encrypted storage (Windows DPAPI / Credential Manager).
* **Rule 4: Post-Outage Event & Package Batch Sync**:
  - When connection is restored, the client registers the contingency event (e.g. *Corte de Internet*).
  - The queued signed XML invoices are bundled and sent as a compressed batch package (`recepcionPaqueteFacturas`).

---

## Auth and RBAC

- `POST /api/auth/register` creates a tenant, default roles (`OWNER`, `MANAGER`, `PHARMACIST`, `CASHIER`, `WAREHOUSE`) and the initial owner user.
- `POST /api/auth/login`, `POST /api/auth/google` (Google ID token), `GET /api/auth/me`.
- Permissions catalog lives in `packages/contracts/src/permissions.ts`.
- Web app checks permissions via `useAuthStore().can(...)`.
- Google login: configure `GOOGLE_CLIENT_ID` in `apps/api/.env` and `VITE_GOOGLE_CLIENT_ID` in `apps/web/.env`.

---

## Adding a New Module

1. **Contracts**: Define Zod schemas and permissions in `packages/contracts/src/<module>.ts` and re-export in `index.ts`.
2. **Backend**: Add Nest module in `apps/api/src/modules/<module>/` with `ZodValidationPipe` and `@RequirePermissions`.
3. **Web**: Add feature in `apps/web/src/features/<module>/` (TanStack Query hooks) and pages in `apps/web/src/pages/`.
4. **Desktop Hardware** (if needed): Register Tauri commands in `apps/desktop/src-tauri/src/lib.rs` and invoke from `apps/web/src/lib/platform.ts`.
5. **Mobile** (if needed): Implement offline outbox handlers and screens in `apps/mobile/`.

---

## Next Steps

- Production SQLite adapter bindings (`op-sqlite` for Mobile, `@tauri-apps/plugin-sql` for Desktop).
- Row-Level Security in PostgreSQL and tenant-scoped Prisma query extensions.
- SIN Bolivia full WSDL operations (CUIS, CUFD, Eventos Significativos, Paquetes Masivos).
- Per-tenant encrypted certificate vault for `SignatureService`.
- Native ESC/POS thermal printer driver integration in Tauri `hardware/`.
