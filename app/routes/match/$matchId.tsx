import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import colors from 'tailwindcss/colors';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useLoaderData, useNavigate, useParams } from '@remix-run/react';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from '@heroicons/react/20/solid';
import { getTicketSales } from '~/models/ticketSale';
import type { MatchStats, TicketSale } from '@prisma/client';
import {
  eachDayOfInterval,
  format,
  formatDistanceToNow,
  isSameSecond,
  parseISO,
  startOfDay,
  startOfHour,
} from 'date-fns';
import React from 'react';
import { DOTS, usePagination } from '~/hooks/usePagination';
import classNames from 'classnames';
import { groupBy, last, max, round, sortBy } from 'lodash';
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLabel,
  VictoryLine,
  VictoryStack,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { number } from '~/scrape-tickermaster.server';
import { getLatestMatchStats, getMatchStats } from '~/models/matchStats';
import { useMedia } from 'react-use';
import invariant from 'tiny-invariant';

console.log(number);

type LoaderData = {
  ticketSales: TicketSale[];
  latestMatchStats: MatchStats;
  matchStats: MatchStats[];
};

export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.matchId, `params.matchId is required`);

  const [ticketSales, latestMatchStats, matchStats] = await Promise.all([
    getTicketSales(params.matchId),
    getLatestMatchStats(params.matchId),
    getMatchStats(params.matchId),
  ]);
  invariant(matchStats, `Match not found.`);
  invariant(latestMatchStats, `Match not found.`);
  return json<LoaderData>({
    /* ticketSales: ticketSales.filter(
      (ticketSale) =>
        !(
          ticketSale.released &&
          !isSameSecond(ticketSale.createdAt, ticketSale.updatedAt)
        )
    ), */
    ticketSales: ticketSales.filter((ticketSale) => !ticketSale.released),
    matchStats,
    latestMatchStats,
  });
};

