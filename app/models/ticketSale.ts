import { prisma } from '~/db.server';

export async function getTicketSales(matchId: string) {
  return prisma.ticketSale.findMany({ where: { matchId } });
}

export { type TicketSale } from '@prisma/client';
