// kuhik-core/backend/src/plugins/swagger.ts
// OpenAPI / Swagger documentation plugin
// Serves /docs and /api/docs with interactive API documentation

import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Kuhik Core API',
        description: 'Apartment association management system — API-first property & utility management',
        version: '1.0.0',
        contact: {
          name: 'Kuhik Core',
          email: 'info@kuhik.ee',
        },
      },
      servers: [
        { url: 'http://localhost:4000', description: 'Development' },
        { url: 'https://api.example.com', description: 'Production' },
      ],
      tags: [
        { name: 'Health', description: 'System health checks' },
        { name: 'Auth', description: 'Authentication and user management' },
        { name: 'Organizations', description: 'Organization (KÜ) management' },
        { name: 'Buildings', description: 'Building management' },
        { name: 'Apartments', description: 'Apartment management' },
        { name: 'People', description: 'Resident/contact management' },
        { name: 'ApartmentLinks', description: 'Person-apartment relationships' },
        { name: 'Meters', description: 'Meter management' },
        { name: 'Readings', description: 'Meter readings' },
        { name: 'Costs', description: 'Utility costs' },
        { name: 'Allocation', description: 'Cost allocation engine' },
        { name: 'Invoices', description: 'Invoice generation and management' },
        { name: 'Payments', description: 'Payment tracking' },
        { name: 'Accounting', description: 'Financial reports and double-entry bookkeeping' },
        { name: 'Me', description: 'Self-service resident profile' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from POST /api/v1/auth/login',
          },
        },
        schemas: {
          // ================================================================
          // ERROR
          // ================================================================
          ApiError: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Arvet ei leitud' },
              code: { type: 'string', example: 'NOT_FOUND' },
              errorId: { type: 'string', example: 'a1b2c3d4' },
            },
          },

          // ================================================================
          // AUTH
          // ================================================================
          LoginRequest: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: { type: 'string', example: 'admin@kuhik.local' },
              password: { type: 'string', example: 'admin123' },
            },
          },
          LoginResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'board_member', 'resident'] },
                  tenantId: { type: 'string' },
                },
              },
            },
          },

          // ================================================================
          // ORGANIZATION
          // ================================================================
          Organization: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              registryCode: { type: 'string' },
              address: { type: 'string' },
              contactEmail: { type: 'string' },
              contactPhone: { type: 'string' },
              role: { type: 'string', enum: ['admin', 'board_member', 'resident'] },
              isActive: { type: 'boolean' },
            },
          },
          CreateOrganizationRequest: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              slug: { type: 'string' },
              registryCode: { type: 'string' },
              address: { type: 'string' },
              contactEmail: { type: 'string' },
              contactPhone: { type: 'string' },
            },
          },

          // ================================================================
          // BUILDING
          // ================================================================
          Building: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              tenantId: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string', default: 'apartment_building' },
              address: { type: 'string' },
              isActive: { type: 'boolean' },
            },
          },
          CreateBuildingRequest: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              address: { type: 'string' },
              type: { type: 'string', default: 'apartment_building' },
            },
          },

          // ================================================================
          // APARTMENT
          // ================================================================
          Apartment: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              buildingId: { type: 'string' },
              unitLabel: { type: 'string', description: 'Apartment number/name' },
              floor: { type: 'integer' },
              areaSqm: { type: 'number', description: 'Area in square meters' },
              heatedAreaSqm: { type: 'number' },
              ownershipShare: { type: 'number' },
              occupancy: { type: 'integer', default: 1 },
              isActive: { type: 'boolean' },
            },
          },
          CreateApartmentRequest: {
            type: 'object',
            required: ['unitLabel'],
            properties: {
              unitLabel: { type: 'string' },
              floor: { type: 'integer' },
              areaSqm: { type: 'number' },
              heatedAreaSqm: { type: 'number' },
              occupancy: { type: 'integer', default: 1 },
            },
          },

          // ================================================================
          // PERSON
          // ================================================================
          Person: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              tenantId: { type: 'string' },
              fullName: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              personalCode: { type: 'string' },
              isActive: { type: 'boolean' },
            },
          },
          CreatePersonRequest: {
            type: 'object',
            required: ['fullName'],
            properties: {
              fullName: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              personalCode: { type: 'string' },
              notes: { type: 'string' },
            },
          },

          // ================================================================
          // APARTMENT-PERSON LINK
          // ================================================================
          ApartmentLink: {
            type: 'object',
            required: ['personId', 'relationshipType'],
            properties: {
              personId: { type: 'string' },
              relationshipType: { type: 'string', enum: ['OWNER', 'RESIDENT', 'CONTACT'], description: 'OWNER=omanik, RESIDENT=elanik, CONTACT=kontakt' },
              isPrimary: { type: 'boolean', default: false },
              validFrom: { type: 'string', format: 'date' },
              validTo: { type: 'string', format: 'date' },
            },
          },
          ApartmentPersonRelation: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              apartmentId: { type: 'string' },
              personId: { type: 'string' },
              relationshipType: { type: 'string' },
              isPrimary: { type: 'boolean' },
              person: { $ref: '#/components/schemas/Person' },
            },
          },

          // ================================================================
          // METER
          // ================================================================
          Meter: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              apartmentId: { type: 'string' },
              meterType: { type: 'string', enum: ['water', 'electricity', 'heating', 'gas'] },
              unit: { type: 'string', default: 'm3' },
              serialNumber: { type: 'string' },
              label: { type: 'string' },
              isActive: { type: 'boolean' },
            },
          },
          CreateMeterRequest: {
            type: 'object',
            required: ['meterType'],
            properties: {
              meterType: { type: 'string', enum: ['water', 'electricity', 'heating', 'gas'] },
              unit: { type: 'string', default: 'm3' },
              serialNumber: { type: 'string' },
              label: { type: 'string' },
            },
          },

          // ================================================================
          // METER READING
          // ================================================================
          MeterReading: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              meterId: { type: 'string' },
              value: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
              source: { type: 'string', default: 'manual' },
            },
          },
          CreateReadingRequest: {
            type: 'object',
            required: ['value'],
            properties: {
              value: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
              source: { type: 'string', default: 'manual' },
            },
          },

          // ================================================================
          // UTILITY COST
          // ================================================================
          UtilityCost: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              tenantId: { type: 'string' },
              type: { type: 'string', enum: ['electricity', 'water', 'heating', 'gas', 'other'] },
              periodStart: { type: 'string', format: 'date' },
              periodEnd: { type: 'string', format: 'date' },
              totalAmount: { type: 'number' },
              currency: { type: 'string', default: 'EUR' },
              supplierName: { type: 'string' },
              description: { type: 'string' },
            },
          },
          CreateCostRequest: {
            type: 'object',
            required: ['type', 'periodStart', 'periodEnd', 'totalAmount'],
            properties: {
              type: { type: 'string', enum: ['electricity', 'water', 'heating', 'gas', 'other'] },
              periodStart: { type: 'string', format: 'date' },
              periodEnd: { type: 'string', format: 'date' },
              totalAmount: { type: 'number', description: 'Total cost in EUR' },
              currency: { type: 'string', default: 'EUR' },
              supplierName: { type: 'string' },
              description: { type: 'string' },
            },
          },

          // ================================================================
          // ALLOCATION
          // ================================================================
          RunAllocationRequest: {
            type: 'object',
            required: ['periodStart', 'periodEnd'],
            properties: {
              periodStart: { type: 'string', format: 'date', example: '2026-06-01' },
              periodEnd: { type: 'string', format: 'date', example: '2026-06-30' },
            },
          },
          AllocationRun: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string', enum: ['draft', 'finalized'] },
              totalSourceAmount: { type: 'number' },
              totalAllocatedAmount: { type: 'number' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    apartmentId: { type: 'string' },
                    costType: { type: 'string' },
                    method: { type: 'string' },
                    amount: { type: 'number' },
                    consumptionPct: { type: 'number' },
                    apartment: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        unitLabel: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },

          // ================================================================
          // INVOICE
          // ================================================================
          Invoice: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              invoiceNumber: { type: 'string' },
              apartmentId: { type: 'string' },
              totalAmount: { type: 'number' },
              status: { type: 'string', enum: ['draft', 'issued', 'partially_paid', 'paid'] },
              periodStart: { type: 'string', format: 'date' },
              periodEnd: { type: 'string', format: 'date' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    costType: { type: 'string' },
                    amount: { type: 'number' },
                    source: { type: 'string' },
                  },
                },
              },
              payments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'number' },
                    paidAt: { type: 'string', format: 'date-time' },
                    method: { type: 'string' },
                  },
                },
              },
            },
          },

          // ================================================================
          // PAYMENT
          // ================================================================
          CreatePaymentRequest: {
            type: 'object',
            required: ['amount'],
            properties: {
              amount: { type: 'number', description: 'Payment amount in EUR' },
              method: { type: 'string', enum: ['bank_transfer', 'cash', 'other'], default: 'bank_transfer' },
              reference: { type: 'string' },
            },
          },
          Payment: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              invoiceId: { type: 'string' },
              amount: { type: 'number' },
              paidAt: { type: 'string', format: 'date-time' },
              method: { type: 'string' },
              reference: { type: 'string' },
            },
          },

          // ================================================================
          // ACCOUNTING
          // ================================================================
          TrialBalanceRow: {
            type: 'object',
            properties: {
              accountId: { type: 'string' },
              accountNumber: { type: 'string' },
              accountName: { type: 'string' },
              classCode: { type: 'string' },
              className: { type: 'string' },
              totalDebit: { type: 'number' },
              totalCredit: { type: 'number' },
              balance: { type: 'number' },
            },
          },
          BalanceSheet: {
            type: 'object',
            properties: {
              assets: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  accounts: { type: 'array', items: { type: 'object' } },
                  total: { type: 'number' },
                },
              },
              liabilities: { type: 'object' },
              equity: { type: 'object' },
              totalAssets: { type: 'number' },
              totalLiabilitiesPlusEquity: { type: 'number' },
            },
          },
          IncomeStatement: {
            type: 'object',
            properties: {
              rows: { type: 'array', items: { type: 'object' } },
              totalIncome: { type: 'number' },
              totalExpense: { type: 'number' },
              netIncome: { type: 'number' },
            },
          },
          AccountLedger: {
            type: 'object',
            properties: {
              accountNumber: { type: 'string' },
              accountName: { type: 'string' },
              entries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', format: 'date-time' },
                    referenceType: { type: 'string' },
                    description: { type: 'string' },
                    debitAmount: { type: 'number' },
                    creditAmount: { type: 'number' },
                    runningBalance: { type: 'number' },
                    apartmentLabel: { type: 'string' },
                  },
                },
              },
            },
          },
          ChartAccount: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              accountNumber: { type: 'string' },
              name: { type: 'string' },
              accountClass: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  statementType: { type: 'string' },
                },
              },
              isActive: { type: 'boolean' },
            },
          },
          JournalEntry: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              entryDate: { type: 'string', format: 'date-time' },
              referenceType: { type: 'string' },
              referenceId: { type: 'string' },
              description: { type: 'string' },
              totalDebit: { type: 'number' },
              totalCredit: { type: 'number' },
              lines: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    account: {
                      type: 'object',
                      properties: {
                        accountNumber: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                    debitAmount: { type: 'number' },
                    creditAmount: { type: 'number' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      paths: {
        // ================================================================
        // HEALTH
        // ================================================================
        '/api/health': {
          get: {
            tags: ['Health'],
            summary: 'Health check',
            responses: {
              '200': {
                description: 'System is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        version: { type: 'string', example: '1.0.0' },
                        environment: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        uptime: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        // ================================================================
        // AUTH
        // ================================================================
        '/api/v1/auth/login': {
          post: {
            tags: ['Auth'],
            summary: 'Login with username/email and password',
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
            responses: {
              '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
              '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
            },
          },
        },
        '/api/v1/auth/register': {
          post: {
            tags: ['Auth'],
            summary: 'Register new user',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' },
                      password: { type: 'string' },
                      tenantId: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: { '201': { description: 'User registered' } },
          },
        },

        // ================================================================
        // ORGANIZATIONS
        // ================================================================
        '/api/v1/organizations': {
          get: {
            tags: ['Organizations'],
            summary: 'List user organizations',
            security: [{ bearerAuth: [] }],
            responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Organization' } } } } } },
          },
          post: {
            tags: ['Organizations'],
            summary: 'Create organization',
            security: [{ bearerAuth: [] }],
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrganizationRequest' } } } },
            responses: { '201': { description: 'Created' } },
          },
        },
        '/api/v1/organizations/{id}': {
          get: {
            tags: ['Organizations'],
            summary: 'Get organization by ID',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Organization' } } } } },
          },
          put: {
            tags: ['Organizations'],
            summary: 'Update organization',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Updated' } },
          },
        },

        // ================================================================
        // BUILDINGS
        // ================================================================
        '/api/v1/organizations/{orgId}/buildings': {
          get: {
            tags: ['Buildings'],
            summary: 'List buildings in organization',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Building' } } } } } },
          },
          post: {
            tags: ['Buildings'],
            summary: 'Create building',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBuildingRequest' } } } },
            responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Building' } } } } },
          },
        },
        '/api/v1/buildings/{id}': {
          get: {
            tags: ['Buildings'],
            summary: 'Get building by ID',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Building' } } } } },
          },
          put: {
            tags: ['Buildings'],
            summary: 'Update building',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Updated' } },
          },
        },

        // ================================================================
        // APARTMENTS
        // ================================================================
        '/api/v1/buildings/{buildingId}/apartments': {
          get: {
            tags: ['Apartments'],
            summary: 'List apartments in building',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'buildingId', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Apartment' } } } } } },
          },
          post: {
            tags: ['Apartments'],
            summary: 'Create apartment',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'buildingId', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateApartmentRequest' } } } },
            responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Apartment' } } } } },
          },
        },
        '/api/v1/apartments/{id}': {
          get: {
            tags: ['Apartments'],
            summary: 'Get apartment by ID',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Apartment' } } } } },
          },
          put: {
            tags: ['Apartments'],
            summary: 'Update apartment',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Updated' } },
          },
        },

        // ================================================================
        // PEOPLE
        // ================================================================
        '/api/v1/organizations/{orgId}/people': {
          get: {
            tags: ['People'],
            summary: 'List people in organization',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Person' } } } } } },
          },
          post: {
            tags: ['People'],
            summary: 'Create person',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePersonRequest' } } } },
            responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Person' } } } } },
          },
        },
        '/api/v1/people/{id}': {
          get: {
            tags: ['People'],
            summary: 'Get person with apartment relations',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK' } },
          },
          put: {
            tags: ['People'],
            summary: 'Update person',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Updated' } },
          },
        },

        // ================================================================
        // APARTMENT-PERSON LINKS
        // ================================================================
        '/api/v1/apartments/{aptId}/people': {
          get: {
            tags: ['ApartmentLinks'],
            summary: 'List people linked to apartment',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'aptId', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ApartmentPersonRelation' } } } } } },
          },
          post: {
            tags: ['ApartmentLinks'],
            summary: 'Link person to apartment',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'aptId', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApartmentLink' } } } },
            responses: { '201': { description: 'Linked', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApartmentPersonRelation' } } } } },
          },
        },
        '/api/v1/apartment-people/{id}': {
          put: { tags: ['ApartmentLinks'], summary: 'Update relation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' } } },
          delete: { tags: ['ApartmentLinks'], summary: 'Remove relation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Removed' } } },
        },

        // ================================================================
        // METERS
        // ================================================================
        '/api/v1/apartments/{aptId}/meters': {
          get: { tags: ['Meters'], summary: 'List meters for apartment', security: [{ bearerAuth: [] }], parameters: [{ name: 'aptId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Meter' } } } } } } },
          post: { tags: ['Meters'], summary: 'Create meter', security: [{ bearerAuth: [] }], parameters: [{ name: 'aptId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMeterRequest' } } } }, responses: { '201': { description: 'Created' } } },
        },
        '/api/v1/meters/{id}': {
          get: { tags: ['Meters'], summary: 'Get meter', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
          put: { tags: ['Meters'], summary: 'Update meter', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' } } },
        },

        // ================================================================
        // READINGS
        // ================================================================
        '/api/v1/meters/{meterId}/readings': {
          get: { tags: ['Readings'], summary: 'List readings for meter', security: [{ bearerAuth: [] }], parameters: [{ name: 'meterId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MeterReading' } } } } } } },
          post: { tags: ['Readings'], summary: 'Create reading', security: [{ bearerAuth: [] }], parameters: [{ name: 'meterId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateReadingRequest' } } } }, responses: { '201': { description: 'Created' } } },
        },
        '/api/v1/apartments/{aptId}/readings': {
          get: { tags: ['Readings'], summary: 'List all readings for apartment', security: [{ bearerAuth: [] }], parameters: [{ name: 'aptId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
        },

        // ================================================================
        // COSTS
        // ================================================================
        '/api/v1/organizations/{orgId}/costs': {
          get: { tags: ['Costs'], summary: 'List utility costs', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UtilityCost' } } } } } } },
          post: { tags: ['Costs'], summary: 'Create utility cost', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCostRequest' } } } }, responses: { '201': { description: 'Created' } } },
        },
        '/api/v1/organizations/{orgId}/costs/{id}': {
          get: { tags: ['Costs'], summary: 'Get cost', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
          put: { tags: ['Costs'], summary: 'Update cost', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' } } },
          delete: { tags: ['Costs'], summary: 'Delete cost', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Deleted' } } },
        },

        // ================================================================
        // ALLOCATION
        // ================================================================
        '/api/v1/organizations/{orgId}/allocation/run': {
          post: { tags: ['Allocation'], summary: 'Run cost allocation', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RunAllocationRequest' } } } }, responses: { '200': { description: 'Allocation complete', content: { 'application/json': { schema: { $ref: '#/components/schemas/AllocationRun' } } } } } },
        },
        '/api/v1/organizations/{orgId}/allocation/runs': {
          get: { tags: ['Allocation'], summary: 'List allocation runs', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
        },
        '/api/v1/organizations/{orgId}/allocation/runs/{id}': {
          get: { tags: ['Allocation'], summary: 'Get allocation run with items', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AllocationRun' } } } } } },
        },

        // ================================================================
        // INVOICES
        // ================================================================
        '/api/v1/invoices/generate/{allocationRunId}': {
          post: { tags: ['Invoices'], summary: 'Generate invoices from allocation', security: [{ bearerAuth: [] }], parameters: [{ name: 'allocationRunId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Invoices generated', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } } } } },
        },
        '/api/v1/organizations/{orgId}/invoices': {
          get: { tags: ['Invoices'], summary: 'List invoices for organization', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } } } } },
        },
        '/api/v1/invoices/{id}': {
          get: { tags: ['Invoices'], summary: 'Get invoice detail with items and payments', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } } } },
        },
        '/api/v1/apartments/{aptId}/invoices': {
          get: { tags: ['Invoices'], summary: 'List invoices for apartment', security: [{ bearerAuth: [] }], parameters: [{ name: 'aptId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
        },

        // ================================================================
        // PAYMENTS
        // ================================================================
        '/api/v1/invoices/{invoiceId}/payments': {
          post: { tags: ['Payments'], summary: 'Register payment for invoice', security: [{ bearerAuth: [] }], parameters: [{ name: 'invoiceId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePaymentRequest' } } } }, responses: { '201': { description: 'Payment registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } } } },
          get: { tags: ['Payments'], summary: 'List payments for invoice', security: [{ bearerAuth: [] }], parameters: [{ name: 'invoiceId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Payment' } } } } } } },
        },
        '/api/v1/organizations/{orgId}/payments': {
          get: { tags: ['Payments'], summary: 'List all payments for organization', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
        },

        // ================================================================
        // ACCOUNTING
        // ================================================================
        '/api/v1/organizations/{orgId}/accounting/trial-balance': {
          get: { tags: ['Accounting'], summary: 'Trial balance report', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'periodId', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TrialBalanceRow' } } } } } } },
        },
        '/api/v1/organizations/{orgId}/accounting/balance-sheet': {
          get: { tags: ['Accounting'], summary: 'Balance sheet', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'periodId', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/BalanceSheet' } } } } } },
        },
        '/api/v1/organizations/{orgId}/accounting/income-statement': {
          get: { tags: ['Accounting'], summary: 'Income statement (profit & loss)', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'periodId', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/IncomeStatement' } } } } } },
        },
        '/api/v1/accounting/accounts/{accountId}/ledger': {
          get: { tags: ['Accounting'], summary: 'Account ledger detail', security: [{ bearerAuth: [] }], parameters: [{ name: 'accountId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'periodId', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AccountLedger' } } } } } },
        },
        '/api/v1/organizations/{orgId}/accounting/chart-of-accounts': {
          get: { tags: ['Accounting'], summary: 'Chart of accounts', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ChartAccount' } } } } } } },
        },
        '/api/v1/organizations/{orgId}/accounting/journal-entries': {
          get: { tags: ['Accounting'], summary: 'List journal entries', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'periodId', in: 'query', required: false, schema: { type: 'string' } }, { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/JournalEntry' } } } } } } },
        },

        // ================================================================
        // ME (SELF-SERVICE)
        // ================================================================
        '/api/v1/me/profile': {
          get: { tags: ['Me'], summary: 'Get authenticated user profile + organizations', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
        },
        '/api/v1/me/organizations/{orgId}/apartment': {
          get: { tags: ['Me'], summary: 'Find resident apartment by email/name', security: [{ bearerAuth: [] }], parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}