// kuhik-core/backend/src/modules/auth/auth.routes.ts
// Auth routes — handles login, register, returns JWT tokens

import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../../index.js';

interface LoginBody {
  username: string;
  password: string;
  tenantId?: string;
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/login
  app.post<{ Body: LoginBody }>('/api/v1/auth/login', async (request, reply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Kasutajanimi ja parool on kohustuslikud',
      });
    }

    try {
      // Find user by email or name
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: username }, { name: username }],
          isActive: true,
        },
        include: {
          tenants: {
            include: { tenant: { select: { id: true, slug: true } } },
          },
        },
      });

      if (!user || !user.password) {
        return reply.status(401).send({
          success: false,
          error: 'Vale kasutajanimi või parool',
        });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return reply.status(401).send({
          success: false,
          error: 'Vale kasutajanimi või parool',
        });
      }

      // Get active tenant
      const activeTenants = user.tenants.filter(t => t.isActive);
      const selectedTenant = activeTenants[0];

      const tokenData = {
        id: user.id,
        email: user.email || '',
        name: user.name || user.email || 'unknown',
        role: selectedTenant?.role || 'resident',
        associationId: selectedTenant?.tenantId || null,
        permissions: [],
      };

      // Sign JWT
      const token = await reply.jwtSign(tokenData, { expiresIn: '24h' });

      return reply.send({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: selectedTenant?.role || 'resident',
          tenantId: selectedTenant?.tenantId || null,
        },
      });
    } catch (err) {
      request.log.error(err, 'Login error');
      return reply.status(500).send({
        success: false,
        error: 'Sisselogimine ebaõnnestus',
      });
    }
  });

  // POST /api/v1/auth/register
  app.post('/api/v1/auth/register', async (request, reply) => {
    const { name, email, password, tenantId } = request.body as any;

    if (!name || !email || !password) {
      return reply.status(400).send({ success: false, error: 'Nimi, e-post ja parool on kohustuslikud' });
    }

    try {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { name }] },
      });

      if (existing) {
        return reply.status(409).send({ success: false, error: 'Selle e-posti või nimega kasutaja on juba olemas' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      if (!tenantId) {
        return reply.status(400).send({ success: false, error: 'Registreerimiseks on vajalik ühistu ID' });
      }

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          tenants: {
            create: {
              tenantId,
              role: 'resident',
            },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      request.log.error(err, 'Register error');
      return reply.status(500).send({ success: false, error: 'Registreerimine ebaõnnestus' });
    }
  });
}