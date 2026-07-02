"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

const chartFallback = () => <Skeleton className="h-[300px] w-full" />;

export const PerTopicChart = dynamic(
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
        Legend,
      } = rc;
      function PerTopic({ data }: { data: any[] }) {
        return (
          <ResponsiveContainer width="100%" height={300}>
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
                dataKey="topic"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
                stroke="#94a3b8"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                stroke="#94a3b8"
              />
              <Tooltip
                cursor={{ fill: "#94a3b8", fillOpacity: 0.1 }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.3)",
                  background: "rgba(17,23,38,0.95)",
                  color: "#e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend />
              <Bar
                dataKey="total"
                fill="#94a3b8"
                name="Total"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="correct"
                fill="#6366f1"
                name="Correct"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return PerTopic;
    }),
  { ssr: false, loading: chartFallback }
);
