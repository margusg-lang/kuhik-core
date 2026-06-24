# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kuhik-flow.spec.ts >> Kuhik Full E2E Lifecycle >> Wave 7a: Register payment for invoice
- Location: e2e\kuhik-flow.spec.ts:230:7

# Error details

```
Error: API POST /api/v1/invoices/cmqrzyech0021uwpo9p96fjr4/payments failed: 400 {"success":false,"error":"Makse summa ületab arve saldot","code":"OVERPAYMENT","errorId":"66d3f49f"}

expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | // kuhik-core/frontend/e2e/helpers.ts
  2  | // Shared helpers for E2E tests — pure API calls, no UI
  3  | 
  4  | import { APIRequestContext, test as base } from '@playwright/test';
  5  | 
  6  | const BASE_API = process.env.E2E_API_URL || 'http://localhost:4000';
  7  | const TEST_USER = { username: 'admin@kuhik.local', password: 'admin123' };
  8  | 
  9  | export interface TestContext {
  10 |   request: APIRequestContext;
  11 |   token: string;
  12 |   orgId: string;
  13 |   buildingId: string;
  14 |   apartmentId: string;
  15 |   personId: string;
  16 |   relationId: string;
  17 |   meterId: string;
  18 |   readingId: string;
  19 |   costId: string;
  20 |   allocationRunId: string;
  21 |   invoiceId: string;
  22 |   paymentId: string;
  23 | }
  24 | 
  25 | /**
  26 |  * Login and get JWT token + org id (first org from user profile)
  27 |  */
  28 | export async function apiLogin(request: APIRequestContext): Promise<{ token: string; orgId: string; userId: string }> {
  29 |   const loginRes = await request.post(`${BASE_API}/api/v1/auth/login`, {
  30 |     data: TEST_USER,
  31 |   });
  32 |   const loginBody = await loginRes.json();
  33 |   expect(loginRes.ok()).toBeTruthy();
  34 |   expect(loginBody.success).toBeTruthy();
  35 |   expect(loginBody.token).toBeTruthy();
  36 | 
  37 |   const token = loginBody.token;
  38 |   const orgId = loginBody.user?.tenantId;
  39 |   const userId = loginBody.user?.id;
  40 | 
  41 |   // If tenantId missing, fetch profile to get org
  42 |   if (!orgId) {
  43 |     const profileRes = await request.get(`${BASE_API}/api/v1/me/profile`, {
  44 |       headers: { Authorization: `Bearer ${token}` },
  45 |     });
  46 |     const profileBody = await profileRes.json();
  47 |     expect(profileRes.ok()).toBeTruthy();
  48 |     const profileOrgId = profileBody.data?.organizations?.[0]?.id;
  49 |     return { token, orgId: profileOrgId, userId };
  50 |   }
  51 | 
  52 |   return { token, orgId, userId };
  53 | }
  54 | 
  55 | /**
  56 |  * Wrapper: calls an API, asserts 2xx + success flag, returns parsed body
  57 |  */
  58 | export async function apiCall(
  59 |   request: APIRequestContext,
  60 |   method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  61 |   path: string,
  62 |   token: string,
  63 |   data?: Record<string, any>,
  64 | ) {
  65 |   const opts: Record<string, any> = {
  66 |     headers: {
  67 |       Authorization: `Bearer ${token}`,
  68 |     },
  69 |   };
  70 |   if (data !== undefined) {
  71 |     opts.headers['Content-Type'] = 'application/json';
  72 |     opts.data = data;
  73 |   }
  74 | 
  75 |   let res;
  76 |   if (method === 'GET') res = await request.get(`${BASE_API}${path}`, opts);
  77 |   else if (method === 'POST') res = await request.post(`${BASE_API}${path}`, opts);
  78 |   else if (method === 'PUT') res = await request.put(`${BASE_API}${path}`, opts);
  79 |   else if (method === 'DELETE') res = await request.delete(`${BASE_API}${path}`, opts);
  80 |   else throw new Error(`Unsupported method: ${method}`);
  81 | 
  82 |   const body = await res.json();
> 83 |   expect(res.ok(), `API ${method} ${path} failed: ${res.status()} ${JSON.stringify(body)}`).toBeTruthy();
     |                                                                                             ^ Error: API POST /api/v1/invoices/cmqrzyech0021uwpo9p96fjr4/payments failed: 400 {"success":false,"error":"Makse summa ületab arve saldot","code":"OVERPAYMENT","errorId":"66d3f49f"}
  84 |   expect(body.success, `API ${method} ${path} returned success=false: ${JSON.stringify(body)}`).toBeTruthy();
  85 | 
  86 |   return body;
  87 | }
  88 | 
  89 | // Re-export expect for use in helpers
  90 | import { expect } from '@playwright/test';
  91 | export { expect };
```