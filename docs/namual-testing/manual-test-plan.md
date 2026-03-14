# Manual Test Plan — Pre-Production
> Run this top to bottom before submitting. Check every box.
> Two browsers open: Browser A (staff), Browser B (customer/incognito)

---

## ENVIRONMENT SETUP

Before starting:
```bash
# Backend (served via Herd at http://backend.test)
php artisan migrate:fresh --seed
php artisan queue:work &

# Frontend
npm run dev                  # http://localhost:5173
```

Seed creates:
- Tenant: tenant-1 (admin@admin.com / password)
- Staff user: staff@test.com / password
- Pending invitation for: viewer@test.com
- Template: Employment Agreement (active, 2 pages, 5 fields)
- Documents: 2 with signers
- Submissions: 4 (1 sent, 1 signed, 1 expired, 1 sent)
- Second tenant: Acme Corp (admin@acme.com / password)

---

## BLOCK 1 — Registration & Auth

### 1.1 New Workspace Registration
- [ ] Go to http://localhost:5173/register
- [ ] Type workspace name → slug auto-generates (lowercase, dashes)
- [ ] Try submitting with mismatched passwords → see field error
- [ ] Try submitting with password < 8 chars → see field error
- [ ] Fill all fields correctly → submit
- [ ] Redirected to /dashboard
- [ ] Workspace name shown in sidebar
- [ ] Log out

### 1.2 Login
- [ ] Go to /login
- [ ] Login with wrong password → see error message
- [ ] Login as admin@admin.com / password
- [ ] Redirected to /dashboard
- [ ] Token stored in localStorage (DevTools → Application → Local Storage → auth_token)

### 1.3 Session Persistence
- [ ] Hard refresh (Ctrl+R) → still logged in
- [ ] Close tab, reopen → still logged in
- [ ] Log out → token cleared from localStorage → redirected to /login

### 1.4 Protected Routes
- [ ] Log out
- [ ] Try to visit /dashboard directly → redirected to /login
- [ ] Try to visit /templates directly → redirected to /login

---

## BLOCK 2 — Workspace Invitations

### 2.1 Send Invitation
- [ ] Log in as admin
- [ ] Go to /settings/members
- [ ] Click "Invite Member"
- [ ] Enter your personal email + role: Staff → "Send Invite"
- [ ] Success toast appears
- [ ] Pending invitations table shows the new invite

### 2.2 Receive Invitation Email
- [ ] Check inbox for invitation email
- [ ] Email shows: workspace name, inviter name, role badge
- [ ] "Accept Invitation" button present and styled correctly
- [ ] Link format: {FRONTEND_URL}/accept-invite/{token}

### 2.3 Accept Invitation (Browser B — incognito)
- [ ] Open invitation link in incognito
- [ ] Shows workspace name + "Invited by [admin name]" + role badge
- [ ] Email field is read-only (pre-filled from invitation)
- [ ] Fill name + password + confirm → "Join Workspace"
- [ ] Redirected to /dashboard
- [ ] User's role is "staff" (not admin)

### 2.4 Invitation Edge Cases
- [ ] Try opening same invite link again → shows "already accepted" message
- [ ] Back in Browser A (admin): pending invitations table — invite no longer pending
- [ ] Back in admin: try inviting the same email again → error "already a member"
- [ ] Cancel a pending invitation → invitation removed from table

### 2.5 Member Management (as admin)
- [ ] /settings/members shows both users
- [ ] Change staff user's role to Viewer → success toast
- [ ] Cannot change own role (dropdown disabled or "(You)" indicator)
- [ ] Remove staff user → user removed from table
- [ ] Cannot remove self

---

## BLOCK 3 — Workspace Settings

### 3.1 Update Workspace
- [ ] Go to /settings/workspace
- [ ] Change workspace name → Save → success toast → name updates in sidebar
- [ ] Change timezone → Save → success toast
- [ ] Try duplicate slug from another workspace → field error

### 3.2 Logo Upload
- [ ] Upload a PNG logo → logo preview appears in the circle
- [ ] Hard refresh → logo still shows (MediaLibrary persisted it)
- [ ] Click "Remove" → logo removed, initials shown instead

---

## BLOCK 4 — Templates

### 4.1 Create Template
- [ ] Go to /templates
- [ ] Empty state shown with "Create your first template" button
- [ ] Click "New Template"
- [ ] Enter name + description → created → redirected to builder

### 4.2 Template Builder — Upload PDF
- [ ] Empty state shown: dashed upload area
- [ ] Upload a multi-page PDF (2+ pages)
- [ ] PDF renders page by page
- [ ] Page count shown in left panel

### 4.3 Template Builder — Add Fields
- [ ] Drag "Signature" field onto page 1 → field box appears
- [ ] Drag "Text" field → appears at dropped position
- [ ] Drag "Date" field onto page 2 (if multi-page)
- [ ] Click a field → right panel shows properties
- [ ] Change label → field box label updates
- [ ] Toggle "Required" → field shows asterisk
- [ ] For text field: toggle "Multiline" → visible change
- [ ] Add radio field → options tag input appears → add 2 options
- [ ] Drag field to new position → position updates
- [ ] Delete a field → removed from canvas

