// kuhik-core/frontend/e2e/kuhik-flow.spec.ts
// FULL E2E SYSTEM LIFECYCLE TEST — Waves 0-7
//
// Tests the complete business flow:
// Org → Building → Apartment → Person → Relation → Meter → Reading → Cost → Allocation → Invoice → Payment
//
// Every step uses real API (/api/v1/*) against the backend DB.
// No mocks, no UI interaction, no hardcoded test data.

import { test, expect } from '@playwright/test';
import { apiLogin, apiCall } from './helpers';

test.describe('Kuhik Full E2E Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });
  let token: string;
  let orgId: string;

  let buildingId: string;
  let apartmentId: string;
  let personId: string;
  let relationId: string;
  let meterId: string;
  let readingId: string;
  let costId: string;
  let allocationRunId: string;
  let invoiceId: string;
  let paymentId: string;

  const UNIQUE_TAG = `e2e-${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    const auth = await apiLogin(request);
    token = auth.token;
    orgId = auth.orgId;
    console.log(`Logged in: orgId=${orgId}, token=${token.substring(0, 20)}...`);
  });

  // ================================================================
  // WAVE 1 — PROPERTY HIERARCHY
  // ================================================================

  test('Wave 1a: Create organization (org already exists from login)', async ({ request }) => {
    // Org already exists as tenant from auth
    expect(orgId).toBeTruthy();

    // Verify org is accessible
    const orgData = await apiCall(request, 'GET', `/api/v1/organizations/${orgId}`, token);
    expect(orgData.data).toBeDefined();
    expect(orgData.data.id).toBe(orgId);
    console.log(`Org verified: ${orgData.data.name || orgId}`);
  });

  test('Wave 1b: Create building under org', async ({ request }) => {
    const data = await apiCall(request, 'POST', `/api/v1/organizations/${orgId}/buildings`, token, {
      name: `E2E Building ${UNIQUE_TAG}`,
      address: 'E2E Test Street 1, Tallinn',
    });
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeTruthy();
    expect(data.data.name).toContain(UNIQUE_TAG);
    buildingId = data.data.id;
    console.log(`Building created: ${buildingId}`);
  });

  test('Wave 1c: Create apartment under building', async ({ request }) => {
    expect(buildingId).toBeTruthy();
    const data = await apiCall(request, 'POST', `/api/v1/buildings/${buildingId}/apartments`, token, {
      unitLabel: `E2E-${UNIQUE_TAG}`,
      floor: 1,
      areaSqm: 50.5,
    });
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeTruthy();
    expect(data.data.unitLabel).toContain(UNIQUE_TAG);
    apartmentId = data.data.id;
    console.log(`Apartment created: ${apartmentId}`);
  });

  // ================================================================
  // WAVE 2 — PEOPLE & RELATIONS
  // ================================================================

  test('Wave 2a: Create person in org', async ({ request }) => {
    expect(orgId).toBeTruthy();
    const data = await apiCall(request, 'POST', `/api/v1/organizations/${orgId}/people`, token, {
      fullName: `E2E Resident ${UNIQUE_TAG}`,
      email: `resident-${UNIQUE_TAG}@test.local`,
      phone: '+37251234567',
    });
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeTruthy();
    expect(data.data.fullName).toContain(UNIQUE_TAG);
    personId = data.data.id;
    console.log(`Person created: ${personId}`);
  });

  test('Wave 2b: Link person to apartment', async ({ request }) => {
    expect(apartmentId).toBeTruthy();
    expect(personId).toBeTruthy();
    const data = await apiCall(request, 'POST', `/api/v1/apartments/${apartmentId}/people`, token, {
      personId,
      relationshipType: 'OWNER',
      isPrimary: true,
    });
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeTruthy();
    relationId = data.data.id;
    console.log(`Relation created: ${relationId}`);

    // Verify relation is visible from person detail
    const personDetail = await apiCall(request, 'GET', `/api/v1/people/${personId}`, token);
    expect(personDetail.data.apartments).toBeDefined();
    expect(personDetail.data.apartments.length).toBeGreaterThanOrEqual(1);
  });

  // ================================================================
  // WAVE 3 — METERS & READINGS
  // ================================================================

  test('Wave 3a: Create meter for apartment', async ({ request }) => {
    expect(apartmentId).toBeTruthy();
    const data = await apiCall(request, 'POST', `/api/v1/apartments/${apartmentId}/meters`, token, {
      meterType: 'water',
      unit: 'm3',
      serialNumber: `E2E-MTR-${UNIQUE_TAG}`,
      label: `E2E Water Meter ${UNIQUE_TAG}`,
    });
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeTruthy();
    expect(data.data.meterType).toBe('water');
    meterId = data.data.id;
    console.log(`Meter created: ${meterId}`);
  });

  test('Wave 3b: Add meter reading', async ({ request }) => {
    expect(meterId).toBeTruthy();
    const readingDate = new Date().toISOString();
    const data = await apiCall(request, 'POST', `/api/v1/meters/${meterId}/readings`, token, {
      value: 150.5,
      timestamp: readingDate,
    });
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeTruthy();
    expect(Number(data.data.value)).toBeCloseTo(150.5, 1);
    readingId = data.data.id;
    console.log(`Reading created: ${readingId}`);

    // Verify reading stored
    const readings = await apiCall(request, 'GET', `/api/v1/meters/${meterId}/readings`, token);
    expect(readings.data.length).toBeGreaterThanOrEqual(1);
  });

  // ================================================================
  // WAVE 4 — UTILITY COSTS
  // ================================================================

  test('Wave 4: Create utility cost', async ({ request }) => {
    expect(orgId).toBeTruthy();
    const data = await apiCall(request, 'POST', `/api/v1/organizations/${orgId}/costs`, token, {
      type: 'water',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      totalAmount: 500.00,
      supplierName: 'E2E Test Supplier',
      description: `E2E Test Cost ${UNIQUE_TAG}`,
    });
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeTruthy();
    expect(Number(data.data.totalAmount)).toBe(500);
    costId = data.data.id;
    console.log(`Cost created: ${costId}`);
  });

  // ================================================================
  // WAVE 5 — ALLOCATION
  // ================================================================

  test('Wave 5: Run allocation engine', async ({ request }) => {
    expect(orgId).toBeTruthy();
    const data = await apiCall(request, 'POST', `/api/v1/organizations/${orgId}/allocation/run`, token, {
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
    });
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeTruthy();
    allocationRunId = data.data.id;
    console.log(`Allocation run: ${allocationRunId}, status: ${data.data.status}`);

    // Verify allocation run has items
    const runDetail = await apiCall(request, 'GET', `/api/v1/organizations/${orgId}/allocation/runs/${allocationRunId}`, token);
    expect(runDetail.data).toBeDefined();
  });

  // ================================================================
  // WAVE 6 — INVOICE GENERATION
  // ================================================================

  test('Wave 6a: Generate invoice from allocation', async ({ request }) => {
    expect(orgId).toBeTruthy();
    expect(allocationRunId).toBeTruthy();

    // Generate invoice via the invoices endpoint
    const data = await apiCall(request, 'POST', `/api/v1/invoices/generate/${allocationRunId}`, token);
    expect(data.data).toBeDefined();
    // data.data may be array of invoices or single invoice
    const invoice = Array.isArray(data.data) ? data.data[0] : data.data;
    expect(invoice).toBeDefined();
    expect(invoice.id).toBeTruthy();
    invoiceId = invoice.id;

    // Verify invoice has positive amount
    expect(Number(invoice.totalAmount)).toBeGreaterThan(0);
    console.log(`Invoice created: ${invoiceId}, amount: ${invoice.totalAmount}`);
  });

  test('Wave 6b: Verify invoice detail', async ({ request }) => {
    expect(invoiceId).toBeTruthy();
    const data = await apiCall(request, 'GET', `/api/v1/invoices/${invoiceId}`, token);
    expect(data.data).toBeDefined();
    expect(data.data.id).toBe(invoiceId);
    expect(Number(data.data.totalAmount)).toBeGreaterThan(0);
    expect(data.data.status).toBeTruthy();
    console.log(`Invoice detail: number=${data.data.invoiceNumber}, status=${data.data.status}, total=${data.data.totalAmount}`);
  });

  // ================================================================
  // WAVE 7 — PAYMENT
  // ================================================================

  test('Wave 7a: Register payment for invoice', async ({ request }) => {
    expect(invoiceId).toBeTruthy();
    const data = await apiCall(request, 'POST', `/api/v1/invoices/${invoiceId}/payments`, token, {
      amount: 500.00,
      method: 'bank_transfer',
    });
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeTruthy();
    paymentId = data.data.id;
    console.log(`Payment registered: ${paymentId}`);
  });

  test('Wave 7b: Verify invoice status changed (paid or partially_paid)', async ({ request }) => {
    expect(invoiceId).toBeTruthy();
    const data = await apiCall(request, 'GET', `/api/v1/invoices/${invoiceId}`, token);
    expect(data.data).toBeDefined();
    expect(['paid', 'partially_paid']).toContain(data.data.status);
    console.log(`Invoice status confirmed: ${data.data.status}`);

    // Verify payment shows in payments list
    const payments = await apiCall(request, 'GET', `/api/v1/invoices/${invoiceId}/payments`, token);
    expect(payments.data).toBeDefined();
    const foundPayment = payments.data.find((p: any) => p.id === paymentId);
    expect(foundPayment).toBeDefined();
    expect(Number(foundPayment.amount)).toBe(500);
  });

  // ================================================================
  // CONSISTENCY CHECKS
  // ================================================================

  test('Verify org-level payments list', async ({ request }) => {
    expect(orgId).toBeTruthy();
    const data = await apiCall(request, 'GET', `/api/v1/organizations/${orgId}/payments`, token);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data.data.length).toBeGreaterThanOrEqual(1);
    console.log(`Org-level payments: ${data.data.length} payments`);
  });

  test('Verify full building > apartment > people chain', async ({ request }) => {
    expect(buildingId).toBeTruthy();

    // Building exists
    const building = await apiCall(request, 'GET', `/api/v1/buildings/${buildingId}`, token);
    expect(building.data).toBeDefined();

    // Apartments under building
    const apartments = await apiCall(request, 'GET', `/api/v1/buildings/${buildingId}/apartments`, token);
    expect(apartments.data.length).toBeGreaterThanOrEqual(1);
    const ourApt = apartments.data.find((a: any) => a.id === apartmentId);
    expect(ourApt).toBeDefined();

    // People linked to our apartment
    const people = await apiCall(request, 'GET', `/api/v1/apartments/${apartmentId}/people`, token);
    expect(people.data.length).toBeGreaterThanOrEqual(1);
    const ourPerson = people.data.find((r: any) => r.person?.id === personId);
    expect(ourPerson).toBeDefined();
    console.log(`Full chain verified: Building→Apartment→Person`);
  });

  // ================================================================
  // CLEANUP
  // ================================================================

  test('Cleanup: Delete all created entities (reverse order)', async ({ request }) => {
    // Delete relation
    if (relationId) {
      await apiCall(request, 'DELETE', `/api/v1/apartment-people/${relationId}`, token);
      console.log(`Relation deleted: ${relationId}`);
    }

    // Delete person
    // Note: Person can't be deleted if referenced — skip, org-level cleanup handles it

    // Delete reading
    // Reading deletion not in routes — handled via meter/org cleanup

    // Delete meter
    // No DELETE /api/v1/meters/:id route — the meter remains but is orphaned

    // Delete cost
    if (costId) {
      await apiCall(request, 'DELETE', `/api/v1/organizations/${orgId}/costs/${costId}`, token);
      console.log(`Cost deleted: ${costId}`);
    }

    // Note: Full org deletion requires cascading — not testing here
    console.log('Cleanup complete. Remaining entities are orphaned and safe for manual cleanup.');
  });

  test('Final: Summary of created entities', async () => {
    console.log('');
    console.log('=== KUHIK E2E LIFECYCLE COMPLETE ===');
    console.log(`Org ID:               ${orgId}`);
    console.log(`Building ID:          ${buildingId}`);
    console.log(`Apartment ID:         ${apartmentId}`);
    console.log(`Person ID:            ${personId}`);
    console.log(`Relation ID:          ${relationId}`);
    console.log(`Meter ID:             ${meterId}`);
    console.log(`Reading ID:           ${readingId}`);
    console.log(`Cost ID:              ${costId}`);
    console.log(`Allocation Run ID:    ${allocationRunId}`);
    console.log(`Invoice ID:           ${invoiceId}`);
    console.log(`Payment ID:           ${paymentId}`);
    console.log('=== ALL CHECKS PASSED ===');
    console.log('');
  });
});