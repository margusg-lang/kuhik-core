// kuhik-core/frontend/e2e/helpers/api.ts
// API helpers for financial correctness tests — works with Demo Ühistu data
//
// Unlike ../helpers.ts which creates fresh entities, this module reads
// the existing Demo Ühistu data and operates on it.

import { APIRequestContext, expect } from '@playwright/test';

const BASE_API = process.env.E2E_API_URL || 'http://localhost:4000';
const TEST_USER = { username: 'admin@kuhik.local', password: 'admin123' };

// ================================================================
// AUTH
// ================================================================

export interface AuthContext {
  token: string;
  orgId: string;
  userId: string;
}

export async function apiLogin(request: APIRequestContext): Promise<AuthContext> {
  const res = await request.post(`${BASE_API}/api/v1/auth/login`, { data: TEST_USER });
  const body = await res.json();
  expect(res.ok()).toBeTruthy();
  expect(body.success).toBeTruthy();
  expect(body.token).toBeTruthy();

  const token = body.token;
  const orgId = body.user?.tenantId || body.user?.orgId;
  const userId = body.user?.id;

  if (!orgId) {
    const profileRes = await request.get(`${BASE_API}/api/v1/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profileBody = await profileRes.json();
    expect(profileRes.ok()).toBeTruthy();
    let fetchedOrgId = profileBody.data?.organizations?.[0]?.id;
    // Fallback: try tenants array
    if (!fetchedOrgId && profileBody.data?.tenants?.length > 0) {
      fetchedOrgId = profileBody.data.tenants[0].id;
    }
    return { token, orgId: fetchedOrgId, userId };
  }

  return { token, orgId, userId };
}

// ================================================================
// API CALL WRAPPER
// ================================================================

export async function apiCall(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  token: string,
  data?: Record<string, any>,
  expectSuccess = true,
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

  if (expectSuccess) {
    expect(res.ok(), `API ${method} ${path} failed: ${res.status()} ${JSON.stringify(body)}`).toBeTruthy();
  }

  return { status: res.status(), success: body.success ?? true, body, headers: res.headers() };
}

// ================================================================
// DOMAIN-SPECIFIC FETCHERS (Demo Ühistu)
// ================================================================

/**
 * Fetch all apartments for the org
 */
export async function fetchApartments(request: APIRequestContext, token: string, orgId: string) {
  const res = await apiCall(request, 'GET', `/api/v1/organizations/${orgId}/apartments`, token);
  return res.body.data || res.body.apartments || [];
}

/**
 * Fetch a specific reading by apartment
 */
export async function fetchApartmentMeters(request: APIRequestContext, token: string, apartmentId: string) {
  const res = await apiCall(request, 'GET', `/api/v1/apartments/${apartmentId}/meters`, token);
  return res.body.data || [];
}

/**
 * Fetch meter readings for a specific meter
 */
export async function fetchMeterReadings(request: APIRequestContext, token: string, meterId: string) {
  const res = await apiCall(request, 'GET', `/api/v1/meters/${meterId}/readings`, token);
  return res.body.data || [];
}

/**
 * Fetch utility costs for a period
 */
export async function fetchCosts(
  request: APIRequestContext,
  token: string,
  orgId: string,
  periodStart?: string,
  periodEnd?: string,
) {
  let path = `/api/v1/organizations/${orgId}/costs`;
  if (periodStart && periodEnd) {
    path += `?periodStart=${periodStart}&periodEnd=${periodEnd}`;
  }
  const res = await apiCall(request, 'GET', path, token);
  return res.body.data || [];
}

/**
 * Fetch all allocation runs for the org
 */
export async function fetchAllocationRuns(request: APIRequestContext, token: string, orgId: string) {
  const res = await apiCall(request, 'GET', `/api/v1/organizations/${orgId}/allocation/runs`, token);
  return res.body.data || [];
}

/**
 * Fetch allocation run details (with items)
 */
export async function fetchAllocationRunDetail(
  request: APIRequestContext,
  token: string,
  orgId: string,
  runId: string,
) {
  const res = await apiCall(request, 'GET', `/api/v1/organizations/${orgId}/allocation/runs/${runId}`, token);
  return res.body.data;
}

/**
 * Create a new meter reading
 */
export async function createReading(
  request: APIRequestContext,
  token: string,
  meterId: string,
  value: number,
  timestamp?: string,
) {
  const data: Record<string, any> = { value };
  if (timestamp) data.timestamp = timestamp;
  const res = await apiCall(request, 'POST', `/api/v1/meters/${meterId}/readings`, token, data);
  return res.body.data;
}

/**
 * Create a utility cost
 */
export async function createCost(
  request: APIRequestContext,
  token: string,
  orgId: string,
  costData: {
    type: string;
    periodStart: string;
    periodEnd: string;
    totalAmount: number;
    supplierName?: string;
    description?: string;
  },
) {
  const res = await apiCall(request, 'POST', `/api/v1/organizations/${orgId}/costs`, token, costData);
  return res.body.data;
}

/**
 * Run allocation engine
 */
export async function runAllocation(
  request: APIRequestContext,
  token: string,
  orgId: string,
  periodStart: string,
  periodEnd: string,
) {
  const res = await apiCall(
    request,
    'POST',
    `/api/v1/organizations/${orgId}/allocation/run`,
    token,
    { periodStart, periodEnd },
  );
  return res.body.data;
}

/**
 * Generate invoices from an allocation run
 */
export async function generateInvoices(
  request: APIRequestContext,
  token: string,
  allocationRunId: string,
) {
  const res = await apiCall(
    request,
    'POST',
    `/api/v1/invoices/generate/${allocationRunId}`,
    token,
  );
  return res.body.data;
}

/**
 * Fetch invoice details
 */
export async function fetchInvoice(request: APIRequestContext, token: string, invoiceId: string) {
  const res = await apiCall(request, 'GET', `/api/v1/invoices/${invoiceId}`, token);
  return res.body.data;
}

/**
 * Fetch invoices for an apartment
 */
export async function fetchApartmentInvoices(request: APIRequestContext, token: string, apartmentId: string) {
  const res = await apiCall(request, 'GET', `/api/v1/apartments/${apartmentId}/invoices`, token);
  return res.body.data || [];
}

/**
 * Register a payment for an invoice
 */
export async function addPayment(
  request: APIRequestContext,
  token: string,
  invoiceId: string,
  amount: number,
  method = 'bank_transfer',
) {
  const res = await apiCall(
    request,
    'POST',
    `/api/v1/invoices/${invoiceId}/payments`,
    token,
    { amount, method },
  );
  return res.body.data;
}

/**
 * Fetch payments for an invoice
 */
export async function fetchInvoicePayments(request: APIRequestContext, token: string, invoiceId: string) {
  const res = await apiCall(request, 'GET', `/api/v1/invoices/${invoiceId}/payments`, token);
  return res.body.data || [];
}

/**
 * Attempt to register an overpayment (expects failure)
 */
export async function tryOverpayment(
  request: APIRequestContext,
  token: string,
  invoiceId: string,
  amount: number,
): Promise<{ status: number; body: any }> {
  const res = await apiCall(
    request,
    'POST',
    `/api/v1/invoices/${invoiceId}/payments`,
    token,
    { amount, method: 'bank_transfer' },
    false, // do not assert success
  );
  return { status: res.status, body: res.body };
}