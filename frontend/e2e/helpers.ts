// kuhik-core/frontend/e2e/helpers.ts
// Shared helpers for E2E tests — pure API calls, no UI

import { APIRequestContext, test as base } from '@playwright/test';

const BASE_API = process.env.E2E_API_URL || 'http://localhost:4000';
const TEST_USER = { username: 'admin@kuhik.local', password: 'admin123' };

export interface TestContext {
  request: APIRequestContext;
  token: string;
  orgId: string;
  buildingId: string;
  apartmentId: string;
  personId: string;
  relationId: string;
  meterId: string;
  readingId: string;
  costId: string;
  allocationRunId: string;
  invoiceId: string;
  paymentId: string;
}

/**
 * Login and get JWT token + org id (first org from user profile)
 */
export async function apiLogin(request: APIRequestContext): Promise<{ token: string; orgId: string; userId: string }> {
  const loginRes = await request.post(`${BASE_API}/api/v1/auth/login`, {
    data: TEST_USER,
  });
  const loginBody = await loginRes.json();
  expect(loginRes.ok()).toBeTruthy();
  expect(loginBody.success).toBeTruthy();
  expect(loginBody.token).toBeTruthy();

  const token = loginBody.token;
  const orgId = loginBody.user?.tenantId;
  const userId = loginBody.user?.id;

  // If tenantId missing, fetch profile to get org
  if (!orgId) {
    const profileRes = await request.get(`${BASE_API}/api/v1/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profileBody = await profileRes.json();
    expect(profileRes.ok()).toBeTruthy();
    const profileOrgId = profileBody.data?.organizations?.[0]?.id;
    return { token, orgId: profileOrgId, userId };
  }

  return { token, orgId, userId };
}

/**
 * Wrapper: calls an API, asserts 2xx + success flag, returns parsed body
 */
export async function apiCall(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  token: string,
  data?: Record<string, any>,
) {
  const opts: Record<string, any> = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  if (data !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.data = data;
  }

  let res;
  if (method === 'GET') res = await request.get(`${BASE_API}${path}`, opts);
  else if (method === 'POST') res = await request.post(`${BASE_API}${path}`, opts);
  else if (method === 'PUT') res = await request.put(`${BASE_API}${path}`, opts);
  else if (method === 'DELETE') res = await request.delete(`${BASE_API}${path}`, opts);
  else throw new Error(`Unsupported method: ${method}`);

  const body = await res.json();
  expect(res.ok(), `API ${method} ${path} failed: ${res.status()} ${JSON.stringify(body)}`).toBeTruthy();
  expect(body.success, `API ${method} ${path} returned success=false: ${JSON.stringify(body)}`).toBeTruthy();

  return body;
}

// Re-export expect for use in helpers
import { expect } from '@playwright/test';
export { expect };