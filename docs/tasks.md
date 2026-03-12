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
- [ ] `src/components/PdfViewer/PdfViewer.tsx` created
- [ ] Renders PDF page by page using react-pdf `<Page>`
- [ ] Each page: relative-positioned container
- [ ] Each page: absolute-positioned overlay div (same dimensions)
- [ ] Prop: `overlayContent: (page: number) => ReactNode`
- [ ] Loading state shown while PDF loads
- [ ] Error state handled gracefully
- [ ] `npm run typecheck` passes

Notes:
_

---

### TASK 1.7 — Template Builder
**Owner: Claude Code**
- [ ] `src/pages/templates/TemplateBuilder.tsx` created
- [ ] Left sidebar: draggable field type palette (react-dnd)
- [ ] Center: PdfViewer with droppable overlay per page
- [ ] Fields drop correctly → stored as x%/y% percentages
- [ ] Dropped fields render as labeled colored boxes at correct positions
- [ ] Selected field shows resize handles + highlight
- [ ] Right sidebar: field properties panel (label, required, font_size, multiline, options, signer_role)
- [ ] Delete field button works
- [ ] Zustand store manages builder state
- [ ] "Save Template" → PUT /templates/:id/fields/sync
- [ ] Success toast on save
- [ ] `npm run typecheck` passes

Notes:
_

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