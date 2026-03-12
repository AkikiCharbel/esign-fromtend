# Frontend Task Tracker

> Claude Code: Update this file after completing each task. Change `[ ]` to `[x]` and add any notes.
> Backend API spec is in: `../docusign-clone/docs/api.yaml`

---

## DAY 1 — Foundation + Template Builder

### TASK 1.5 — React Project Setup
**Owner: Developer (manual)**
- [ ] `npm create vite@latest docusign-frontend -- --template react-ts`
- [ ] Install all npm packages (see CLAUDE.md package list)
- [ ] `npm run dev` starts on http://localhost:5173

**Then Claude Code:**
- [x] `src/api/client.ts` — axios instance with Bearer token interceptor + 401 → logout redirect
- [x] `src/stores/authStore.ts` — zustand store: token + user, persisted to localStorage
- [x] `src/types/index.ts` — TypeScript interfaces for all models (match API Resources)
- [x] `src/api/auth.ts` — login(), logout(), me() functions
- [x] Folder structure created (api, components, pages, stores, hooks, types)
- [x] `App.tsx` with react-router-dom: protected routes + public routes
- [x] `pages/auth/Login.tsx` — form that calls login(), stores token
- [x] `npm run typecheck` passes with no errors

Notes:
Code reviewed — all checks pass. Auth store uses separate localStorage keys (`auth_token` for raw token, `auth-storage` for zustand persist). 401 interceptor calls `useAuthStore.getState().logout()` to clear both zustand and localStorage. No `any` types, no `window.location` usage, all API calls go through `src/api/`.

---

### TASK 1.6 — PDF Viewer Component
**Owner: Claude Code**
- [x] `src/components/PdfViewer/PdfViewer.tsx` created
- [x] Renders PDF page by page using react-pdf `<Page>`
- [x] Each page: relative-positioned container
- [x] Each page: absolute-positioned overlay div (same dimensions)
- [x] Prop: `overlayContent: (page: number) => ReactNode`
- [x] Loading state shown while PDF loads
- [x] Error state handled gracefully
- [x] `npm run typecheck` passes

Notes:
Code reviewed — all checks pass. pdfjs workerSrc uses `new URL(..., import.meta.url)` (no CDN). Overlay container uses `pointerEvents: none` so only individual field children intercept clicks. `PageDimensions` interface exposes `originalWidth`/`originalHeight` alongside rendered dimensions to support percentage-based field positioning. `overlayContent` prop is optional. No `any` types.

---

### TASK 1.7 — Template Builder
**Owner: Claude Code**
- [x] `src/pages/templates/TemplateBuilder.tsx` created
- [x] Left sidebar: draggable field type palette (react-dnd)
- [x] Center: PdfViewer with droppable overlay per page
- [x] Fields drop correctly → stored as x%/y% percentages
- [x] Dropped fields render as labeled colored boxes at correct positions
- [x] Selected field shows resize handles + highlight
- [x] Right sidebar: field properties panel (label, required, font_size, multiline, options, signer_role)
- [x] Delete field button works
- [x] Zustand store manages builder state
- [x] "Save Template" → PUT /templates/:id/fields/sync
- [x] Success toast on save
- [x] `npm run typecheck` passes

Notes:
Code reviewed — all checks pass. `builderStore.ts` uses `BuilderField` type with string IDs (temp UUIDs via `crypto.randomUUID()` before save, server IDs after). Drop positions calculated as `(dropX / rect.width) * 100`, rendered with `left: ${field.x}%`. Field move uses react-dnd `useDrag`/`useDrop` (type `FIELD_MOVE`) — supports cross-page moves. `useDrop` accepts both `FIELD` (new from palette) and `FIELD_MOVE` (reposition existing). Save calls `syncFields` (PUT) and `onSuccess` replaces temp IDs with server-returned IDs via `setFields()`. `useEffect` depends on `template?.id` with a `fieldsLoaded` ref guard to prevent infinite re-render. `syncFields` return typed as `{ fields: TemplateField[] }`. 8-handle resize works in percentages. Delete deselects in both store (`removeField`) and UI. No `any` types.

---

## DAY 2 — Documents + Signing Flow

### TASK 2.1 — Document Creation UI
**Owner: Claude Code**
- [ ] `src/api/templates.ts` — list, get, uploadPdf functions
- [ ] `src/api/documents.ts` — list, create, get, delete, addSigner, removeSigner functions
- [ ] `src/pages/documents/DocumentCreate.tsx` — 3-step flow:
    - Step 1: pick template (grid with thumbnail)
    - Step 2: name + message + reply-to
    - Step 3: add/reorder signers
- [ ] `src/pages/documents/DocumentShow.tsx` — preview + signer list + Send button
- [ ] `npm run typecheck` passes

Notes:
_

---

### TASK 2.2 — Submissions List + Send
**Owner: Claude Code**
- [ ] `src/api/submissions.ts` — list, create, get, resend, bulk functions
- [ ] `src/pages/submissions/SubmissionIndex.tsx` — table with status badges, search, filter
- [ ] Send flow: button on DocumentShow → POST /submissions → redirect to SubmissionIndex
- [ ] Status badge colors: draft=gray, sent=blue, pending=yellow, questions=orange, signed=green
- [ ] `npm run typecheck` passes

Notes:
_

---

### TASK 2.3 — Public Signing Page
**Owner: Claude Code**
- [ ] `src/api/public.ts` — getSubmission(token), submitSigning(token, fieldValues), uploadAttachment(token, file), deleteAttachment(token, mediaId)
- [ ] `src/pages/public/SigningPage.tsx`:
    - Loads submission by token (no auth)
    - PdfViewer with interactive field inputs overlaid at correct positions
    - signature/initials: react-signature-canvas pad
    - text: input / textarea
    - date: date input (default today)
    - checkbox: checkbox
    - radio: radio group
    - dropdown: select
    - Required fields highlighted red if unfilled on submit attempt
    - Attachment upload section (if document.has_attachments)
    - "Complete Signing" button → POST → success page with download link
- [ ] Mobile responsive
- [ ] Expiry/already-signed: shows appropriate error page
- [ ] `npm run typecheck` passes

Notes:
_

---

### TASK 2.4 — Customer Portal
**Owner: Claude Code**
- [ ] `src/pages/public/CustomerPortal.tsx`:
    - Loads submissions by token (no auth)
    - Lists: document name, status badge, sent date
    - "Sign Now" link for pending
    - "Download" link for signed
- [ ] `npm run typecheck` passes

Notes:
_

---

### TASK 2.5 — Staff Submission Views
**Owner: Claude Code**
- [ ] `src/pages/submissions/SubmissionShow.tsx`:
    - All field values filled by customer
    - Audit log timeline (sent → viewed → signed with timestamps + IP)
    - Download signed PDF button
    - Resend email button
    - Attachments section with download links
- [ ] `npm run typecheck` passes

Notes:
_

---

### TASK 2.6 — Dashboard
**Owner: Claude Code**
- [ ] `src/pages/dashboard/Dashboard.tsx`:
    - 4 stat cards: Total sent, Pending, Signed this week, Expired
    - Recent submissions table (last 10)
- [ ] `npm run typecheck` passes

Notes:
_

---

## ✅ Supervisor Checklist (run after each task)

```bash
npm run typecheck     # No TypeScript errors
npm run build         # Build succeeds
```

**Things to manually verify:**
- No `any` types introduced
- No inline `axios.get()` in components — all through `src/api/`
- No server data stored in zustand
- PDF field positions using percentages, not pixels
- Public pages have no auth guard
- Mobile layout works on signing page (test at 375px width)