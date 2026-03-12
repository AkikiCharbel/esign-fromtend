# DocuSign Clone — React Frontend
> Vite · React 18 · TypeScript · Claude Code Junior Dev Context

---

## 📦 Stack & Versions

| Package | Purpose |
|---------|---------|
| react + react-dom | UI framework |
| react-router-dom | Routing |
| @tanstack/react-query | Server state, caching, loading/error states |
| axios | HTTP client |
| zustand | Client state (auth token, user) |
| react-hook-form + zod + @hookform/resolvers | Forms + validation |
| react-pdf | PDF rendering (PDF.js wrapper) |
| react-signature-canvas | Signature/initials drawing pad |
| react-dnd + react-dnd-html5-backend | Drag-and-drop (template builder) |
| react-dropzone | File upload (attachments, CSV) |

---

## 🌐 API Connection

- Backend runs at: `http://localhost:8000`
- All API calls go to: `http://localhost:8000/api`
- Auth: **Bearer token** in `Authorization` header — never cookies
- Token stored in zustand `authStore` + persisted to `localStorage`
- Axios interceptor attaches token automatically on every request
- Axios interceptor: on 401 → clear token → redirect to `/login`

---

## 🏗️ Architecture

### Routing
```
Public routes (no auth guard):
  /login
  /public/esign/:token     ← signing page
  /portal/:token           ← customer portal

Protected routes (require token in authStore):
  /dashboard
  /templates
  /templates/:id/builder
  /documents
  /documents/create
  /documents/:id
  /submissions
  /submissions/:id
```

### State Management
- **Server state** (API data): React Query — never store API responses in zustand
- **Client state** (auth, UI): zustand
- **Form state**: react-hook-form

### Data Flow
```
Component → useQuery/useMutation (React Query)
         → api/* function
         → axios client (auto-attaches Bearer token)
         → Laravel API
         → API Resource JSON
         → TypeScript interface
```

---

## ✅ Code Conventions

### Always
- TypeScript everywhere — no `any` types, fix the type properly
- One file per component in its own folder if it has sub-components
- Use React Query for ALL server data — never `useEffect` + `useState` for API calls
- Use `react-hook-form` + `zod` for ALL forms — never uncontrolled inputs
- Use `react-router-dom` `<Link>` and `useNavigate` — never `window.location`
- Extract API functions into `src/api/*.ts` files — never `axios.get()` inline in components
- Use percentage-based field positions when rendering PDF fields (0–100% of page dimensions)

### Never
- NEVER use `any` TypeScript type
- NEVER call `axios` directly in a component — go through `src/api/`
- NEVER store server data in zustand — that's React Query's job
- NEVER use `useEffect` + `fetch`/`axios` for data fetching — use `useQuery`
- NEVER expose the raw API token in component props or render output
- NEVER use pixel values for PDF field positions — always percentages

---

## 📁 Directory Structure

```
src/
├── api/
│   ├── client.ts          ← axios instance + interceptors
│   ├── auth.ts
│   ├── templates.ts
│   ├── documents.ts
│   ├── submissions.ts
│   └── public.ts          ← signing page + portal (no auth)
├── components/
│   ├── PdfViewer/         ← reusable PDF renderer with overlay slot
│   ├── SignaturePad/      ← signature/initials drawing component
│   ├── FieldOverlay/      ← renders fields on top of PDF pages
│   └── ui/                ← generic UI (Button, Badge, Input, etc.)
├── pages/
│   ├── auth/
│   │   └── Login.tsx
│   ├── dashboard/
│   │   └── Dashboard.tsx
│   ├── templates/
│   │   ├── TemplateIndex.tsx
│   │   └── TemplateBuilder.tsx   ← most complex page
│   ├── documents/
│   │   ├── DocumentIndex.tsx
│   │   ├── DocumentCreate.tsx
│   │   └── DocumentShow.tsx
│   ├── submissions/
│   │   ├── SubmissionIndex.tsx
│   │   └── SubmissionShow.tsx
│   └── public/
│       ├── SigningPage.tsx        ← unauthenticated
│       └── CustomerPortal.tsx    ← unauthenticated
├── stores/
│   └── authStore.ts       ← zustand: token + user + persist to localStorage
├── hooks/
│   ├── useAuth.ts
│   └── usePdfPageDimensions.ts
└── types/
    └── index.ts           ← all TypeScript interfaces matching API Resources
```

---

## 🔑 Key Components

### PdfViewer
- Renders a PDF page-by-page using `react-pdf`
- Each page has a relative-positioned container
- Exposes `overlayContent: (page: number) => ReactNode` prop
- Used by BOTH the template builder and the signing page

### TemplateBuilder
- Left: draggable field type palette (react-dnd)
- Center: PdfViewer with droppable overlay per page
- Right: field properties panel (label, required, font_size, options)
- State: zustand store for current fields + selected field
- Save: calls `PUT /templates/:id/fields/sync` with all fields

### SigningPage
- Loads submission via `GET /public/esign/:token` (no auth)
- Renders PdfViewer with interactive field inputs overlaid
- Signature/initials: react-signature-canvas pad
- Submit: validates required fields → `POST /public/esign/:token`

### Field Positioning (CRITICAL)
```typescript
// Store as percentage (from template builder):
const xPercent = (dropX / pageWidth) * 100;
const yPercent = (dropY / pageHeight) * 100;

// Render at correct pixel position:
const pixelX = (field.x / 100) * renderedPageWidth;
const pixelY = (field.y / 100) * renderedPageHeight;
```

---

## ⚙️ Common Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` → http://localhost:5173 |
| TypeScript check | `npm run typecheck` |
| Build | `npm run build` |
| Lint | `npm run lint` |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/api/client.ts` | Axios instance, Bearer token interceptor, 401 handler |
| `src/stores/authStore.ts` | Zustand auth store with localStorage persistence |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/components/PdfViewer/` | Reusable PDF renderer |
| `src/pages/templates/TemplateBuilder.tsx` | Visual field editor |
| `src/pages/public/SigningPage.tsx` | Public signing UI |
| `docs/tasks.md` | Task progress tracker |