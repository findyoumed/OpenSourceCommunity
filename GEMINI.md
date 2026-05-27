# UltimateCommunity (OpenSourceCommunity)

**UltimateCommunity** is an open-source, multi-tenant community platform designed for high-performance deployment on Cloudflare's global edge network. It features a modular monolith architecture with built-in AI-powered social intelligence.

## 🚀 Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 15 (App Router, Edge Runtime), Tailwind CSS, shadcn/ui
- **API**: Hono on Cloudflare Workers
- **Database**: PostgreSQL (Supabase) + Drizzle ORM
- **Auth**: Supabase Auth (JWT-based)
- **Realtime**: Supabase Realtime (WebSockets)
- **Storage**: Supabase Storage
- **Caching**: Upstash Redis (Serverless)
- **Social Pipeline**: Cloudflare Workers (Ingestion & Sentiment Analysis)
- **AI**: Gemini + Claude (Translation), Cloudflare Workers AI (Sentiment)

## 📁 Project Structure

```text
apps/
  web/                  # Next.js frontend (Cloudflare Pages)
  api/                  # Hono API worker (Cloudflare Workers)
  social-pipeline/      # Social intelligence ingestion service
packages/
  db/                   # Shared Drizzle schema & migrations
  core/                 # ModuleRegistry, EventBus, shared types
  config/               # Shared tsconfig, eslint, tailwind configs
docs/                   # PRD, Engineering, and Deployment docs
```

## 🛠️ Development Workflow

### Local Setup
1. **Install Dependencies**: `pnpm install`
2. **Local Infrastructure**: Ensure Docker is running, then `npx supabase start`.
3. **Database Setup**: `pnpm db:push` then `pnpm db:seed`.
4. **Environment Variables**:
   - Copy `apps/web/.env.example` to `apps/web/.env.local`
   - Copy `apps/api/.env.example` to `apps/api/.env`
5. **Run Dev Servers**: `pnpm dev`
   - Frontend: `http://localhost:3001`
   - API: `http://localhost:8787`
   - Supabase Studio: `http://localhost:54323`

### Key Commands
- `pnpm build`: Build the project (primarily filters for `@osc/web`).
- `pnpm lint`: Run ESLint across all packages.
- `pnpm typecheck`: Run TypeScript validation.
- `pnpm test`: Run tests via Vitest/Playwright.
- `pnpm db:generate`: Generate Drizzle migrations.
- `pnpm db:push`: Push schema changes to the database.

## 🧩 Architecture & Conventions

### Multi-Tenancy
- **Strategy**: Shared schema with PostgreSQL **Row-Level Security (RLS)**.
- **Tenant Resolution**: Resolved via `X-Tenant-Slug` header or subdomain in `tenantMiddleware`.
- **Database Access**: Always use the tenant-scoped DB client or ensure `tenant_id` is included in queries.

### Modular Monolith
- Features (Forums, Ideas, Events, etc.) are implemented as **modules**.
- Modules must be registered in `apps/api/src/index.ts` using the `registry`.
- Each module typically has its own directory in `apps/api/src/modules/`.

### Coding Standards
- **Strict Typing**: No `any`. Use Zod for runtime validation and API contracts.
- **API Communication**:
  - **Server-side**: Use `apiGet`/`apiPost` from `@/lib/api`.
  - **Client-side**: Use `apiClientGet`/`apiClientPost` from `@/lib/api-client`.
- **Commits**: Follow **Conventional Commits** (e.g., `feat:`, `fix:`, `chore:`).
- **Modularity**: Keep business logic in `service.ts` files within modules; keep routes thin.

### Documentation
- Refer to `docs/ENGINEERING.md` for deep technical architecture.
- Refer to `docs/PRD.md` for product requirements and module status.