### 4.4 Save Template
- [ ] Click "Save Template"
- [ ] "Saved" confirmation appears
- [ ] Refresh page → fields reload at correct positions (percentages preserved)
- [ ] Set template status to "Active" → badge updates

---

## BLOCK 5 — Documents

### 5.1 Create Document
- [ ] Go to /documents → "Create Document"
- [ ] Step 1: grid shows active templates → click to select → highlight + checkmark
- [ ] "Next" disabled until template selected
- [ ] Step 2: fill Document Name + custom message + reply-to
- [ ] Toggle "Require Attachments" → instructions field appears
- [ ] Step 3: add signer (name + email + role) → appears in list
- [ ] Try submitting with no signers → "Create Document" disabled
- [ ] Add signer → "Create Document" enabled
- [ ] Drag to reorder signers → sign_order updates
- [ ] Click "Create Document" → redirected to document show page

### 5.2 Document Show
- [ ] Template preview renders (first page of PDF, non-interactive)
- [ ] Signers list shows with roles
- [ ] "Send to..." button present

---

## BLOCK 6 — Sending + Signing Flow

### 6.1 Send Submission
- [ ] On document show page: click "Send to..."
- [ ] Inline panel slides open
- [ ] Fill recipient name + email (use your personal email)
- [ ] Click "Send" → success toast → redirected to /submissions
- [ ] Submission appears with status "sent"

### 6.2 Signing Invitation Email
- [ ] Check inbox — signing invitation email arrives
- [ ] Subject includes document name
- [ ] Custom message shown in quote box
- [ ] Expiry date shown
- [ ] "Sign Document" button works

### 6.3 Public Signing Page (Browser B)
- [ ] Open signing link from email in incognito
- [ ] Light theme (white background) — NOT the dark dashboard
- [ ] Document name shown in top bar
- [ ] Left panel: PDF renders with field overlays at correct positions
- [ ] Right panel: sender info + custom message + progress tracker
- [ ] Progress bar starts at 0/X fields completed

### 6.4 Fill Fields
- [ ] Click signature field → signature modal opens
- [ ] "Draw" tab: draw a signature on the canvas
- [ ] "Clear" button clears canvas
- [ ] "Confirm Signature" → signature image appears on PDF overlay
- [ ] Fill text field → progress updates
- [ ] Fill date field → defaults to today
- [ ] Check checkbox field
- [ ] Select radio option
- [ ] Progress bar reaches 100% when all required fields done

### 6.5 Required Field Validation
- [ ] Clear one required field
- [ ] Click "Complete Signing" → red borders on unfilled required fields
- [ ] Fill all required fields → red borders gone

### 6.6 Attachments (if configured)
- [ ] Attachment upload section visible (if document.has_attachments)
- [ ] Drop a file → appears in uploaded list
- [ ] Remove uploaded file → removed
- [ ] "Complete Signing" blocked if attachment required but not uploaded

### 6.7 Complete Signing
- [ ] All fields filled → "Complete Signing" button active
- [ ] Click → loading state
- [ ] Success screen: green checkmark animation, "Document signed successfully!"
- [ ] "View all your documents" portal link shown
- [ ] Download PDF button present (may take a few seconds for queue to process)

### 6.8 Post-Signing (Browser A — staff)
- [ ] /submissions → submission status changed to "signed"
- [ ] Signing Completed email arrives in staff inbox
  - [ ] Subject includes signer name and document name
  - [ ] Green success banner
  - [ ] Signing details table: name, time, IP
  - [ ] "View Submission" button links to correct submission

### 6.9 Submission Detail
- [ ] Click submission → /submissions/:id
- [ ] Recipient info shows
- [ ] Audit trail: sent → viewed → signed events with timestamps + IPs
- [ ] Field values table shows what customer filled
- [ ] Signature fields show "[Signature captured]" not raw base64
- [ ] "Download Signed PDF" button present
- [ ] Click download → PDF opens, shows filled fields + signature visible

---

## BLOCK 7 — Customer Portal

- [ ] Open signing link, complete signing (or use a signed submission)
- [ ] Visit /portal/{token} (use link from signing success screen)
- [ ] Light theme, no sidebar
- [ ] Shows recipient name + email header
- [ ] Lists the document with correct status badge
- [ ] Signed submission shows "Download" button → downloads PDF
- [ ] Pending submission shows "Sign Now" → goes to signing page

---

## BLOCK 8 — Resend + Reminder

- [ ] Go to a "sent" or "pending" submission
- [ ] Click "Resend" button
- [ ] Success toast "Reminder sent"
- [ ] Check inbox — reminder email arrives
  - [ ] Subject includes "Reminder"
  - [ ] Amber styling (different from original invite)
  - [ ] Days pending shown
  - [ ] Expiry warning shown if expiring soon

---

