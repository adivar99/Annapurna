# CLAUDE.md

This file provides guidance to Claude Code when working with code in this directory.

## Overview

Next.js 16 (React 19, TypeScript, Tailwind CSS v4) frontend for the Annapurna recipe app. Uses the App Router exclusively — no `src/` directory, no pages router. Serves the UI for authentication, recipe browsing/management, chat sessions, and AI helper features.

## Common Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Start dev server on port 3000 (mapped to localhost:3004 in Docker)
npm run build                  # Build production bundle
npm run start                  # Serve the production build
npm run lint                   # Run ESLint checks
```

## Architecture

### Routing (App Router)

All routes live under `app/` as `page.tsx` files:

- `/` — landing page (`app/page.tsx`)
- `/login`, `/register` — authentication pages
- `/home` — recipe feed for logged-in users
- `/add-recipe`, `/advanced-search`, `/saved` — recipe management
- `/chat`, `/chat-sessions` — AI recipe chat and session history

Shared components are in `app/components/` (NavBar, Footer, RecipeCard).

### State & Authentication

- `app/context/AuthContext.tsx` provides the `useAuth()` hook; wraps the app in `app/layout.tsx`.
- The JWT is stored in `localStorage` under `token`/`authToken`/`auth_token` (legacy keys are all read — see `app/services/apiClient.ts`).
- API requests attach the token as an `Authorization: Bearer <token>` header.

### Services Layer

All backend access goes through `app/services/` — pages do not call `fetch` directly against the API:

- `apiClient.ts` — shared fetch wrapper. Base URL is `NEXT_PUBLIC_API_URL` if set; otherwise derived at runtime from the serving hostname (`<protocol>//<hostname>:3001/api/v1`), so the app works on LAN IPs, not just localhost.
- `authService.ts` — auth endpoints; base URL is `NEXT_PUBLIC_AUTH_URL` if set, otherwise the same hostname-derived origin + `/api/auth`.
- `recipeService.ts`, `chatService.ts`, `voiceAgentService.ts`, `speechService.ts` — feature services.
- `spoonacularService.ts` — calls the external Spoonacular API directly (`SPOONACULAR_API_URL`).

Types shared by the services live in `app/models/` (`recipe.ts`, `chat.ts`, `user.ts`) and `app/services/interfaces.ts`.

### Styling

Tailwind CSS v4 via `@tailwindcss/postcss` — there is no `tailwind.config` file; theme customization goes in `app/globals.css`.

## Environment Variables

Set in `.env` (not committed), read at build/runtime:

- `NEXT_PUBLIC_API_URL` — REST API base. When unset, the origin is derived from the browser's hostname with port 3001 (works on localhost and LAN access alike).
- `NEXT_PUBLIC_AUTH_URL` — auth base. Same fallback behavior as above.
- `SPOONACULAR_API_URL` — external recipe API.

## Docker

`frontend/Dockerfile` (one level up) runs the app with `npm run dev` on container port 3000, mapped to host port 3004 by docker-compose. The image is built from a base image defined in `baseimgs/` (see `./annapurna.sh build frontend` at the repo root).
