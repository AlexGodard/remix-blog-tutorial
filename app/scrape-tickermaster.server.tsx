import { difference, times } from 'lodash';
import { client } from '~/redis.server';
import { prisma } from '~/db.server';
import retry from 'async-retry';

declare global {
  // eslint-disable-next-line no-var,vars-on-top
  var __scrapingInitiated__: boolean;
}

const headers = {
  accept: 'application/json',
  'accept-language': 'en,fr;q=0.9',
  'content-type': 'application/json-rpc',
  'sec-ch-ua':
    '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  Referer: 'https://billets.cfmontreal.com/cfm/',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const scrapeGame = async (matchId: string) => {
  console.log(`Starting to scrape ticketmaster... ${matchId}`);
  const response = await retry(
    () =>
      fetch(
        `https://billets.cfmontreal.com/info//showshop.eventInventory3?params=c4d6a3d9-96fd-40b4-a549-819993354366_${matchId}_[object%20Object]`,
        {
          headers,
          body: `{"jsonrpc":"2.0","method":"showshop.eventInventory3","params":["c4d6a3d9-96fd-40b4-a549-819993354366","${matchId}",{"groupByPriceLevel":true,"groupByRestriction":true,"includeKilledSeats":true}],"id":1}`,
          method: 'POST',
        }
      ),
    { onRetry: (error) => console.log('Retrying...', error) }
  );
  const data = await response.json();
  if (!data.result) {
    // Game is possibly sold out or over. Do nothing to prevent a crash.
    return;
  }
  const seats: string[] = Object.values(
    // eslint-disable-next-line sonarjs/no-duplicate-string
    data.result.primary['Unrestricted-imp'].seats
  ).flat() as string[];
  // We have to create fake tickets for GA seats
  const ticketsLeft114: string[] = [];
  times(
    data.result.primary['Unrestricted-imp'].GASeats?.['114_supporters']?.['15'],
    (index) => ticketsLeft114.push(`114_Supporters_${index}`)
  );
  const ticketsLeft127: string[] = [];
  times(
    data.result.primary['Unrestricted-imp'].GASeats?.['127_supporters']?.['13'],
    (index) => ticketsLeft127.push(`127_Supporters_${index}`)
  );
  const ticketsLeft131: string[] = [];
  times(
    data.result.primary['Unrestricted-imp'].GASeats?.['131_supporters']?.['14'],
    (index) => ticketsLeft131.push(`131_Supporters_${index}`)
  );
  const ticketsLeftClubTour: string[] = [];
  times(
    data.result.primary['Unrestricted-imp'].GASeats?.['Club de la Tour']?.['7'],
    (index) => ticketsLeftClubTour.push(`ClubTour_${index}`)
  );
  const ticketsLeft132: string[] = [];
  times(
    data.result.primary['Unrestricted-imp'].GASeats?.['132_Supporters']?.['16'],
    (index) => ticketsLeft132.push(`132_Supporters_${index}`)
  );
  const ticketsLeftLeSudOuest: string[] = [];
  times(
    data.result.primary['Unrestricted-imp'].GASeats?.['Le Sud-Ouest']?.['23'],
    (index) => ticketsLeftLeSudOuest.push(`LeSudOuest_${index}`)
  );

  const tickets = [
    ...ticketsLeft114,
    ...ticketsLeft127,
    ...ticketsLeft131,
    ...ticketsLeft132,
    ...ticketsLeftClubTour,
    ...ticketsLeftLeSudOuest,
    ...seats,
  ];
  const ticketsFromPreviousScrape = JSON.parse(
    (await client.get(`allSeats:${matchId}`)) || '[]'
  );
  console.log(ticketsFromPreviousScrape.length, tickets.length, ticketsLeft132);

  if (ticketsFromPreviousScrape.length !== tickets.length) {
    // Tickets were sold or added
    const ticketsSold = difference(ticketsFromPreviousScrape, tickets);
    const ticketsReleased = difference(tickets, ticketsFromPreviousScrape);
    console.log(`Tickets sold ${matchId}:`, ticketsSold);
    console.log(`Tickets released ${matchId}:`, ticketsReleased);

    const count = await Promise.all(
      ticketsSold.map((ticket) =>
        prisma.ticketSale.upsert({
          where: { seat_matchId: { seat: ticket, matchId } },
          update: {
            seat: ticket,
            section: ticket.split('_')[0],
            matchId,
            released: false,
          },
          create: {
            seat: ticket,
            section: ticket.split('_')[0],
            matchId,
            released: false,
          },
        })
      )
    );

    console.log('Tickets sold count:', count.length);
    const count2 = await Promise.all(
      ticketsReleased.map((ticket) =>
        prisma.ticketSale.upsert({
          where: { seat_matchId: { seat: ticket, matchId } },
          update: {
            seat: ticket,
            section: ticket.split('_')[0],
            matchId,
            released: true,
          },
          create: {
            seat: ticket,
            section: ticket.split('_')[0],
            matchId,
            released: true,
          },
        })
      )
    );

    console.log('Tickets released count:', count2.length);
    await prisma.matchStats.create({
      data: {
        ticketsLeft: tickets.length,
        ticketsLeftIn132: ticketsLeft132.length,
        matchId,
      },
    });
  }
  await client.set(`allSeats:${matchId}`, JSON.stringify(tickets));
};

if (!global.__scrapingInitiated__) {
  global.__scrapingInitiated__ = true;
  console.log("Let's goo....");
  setInterval(async () => {
    try {
      await scrapeGame('CFM2220IND');
    } catch (error) {
      console.log('Error occurred during scrape:', error);
    }
  }, 10_000);
}

export const number = 8;