export default function Match({ matchId }: { matchId: string }) {
  const navigate = useNavigate();
  const parameters = useParams();
  const isSmall = useMedia('(max-width: 639px)', false);
  const { ticketSales, matchStats, latestMatchStats } =
    useLoaderData() as unknown as LoaderData;
  const [isHour, setIsHour] = React.useState(!isSmall);
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: 'updatedAt',
      desc: true,
    },
  ]);

  React.useEffect(() => {
    if (isSmall) {
      setIsHour(false);
    }
  }, [isSmall]);

  const columns = React.useMemo<ColumnDef<TicketSale>[]>(
    () => [
      {
        header: 'Siège',
        footer: (properties) => properties.column.id,
        accessorKey: 'seat',
        cell: (properties) => {
          return (
            <div>
              <span>{properties.getValue<string>()}</span>
              {properties.row.original.released && (
                <span className={'text-red-700'}> (libéré)</span>
              )}
            </div>
          );
        },
      },
      {
        header: "Heure d'achat",
        footer: (properties) => properties.column.id,
        sortingFn: 'datetime',
        sortDescFirst: true,
        accessorKey: 'updatedAt',
        cell: (properties) => {
          return (
            <div>
              <div className="text-sm">
                {format(
                  parseISO(properties.getValue<string>()),
                  'yyyy-MM-dd kk:mm'
                )}{' '}
                (
                {formatDistanceToNow(parseISO(properties.getValue<string>()), {
                  addSuffix: true,
                })}
                )
              </div>
              <div className="text-xs text-gray-500 sm:hidden">
                Tribune:{' '}
                {properties.row
                  .getAllCells()
                  .find((cell) => cell.id === `${properties.row.id}_section`)
                  ?.getValue<string>()}
              </div>
            </div>
          );
        },
      },
      {
        header: 'Tribune',
        footer: (properties) => properties.column.id,
        accessorKey: 'section',
      },
    ],
    []
  );
  const table = useReactTable({
    data: ticketSales,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const paginationRange = usePagination({
    currentPage: table.getState().pagination.pageIndex,
    totalCount: ticketSales.length,
    siblingCount: 1,
    pageSize: table.getState().pagination.pageSize,
  });
  const { pageSize, pageIndex } = table.getState().pagination;

  const chartData = React.useMemo(() => {
    const ticketSalesByBucket = groupBy(
      ticketSales.map((ticketSale) => ({
        ...ticketSale,
        bucket: (isHour
          ? startOfHour(parseISO(ticketSale.updatedAt as unknown as string))
          : startOfDay(parseISO(ticketSale.updatedAt as unknown as string))
        ).toISOString(),
      })),
      'bucket'
    );

    const matchStatsByBucket = groupBy(
      matchStats.map((matchStat) => ({
        ...matchStat,
        bucket: (isHour
          ? startOfHour(parseISO(matchStat.timestamp as unknown as string))
          : startOfDay(parseISO(matchStat.timestamp as unknown as string))
        ).toISOString(),
      })),
      'bucket'
    );

    return sortBy(
      Object.entries(ticketSalesByBucket).map(([date, ticketSales_]) => {
        return {
          date: parseISO(date),
          ticketsSold: ticketSales_.filter((ticketSale) => !ticketSale.released)
            .length,
          ticketsReleased: ticketSales_.filter(
            (ticketSale) => ticketSale.released
          ).length,
          ticketsLeft:
            19_619 - (last(matchStatsByBucket[date])?.ticketsLeft || 0),
        };
      }),
      'date'
    );
  }, [ticketSales, isHour, matchStats]);
  const stats = [
    {
      name: 'Billets vendus (132)',
      stat: `${718 - latestMatchStats.ticketsLeftIn132} / 718`,
    },
    {
      name: 'Billets vendus (Stade entier)',
      stat: `${(
        19_619 - latestMatchStats.ticketsLeft
      ).toLocaleString()} / 19,619`,
    },
  ];

  const style = isSmall
    ? {
        grid: { stroke: 'grey', strokeWidth: 0.25 },
        tickLabels: { fontSize: 12, padding: 2 },
      }
    : {
        axisLabel: { padding: 30, fontSize: 10 },
        tickLabels: { fontSize: 8, padding: 5 },
        grid: { stroke: 'grey', strokeWidth: 0.25 },
      };

  // find maxima for normalizing data
  const maxBar = max(
    chartData.map((matchStat) => matchStat.ticketsSold)
  ) as number;
  const maxLine = 20_000;

  return (
    <div className="w-full lg:w-auto lg:min-w-[1024px]">
      <div className="max-w-5xl px-4 sm:px-6 lg:px-8">
        <div>
          <h3 className="mt-4 flex items-center text-lg font-medium leading-6 text-gray-900">
            Match du{' '}
            <select
              id="match"
              name="match"
              className="ml-2 mr-4 block rounded-md border-gray-300 py-2 pl-3 pr-4 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              value={parameters.matchId}
              onChange={(event) => {
                navigate(`/match/${event.target.value}`);
              }}
            >
              <option value="CFM2220IND">
                10 Oct. 2022 c. Orlando City SC
              </option>
              <option value="CFM2217IND">1er Oct. 2022 c. D.C. United</option>
              <option value="CFM2216IND">13 Sept. 2022 c. Chicago Fire</option>
            </select>
          </h3>
          <div className="text-orange-600">
            EXPERIMENTAL: Numbers are probably wrong.
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {stats.map((item) => (
              <div
                key={item.name}
                className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6"
              >
                <dt className="truncate text-sm font-medium text-gray-500">
                  {item.name}
                </dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                  {item.stat}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="mt-4 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg bg-white px-2 py-2 shadow sm:p-6 sm:px-4 sm:py-5">
          <div className="sm:text-md flex items-center justify-center truncate text-center text-sm font-medium text-gray-500">
            Nombre de billets vendus par{' '}
            {isSmall ? (
              'jour'
            ) : (
              <select
                id="pageSize"
                name="pageSize"
                className="ml-2 mr-4 block rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                value={isHour ? 'heure' : 'jour'}
                onChange={(e) => {
                  e.target.value === 'jour'
                    ? setIsHour(false)
                    : setIsHour(true);
                }}
              >
                <option>jour</option>
                <option>heure</option>
              </select>
            )}
          </div>
          <VictoryChart
            // domainPadding will add space to each side of VictoryBar to
            // prevent it from overlapping the axis
            width={isSmall ? 300 : 450}
            height={300}
            domainPadding={20}
            containerComponent={
              <VictoryVoronoiContainer
                style={{ strokeWidth: 1 }}
                labelComponent={
                  <VictoryTooltip
                    constrainToVisibleArea
                    cornerRadius={0}
                    flyoutStyle={{
                      fill: colors.gray[200],
                      strokeWidth: 0.5,
                    }}
                    labelComponent={
                      <VictoryLabel
                        style={{
                          strokeWidth: 1,
                        }}
                      />
                    }
                  />
                }
                labels={({ datum }) => {
                  return `${format(
                    datum.date,
                    isHour ? 'dd MMM. kk:mm' : 'dd MMM. yyyy'
                  )}\n ${datum.ticketsSold.toLocaleString()} billets vendus (${datum.ticketsLeft.toLocaleString()} total)`;
                }}
              />
            }
            padding={
              isSmall
                ? { top: 10, right: 30, bottom: 30, left: 40 }
                : { top: 10, right: 40, bottom: 50, left: 50 }
            }
          >
            <VictoryAxis
              {...(isSmall
                ? {}
                : { label: isHour ? "Heure d'achat" : "Date d'achat" })}
              tickFormat={(tick) => {
                return `${format(
                  new Date(tick),
                  isHour ? 'd MMM. kk:mm' : 'd MMM.'
                )}`;
              }}
              tickValues={
                !isHour
                  ? eachDayOfInterval({
                      start: chartData[0].date,
                      end: chartData[chartData.length - 1].date,
                    })
                  : undefined
              }
              // tickValues specifies both the number of ticks and where
              // they are placed on the axis
              style={style}
            />
            <VictoryAxis
              label={!isSmall ? 'Nombre de billets vendus' : undefined}
              dependentAxis
              // Use normalized tickValues (0 - 1)
              tickValues={[0.25, 0.5, 0.75, 1]}
              // Re-scale ticks by multiplying by correct maxima
              tickFormat={(t) => round(t * maxBar! * 1.5).toLocaleString()}
              style={{
                ...style,
                tickLabels: { ...style.tickLabels, fill: 'blue' },
              }}
            />
            {/* <VictoryAxis
              // Use normalized tickValues (0 - 1)
              tickValues={[0.25, 0.5, 0.75, 1]}
              // Re-scale ticks by multiplying by correct maxima
              tickFormat={(t) =>
                isSmall
                  ? new Intl.NumberFormat('en', { notation: 'compact' }).format(
                      t * maxLine!
                    )
                  : (t * maxLine!).toLocaleString()
              }
              dependentAxis
              offsetX={isSmall ? 270 : 410}
              style={{
                ...style,
                tickLabels: {
                  ...style.tickLabels,
                  padding: -5,
                  align: 'start',
                  textAnchor: 'start',
                  fill: 'darkgreen',
                },
              }}
            /> */}
            {/* <VictoryLine
              data={chartData}
              x="date"
              y={(datum) => datum.ticketsLeft / maxLine}
              style={{
                data: {
                  stroke: 'darkgreen',
                  strokeWidth: ({ active }) => (active ? 3 : 2),
                },
              }}
            /> */}
            <VictoryStack>
              {/* <VictoryBar
                barRatio={0.2}
                data={chartData}
                x="date"
                y={(datum) => datum.ticketsReleased / maxBar / 1.5}
                style={{
                  data: {
                    fill: 'red',
                  },
                }}
              /> */}
              <VictoryBar
                barRatio={0.2}
                data={chartData}
                x="date"
                y={(datum) => datum.ticketsSold / maxBar / 1.5}
                style={{
                  data: {
                    fill: 'blue',
                  },
                }}
              />
            </VictoryStack>
          </VictoryChart>
        </div>
      </div>
      <div className="max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header, index) => {
                          return (
                            <th
                              key={header.id}
                              colSpan={header.colSpan}
                              scope="col"
                              className={classNames(
                                'text-left text-sm font-semibold text-gray-900',
                                index === 0
                                  ? 'py-3.5 pl-4 pr-3 sm:pl-6'
                                  : 'px-2 py-3.5',
                                index === 2 ? 'hidden sm:table-cell' : ''
                              )}
                            >
                              <a
                                href="#"
                                role="button"
                                className="group inline-flex cursor-pointer"
                                onKeyDown={header.column.getToggleSortingHandler()}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {(header.column.getIsSorted() as string) ===
                                  'asc' && (
                                  <ChevronUpIcon
                                    className="ml-2 h-5 w-5"
                                    aria-hidden="true"
                                  />
                                )}
                                {(header.column.getIsSorted() as string) ===
                                  'desc' && (
                                  <ChevronDownIcon
                                    className="ml-2 h-5 w-5"
                                    aria-hidden="true"
                                  />
                                )}
                                {!header.column.getIsSorted() && (
                                  <span className="invisible ml-2 flex-none rounded text-gray-400 group-hover:visible">
                                    {{
                                      asc: (
                                        <ChevronUpIcon
                                          className="h-5 w-5"
                                          aria-hidden="true"
                                        />
                                      ),
                                      desc: (
                                        <ChevronDownIcon
                                          className="h-5 w-5"
                                          aria-hidden="true"
                                        />
                                      ),
                                    }[
                                      header.column.getIsSorted() as string
                                    ] ?? (
                                      <ChevronDownIcon
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                      />
                                    )}
                                  </span>
                                )}
                              </a>
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {table.getRowModel().rows.map((row, i) => {
                      return (
                        <tr
                          key={row.id}
                          className={
                            row.original.released ? 'bg-red-50' : undefined
                          }
                        >
                          {row.getVisibleCells().map((cell, index) => (
                            <td
                              className={classNames(
                                'whitespace-nowrap text-sm text-gray-700',
                                index === 0
                                  ? 'py-2 pl-4 pr-3 sm:pl-6'
                                  : 'px-2 py-2',
                                index === 2 ? 'hidden sm:table-cell' : ''
                              )}
                              key={cell.id}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                  <div className="flex flex-col md:flex-1 md:flex-row md:items-center md:justify-between">
                    <div className={'mr-8'}>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {pageSize * pageIndex + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(
                            pageSize * pageIndex + pageSize,
                            ticketSales.length
                          )}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">
                          {ticketSales.length}
                        </span>{' '}
                        results
                      </p>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center">
                      <div className="flex items-center">
                        <label
                          htmlFor="pageSize"
                          className="my-4 mr-2 block text-sm font-medium text-gray-700"
                        >
                          Page size
                        </label>
                        <select
                          id="pageSize"
                          name="pageSize"
                          className="mr-4 block rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                          value={pageSize}
                          onChange={(event) => {
                            table.setPageSize(Number(event.target.value));
                          }}
                        >
                          <option>10</option>
                          <option>25</option>
                          <option>100</option>
                          <option>500</option>
                        </select>
                      </div>
                      <div>
                        <nav
                          className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                          aria-label="Pagination"
                        >
                          <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeftIcon
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </button>
                          {/* Current: "z-10 bg-indigo-50 border-indigo-500 text-indigo-600", Default: "bg-white border-gray-300 text-gray-500 hover:bg-gray-50" */}
                          {paginationRange?.map((pageNumber) => {
                            if (pageNumber === DOTS) {
                              return (
                                <span className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              );
                            }

                            return (
                              <button
                                key={pageNumber}
                                onClick={() =>
                                  table.setPageIndex(pageNumber - 1)
                                }
                                className={classNames(
                                  'relative inline-flex items-center border px-2 py-1 text-sm font-medium focus:z-20 sm:px-4 sm:py-2',
                                  pageNumber ===
                                    table.getState().pagination.pageIndex + 1
                                    ? 'z-10 border-indigo-500 bg-indigo-50 text-indigo-600'
                                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                                )}
                              >
                                {pageNumber}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRightIcon
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
