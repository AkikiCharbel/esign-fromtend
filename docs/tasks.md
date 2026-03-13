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
- [x] `src/api/templates.ts` — list, get, uploadPdf functions
- [x] `src/api/documents.ts` — list, create, get, delete, addSigner, removeSigner functions
- [x] `src/pages/documents/DocumentCreate.tsx` — 3-step flow:
    - Step 1: pick template (grid with thumbnail)
    - Step 2: name + message + reply-to
    - Step 3: add/reorder signers
- [x] `src/pages/documents/DocumentShow.tsx` — preview + signer list + Send button
- [x] `npm run typecheck` passes

Notes:
Code reviewed — all checks pass. DocumentCreate uses `useQuery` for templates (filtered to `status === 'active'`), `useMutation` for create + addSigner calls. Step state is local `useState`, not global. Signer drag-to-reorder uses native HTML drag events; `sign_order` derived from array index (`i + 1`) at submit time. DocumentShow uses `useMutation` for `createSubmission`; Send button disabled when `signers.length === 0`. Navigation via `useNavigate`. Forms use `react-hook-form` + `zod`. Review fixes applied: renamed `hasSenders` → `hasSigners` in DocumentShow, updated `Template.pdf_url` type to `string | null` with null guards added in DocumentCreate, TemplateBuilder, and TemplateIndex. No `any` types.

---

### TASK 2.2 — Submissions List + Send
**Owner: Claude Code**
- [x] `src/api/submissions.ts` — list, create, get, resend, bulk functions
- [x] `src/pages/submissions/SubmissionIndex.tsx` — table with status badges, search, filter
- [x] Send flow: button on DocumentShow → POST /submissions → redirect to SubmissionIndex
- [x] Status badge colors: pending=yellow, sent=blue, viewed=indigo, signed=green, expired=red, declined=red
- [x] `npm run typecheck` passes

Notes:
Code reviewed — all checks pass. SubmissionIndex uses debounced search (300ms via `useMemo` ref + `setTimeout`) with `useEffect` cleanup on unmount. Status filter dropdown. Table rows clickable with hover highlight. SubmissionShow displays recipient info, audit log timeline with event icons/colors, field values table (renders `data:image` values as `<img>`), attachments with download links. Download signed PDF uses blob download via axios client (Bearer token in Authorization header, never in URL). Resend button with loading/success/error states. No `any` types, no hooks violations.

---

### TASK 2.3 — Public Signing Page
**Owner: Claude Code**
- [x] `src/api/public.ts` — getSubmission(token), submitSigning(token, fieldValues), uploadAttachment(token, file), deleteAttachment(token, mediaId)
- [x] `src/pages/public/SigningPage.tsx`:
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
- [x] Mobile responsive
- [x] Expiry/already-signed: shows appropriate error page
- [x] `npm run typecheck` passes

Notes:
Code reviewed — all checks pass. SigningPage is fully public (no auth imports). Field positions rendered as CSS percentages (`left: ${field.x}%`). Required field validation runs before `submitSigning` — missing fields get red `2px solid #ef4444` border via `invalidFields` Set. Attachment validation blocks submit when `has_attachments` is true but no files uploaded (`attachmentError` state). Date fields auto-initialize to today via `useEffect`. Error handling: `axios.isAxiosError()` type guard differentiates 410 (expired) from 404 (not found). SignaturePad uses explicit `onAccept` callback (triggered by Accept button) — no auto-close on stroke end, multi-stroke signatures work correctly. `onClear` resets both canvas and parent state. Signature values submitted as base64 PNG (`toDataURL('image/png')`). Mobile: signature modal width `Math.min(400, window.innerWidth - 80)`. No `any` types.

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
- [x] `src/pages/submissions/SubmissionShow.tsx`:
    - All field values filled by customer
    - Audit log timeline (sent → viewed → signed with timestamps + IP)
    - Download signed PDF button
    - Resend email button
    - Attachments section with download links
- [x] `npm run typecheck` passes

Notes:
Implemented as part of Task 2.2. See Task 2.2 notes for review details.

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