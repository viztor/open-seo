import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { safeHttpUrl } from "@/shared/safe-url";
import type {
  BingGroupBy,
  BingPerformanceRow,
} from "@/server/features/bing/bingPerformance";

const numberFormat = new Intl.NumberFormat("en-US");

export const formatBingCount = (value: number) =>
  numberFormat.format(Math.round(value));
export const formatBingCtr = (value: number) => `${(value * 100).toFixed(1)}%`;
export const formatBingPosition = (value: number | undefined) =>
  value === undefined ? "—" : value.toFixed(1);

const rightAligned = {
  headerClassName: "text-right",
  cellClassName: "text-right tabular-nums",
} as const;

const helper = createColumnHelper<BingPerformanceRow>();

function keyLabel(groupBy: BingGroupBy): string {
  if (groupBy === "date") return "Date";
  if (groupBy === "page") return "Page";
  return "Query";
}

export function buildBingColumns(
  groupBy: BingGroupBy,
): ColumnDef<BingPerformanceRow>[] {
  const isPage = groupBy === "page";
  return [
    helper.accessor("key", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={keyLabel(groupBy)}
          align="left"
        />
      ),
      cell: ({ getValue }) => {
        const value = getValue();
        if (isPage) {
          const safeHref = safeHttpUrl(value);
          return (
            <a
              href={safeHref ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="block max-w-xl truncate text-primary underline-offset-4 hover:underline"
              title={value}
            >
              {value}
            </a>
          );
        }
        return (
          <span className="block max-w-xl truncate font-medium" title={value}>
            {value}
          </span>
        );
      },
    }),
    helper.accessor("clicks", {
      header: ({ column }) => (
        <SortableHeader column={column} label="Clicks" align="right" />
      ),
      cell: ({ getValue }) => formatBingCount(getValue()),
      meta: rightAligned,
    }),
    helper.accessor("impressions", {
      header: ({ column }) => (
        <SortableHeader column={column} label="Impressions" align="right" />
      ),
      cell: ({ getValue }) => formatBingCount(getValue()),
      meta: rightAligned,
    }),
    helper.accessor("ctr", {
      header: ({ column }) => (
        <SortableHeader column={column} label="CTR" align="right" />
      ),
      cell: ({ getValue }) => formatBingCtr(getValue()),
      meta: rightAligned,
    }),
    helper.accessor("position", {
      header: ({ column }) => (
        <SortableHeader column={column} label="Position" align="right" />
      ),
      cell: ({ getValue }) => formatBingPosition(getValue()),
      meta: rightAligned,
    }),
  ];
}
