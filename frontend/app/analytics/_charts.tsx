"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

// Tooltip styling that reads on both light and dark themes.
const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.3)",
  background: "rgba(15,23,42,0.92)",
  color: "#f1f5f9",
  fontSize: 12,
};

const chartFallback = () => <Skeleton className="h-[280px] w-full" />;

export const ScoreTrendChart = dynamic(
  () =>
    import("recharts").then((rc) => {
      const {
        LineChart,
        Line,
        XAxis,
        YAxis,
        Tooltip,
        ResponsiveContainer,
        CartesianGrid,
      } = rc;
      function ScoreTrend({ data }: { data: any[] }) {
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#94a3b8"
                strokeOpacity={0.25}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                stroke="#94a3b8"
              />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ stroke: "#94a3b8", strokeOpacity: 0.3 }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#6366f1" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      return ScoreTrend;
    }),
  { ssr: false, loading: chartFallback }
);

export const PerSubjectChart = dynamic(
  () =>
    import("recharts").then((rc) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        Tooltip,
        ResponsiveContainer,
        CartesianGrid,
      } = rc;
      function PerSubject({ data }: { data: any[] }) {
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#94a3b8"
                strokeOpacity={0.25}
              />
              <XAxis
                dataKey="subject"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                stroke="#94a3b8"
              />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ fill: "#94a3b8", fillOpacity: 0.1 }}
              />
              <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return PerSubject;
    }),
  { ssr: false, loading: chartFallback }
);
