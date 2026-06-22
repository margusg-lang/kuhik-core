// kuhik-core/backend/src/modules/allocation/allocation.engine.ts
// Pure computation: distributes costs across apartments

import { prisma } from '../../index.js';

interface ConsumptionSummary {
  apartmentId: string;
  consumption: number;
}

export async function computeAllocation(tenantId: string, periodStart: Date, periodEnd: Date) {
  // 1. Get all active apartments in the org
  const apartments = await prisma.apartment.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, unitLabel: true },
  });

  // 2. Get utility costs for period
  const costs = await prisma.utilityCost.findMany({
    where: {
      tenantId,
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
    },
  });

  if (apartments.length === 0) return { items: [], summary: 'No apartments found' };
  if (costs.length === 0) return { items: [], summary: 'No costs found for period' };

  const items: Array<{
    apartmentId: string;
    costType: string;
    method: string;
    amount: number;
    consumptionPct: number | null;
  }> = [];

  // Process each cost type
  for (const cost of costs) {
    const costType = cost.type;
    const totalAmount = cost.totalAmount;

    // Determine method: meter-based for water/electricity/heating if readings exist, else flat
    const isMeteredType = ['water', 'electricity', 'heating'].includes(costType);
    let useMeterBased = false;

    if (isMeteredType) {
      // Check if there are readings for this type in the period
      const readingCount = await prisma.apartmentMeterReading.count({
        where: {
          meter: {
            tenantId,
            meterType: costType,
          },
          timestamp: { gte: periodStart, lte: periodEnd },
        },
      });
      useMeterBased = readingCount > 0;
    }

    if (useMeterBased) {
      // Meter-based: proportional to consumption
      const consumptions: ConsumptionSummary[] = await getConsumptionByApartment(tenantId, costType, periodStart, periodEnd);
      const totalConsumption = consumptions.reduce((sum, c) => sum + c.consumption, 0);

      if (totalConsumption > 0) {
        for (const apt of apartments) {
          const aptConsumption = consumptions.find(c => c.apartmentId === apt.id)?.consumption || 0;
          const pct = totalConsumption > 0 ? (aptConsumption / totalConsumption) : 0;
          items.push({
            apartmentId: apt.id,
            costType,
            method: 'meter_based',
            amount: Math.round(totalAmount * pct * 100) / 100,
            consumptionPct: Math.round(pct * 10000) / 100,
          });
        }
      } else {
        // Fallback to flat if no consumption data
        const perApartment = Math.round((totalAmount / apartments.length) * 100) / 100;
        for (const apt of apartments) {
          items.push({ apartmentId: apt.id, costType, method: 'flat', amount: perApartment, consumptionPct: null });
        }
      }
    } else {
      // Flat: equal split
      const perApartment = Math.round((totalAmount / apartments.length) * 100) / 100;
      for (const apt of apartments) {
        items.push({ apartmentId: apt.id, costType, method: 'flat', amount: perApartment, consumptionPct: null });
      }
    }
  }

  return { items, summary: `Allocated ${costs.length} cost types across ${apartments.length} apartments` };
}

async function getConsumptionByApartment(tenantId: string, meterType: string, periodStart: Date, periodEnd: Date): Promise<ConsumptionSummary[]> {
  // Get readings grouped by apartment
  const readings = await prisma.apartmentMeterReading.findMany({
    where: {
      meter: { tenantId, meterType },
      timestamp: { gte: periodStart, lte: periodEnd },
    },
    include: { meter: { select: { apartmentId: true } } },
    orderBy: { timestamp: 'desc' },
  });

  // Per apartment, take the latest reading value
  const latestByApt = new Map<string, number>();
  for (const r of readings) {
    const aptId = r.meter.apartmentId;
    if (!aptId) continue;
    if (!latestByApt.has(aptId)) {
      latestByApt.set(aptId, r.value);
    }
  }

  return Array.from(latestByApt.entries()).map(([apartmentId, consumption]) => ({
    apartmentId,
    consumption,
  }));
}