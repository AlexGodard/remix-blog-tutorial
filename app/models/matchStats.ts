import { prisma } from '~/db.server';

export async function getLatestMatchStats(matchId: string) {
  return prisma.matchStats.findFirst({
    where: { matchId },
    orderBy: { timestamp: 'desc' },
  });
}

export async function getMatchStats(matchId: string) {
  return prisma.matchStats.findMany({
    where: { matchId },
  });
}

export { type TicketSale } from '@prisma/client';
