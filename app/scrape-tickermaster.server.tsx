/* eslint-disable unicorn/prefer-spread,unicorn/no-new-array */
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
        `https://billets.cfmontreal.com/info//showshop.eventInventory3?params=fb654025-eadc-4332-8ce0-8056882c81ce_${matchId}_[object%20Object]`,
        {
          headers,
          body: `{"jsonrpc":"2.0","method":"showshop.eventInventory3","params":["fb654025-eadc-4332-8ce0-8056882c81ce","${matchId}",{"groupByPriceLevel":true,"groupByRestriction":true,"includeKilledSeats":true}],"id":1}`,
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
  const seats: string[] = [
    // eslint-disable-next-line sonarjs/no-duplicate-string
    ...Object.values(
      data.result.primary['Unrestricted-imp']?.seats || {}
    ).flat(),
    ...Object.values(data.result.primary['Temporary-IMP']?.seats || {}).flat(),
  ] as string[];
  const ticketsLeftGA = Object.entries(
    data.result.primary['Unrestricted-imp'].GASeats
    // eslint-disable-next-line unicorn/no-array-reduce
  ).reduce((carry: string[], [section, value]: any) => {
    return [
      ...carry,
      ...new Array(Object.values(value)[0] as number)
        .fill(0)
        .map((_, index) => `${section.replaceAll(' ', '_')}_${index}`),
    ];
  }, []);

  const tickets = [...ticketsLeftGA, ...seats];
  const ticketsFromPreviousScrape = JSON.parse(
    (await client.get(`allSeats:${matchId}`)) || '[]'
  );
  console.log(ticketsFromPreviousScrape.length, tickets.length);

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
    /* const count2 = await Promise.all(
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
    ); */

    // console.log('Tickets released count:', count2.length);
    await prisma.matchStats.create({
      data: {
        ticketsLeft: tickets.length,
        ticketsLeftIn132: ticketsLeftGA.filter((ticket) =>
          ticket.includes('132_Supporters')
        ).length,
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
      await scrapeGame('CFM2221IND');
    } catch (error) {
      console.log('Error occurred during scrape:', error);
    }
  }, 1000 * 60 * 2);
}

export const number = 8;