## BLOCK 9 — Bulk Send

- [ ] Go to /submissions → "Bulk Send"
- [ ] Select a document from the dropdown
- [ ] Download sample CSV template
- [ ] Upload CSV with name,email columns → shows "X recipients found"
- [ ] Send → success "X submissions queued"
- [ ] /submissions list shows new pending submissions
- [ ] All recipient emails receive invitation emails

---

## BLOCK 10 — Dashboard

- [ ] Go to /dashboard
- [ ] Stat cards show correct counts (not all zero after completing Block 6)
  - [ ] Awaiting Signature: reflects current pending count
  - [ ] Pending: reflects current pending count
  - [ ] Signed This Week: >= 1 (if signed today)
  - [ ] Expired: 0 (nothing expired yet)
- [ ] Recent submissions table shows last 10 with correct statuses
- [ ] Click a row → navigates to /submissions/:id

---

## BLOCK 11 — Edge Cases + Security

### 11.1 Tenant Isolation
- [ ] Register a SECOND workspace in Browser B (incognito)
- [ ] Log into second workspace
- [ ] /templates shows 0 templates (not tenant-1's templates)
- [ ] /submissions shows 0 submissions
- [ ] Cannot see tenant-1's data anywhere

### 11.2 Expired Signing Link
- [ ] Open the expired signing link from the seed output
- [ ] Shows "This signing link has expired" page (not a crash)

### 11.3 Invalid Token
- [ ] Visit /public/esign/fake-token-123 → shows "Document not found" page

### 11.4 Already Signed
- [ ] Open signing link of an already-signed submission → shows "Already signed" page with download link

### 11.5 Role Restrictions
- [ ] Log in as staff user (staff@test.com / password)
- [ ] Can view /templates, /documents, /submissions
- [ ] Can create documents and send submissions
- [ ] Go to /settings/workspace → should be blocked (403 or redirect)
- [ ] Go to /settings/members → should be blocked

### 11.6 API Security
- [ ] Try to call a protected API without token:
  ```bash
  curl http://backend.test/api/templates
  ```
  → Should return 401

- [ ] Try to call with an invalid token:
  ```bash
  curl -H "Authorization: Bearer fake_token" http://backend.test/api/templates
  ```
  → Should return 401

---

## BLOCK 12 — Mobile (resize browser to 375px)

- [ ] /login — form usable, no overflow
- [ ] /register — form usable
- [ ] /public/esign/:token — PDF and signing panel stack vertically
- [ ] Signature canvas is large enough to draw on
- [ ] "Complete Signing" button visible without scrolling after filling fields
- [ ] /portal/:token — document list readable
- [ ] Dashboard sidebar collapses, hamburger menu visible
- [ ] Submission index — table scrolls horizontally or collapses

---

## BLOCK 13 — Email Review (open each in real inbox)

- [ ] Signing Invitation: layout, logo area, button, custom message, expiry, link fallback
- [ ] Signing Completed: green banner, details table, View Submission button
- [ ] Signing Reminder: amber badge, days pending, expiry warning
- [ ] Workspace Invitation: workspace name, role badge, Accept button
- [ ] All emails render correctly in Gmail (primary test)
- [ ] All emails render correctly on mobile (Gmail app)
- [ ] No broken images
- [ ] No raw HTML visible
- [ ] Reply-to (if set) works correctly

---

## BLOCK 14 — Production Build Check

```bash
# Frontend
npm run build    # must complete with 0 errors
npm run preview  # test the built version at http://localhost:4173

# Backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# Verify queue works in background
php artisan queue:work --tries=3
```

- [ ] `npm run build` succeeds — 0 TypeScript errors
- [ ] `npm run preview` — app works from built files (not just dev server)
- [ ] `php artisan optimize` — no errors
- [ ] All 3 email preview routes work: /email-preview/signing-invitation etc.
- [ ] `php artisan test --compact` — all tests pass

---

## PRE-SUBMISSION CHECKLIST

```bash
grep -r "console.log" src/          # should return nothing
grep -r "localhost" src/            # should return nothing (only .env has it)
grep -r "dd(" app/                  # should return nothing
grep -r "var_dump" app/             # should return nothing
php artisan test --compact          # all green
vendor/bin/phpstan analyse          # 0 errors
npm run typecheck                   # 0 errors
npm run build                       # 0 errors
```

- [ ] No console.log in frontend
- [ ] No dd() or var_dump in backend
- [ ] No hardcoded localhost in src/
- [ ] All tests pass
- [ ] PHPStan clean
- [ ] TypeScript clean
- [ ] Production build succeeds
- [ ] At least one complete end-to-end flow tested (create template → build → create document → send → sign → download)
- [ ] Signed PDF downloaded and visually correct (fields rendered at right positions, signature visible)

---

## KNOWN THINGS TO SKIP (v2)

These are intentionally not tested because they're scoped to v2:
- Void/cancel a sent submission
- Webhook on completion
- 2FA signing
- Signature certificate PDF
- Delete workspace
