## Task Progress: Invoice Generation Critical Bug Fix

### Investigation Results

**Root Cause Identified:**
- The `apiCall` helper sends `Content-Type: application/json` header even for POST requests without a body
- When `generateInvoices()` is called, it does NOT pass `data` to `apiCall`
- But `apiCall` still sets `Content-Type: application/json` in headers
- Fastify receives POST with `Content-Type: application/json` and empty body → throws `Body cannot be empty`
- The error handler catches this and returns HTTP 500 (`INTERNAL_ERROR`)

**Secondary Issues Found:**
1. No validation/assertion checks before invoice creation (null refs, empty data)
2. No transaction wrapping
3. No graceful handling of empty body requests

### Files to Fix:
1. `backend/src/modules/invoices/invoices.generator.ts` - Add validation, transaction support
2. `backend/src/modules/invoices/invoices.routes.ts` - Add proper request/body handling
3. `backend/src/modules/invoices/invoices.service.ts` - Add proper error handling
4. `frontend/e2e/helpers/api.ts` - Fix Content-Type header when no body