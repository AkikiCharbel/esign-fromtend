# Frontend Architecture

## Overview
Standalone Vite + React 18 + TypeScript SPA. Talks to the Laravel backend at `http://localhost:8000/api` via Bearer token auth.

## Auth Flow
1. User visits `/login` → submits email/password
2. `POST /api/auth/login` returns `{ token, user }`
3. zustand `authStore` stores token + user, persists token to localStorage
4. Axios interceptor picks up token automatically on every request
5. On 401: interceptor clears token + redirects to `/login`
6. Protected routes check `authStore.token` — redirect to `/login` if null

## State Management Rules

| Type of state | Where it lives | Why |
|---|---|---|
| API data (templates, submissions, etc.) | React Query | Caching, background refetch, loading/error |
| Auth token + user | Zustand (localStorage) | Persists across page reloads |
| Form data | react-hook-form | Form-specific, validation via zod |
| Template builder fields | Zustand | Complex client-side editing state |
| Everything else | useState | Local UI state |

**Rule: Never put API response data into zustand.**

## PDF Field Positioning

This is the trickiest part of the frontend. Fields must appear at the same position regardless of screen size.

```
Template Builder (saving):
  User drops field at pixel position (dropX, dropY) on a rendered page
  Page rendered at renderedWidth × renderedHeight pixels
  Store as: x = (dropX / renderedWidth) * 100   ← percentage
            y = (dropY / renderedHeight) * 100

Signing Page (rendering):
  Page renders at currentWidth × currentHeight pixels
  Render field at: pixelX = (field.x / 100) * currentWidth
                   pixelY = (field.y / 100) * currentHeight
```

## React Query Conventions
- Query keys: `['templates']`, `['templates', id]`, `['submissions', { status }]`
- Mutations invalidate related queries on success
- Use `suspense: false` — handle loading/error states manually in components
- Set `staleTime: 1000 * 60` (1 min) for rarely-changing data like templates

## Routing Structure
```
App.tsx
├── <AuthGuard> — checks authStore.token, redirects to /login if null
│   ├── /dashboard
│   ├── /templates → TemplateIndex
│   ├── /templates/:id/builder → TemplateBuilder
│   ├── /documents → DocumentIndex
│   ├── /documents/create → DocumentCreate
│   ├── /documents/:id → DocumentShow
│   ├── /submissions → SubmissionIndex
│   └── /submissions/:id → SubmissionShow
└── <PublicRoutes> — no auth check
    ├── /login → Login
    ├── /public/esign/:token → SigningPage
    └── /portal/:token → CustomerPortal
```

## API Layer Convention
Every resource has its own file in `src/api/`:

```typescript
// src/api/templates.ts
import client from './client';
import type { Template, TemplateField } from '../types';

export const getTemplates = () =>
  client.get<Template[]>('/templates').then(r => r.data);

export const getTemplate = (id: number) =>
  client.get<Template>(`/templates/${id}`).then(r => r.data);

export const syncFields = (id: number, fields: TemplateField[]) =>
  client.put(`/templates/${id}/fields/sync`, { fields }).then(r => r.data);
```

Used in components via React Query:
```typescript
const { data: template } = useQuery({
  queryKey: ['templates', id],
  queryFn: () => getTemplate(id),
});
```

## Key Design Decisions

### Why standalone Vite instead of Laravel + Vite together?
Cleaner separation — independent deploys, independent repos, no Laravel asset pipeline coupling. React team can iterate without touching PHP.

### Why React Query instead of plain useEffect?
Caching, background refetch, loading/error states, and request deduplication out of the box. Plain useEffect for data fetching leads to race conditions and waterfall requests.

### Why zustand for auth instead of Context?
Simpler API, no provider wrapping, easy localStorage persistence with a plugin, works outside React tree (in axios interceptors).