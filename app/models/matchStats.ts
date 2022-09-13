import { prisma } from '~/db.server';

export async function getMatchStats(matchId: string) {
  return prisma.matchStats.findFirst({
    where: { matchId },
    orderBy: { timestamp: 'desc' },
  });
}

export { type TicketSale } from '@prisma/client';
