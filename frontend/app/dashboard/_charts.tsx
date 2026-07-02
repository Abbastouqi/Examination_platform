"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

function ChartTooltipStyle() {
  return {
    contentStyle: {
      borderRadius: 12,
      border: "1px solid rgba(148,163,184,0.25)",
      background: "rgba(17,23,38,0.95)",
      color: "#e2e8f0",
      fontSize: 12,
      boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
    },
    labelStyle: { color: "#94a3b8" },
    cursor: { fill: "rgba(148,163,184,0.08)" },
  };
}

const chartFallback = () => <Skeleton className="h-full w-full" />;

export const ScoreTrendChart = dynamic(
  () =>
    import("recharts").then((rc) => {
      const {
        LineChart,
        Line,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = rc;
      function ScoreTrend({ data }: { data: any[] }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#94a3b8"
                strokeOpacity={0.18}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip {...ChartTooltipStyle()} />
              <Line
                type="monotone"
                dataKey="score"
                name="Score"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
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

export const SubjectChart = dynamic(
  () =>
    import("recharts").then((rc) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = rc;
      function SubjectPerf({ data }: { data: any[] }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#94a3b8"
                strokeOpacity={0.18}
                vertical={false}
              />
              <XAxis
                dataKey="subject"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip {...ChartTooltipStyle()} />
              <Bar
                dataKey="score"
                name="Accuracy %"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return SubjectPerf;
    }),
  { ssr: false, loading: chartFallback }
);
