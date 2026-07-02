"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

const chartFallback = () => <Skeleton className="h-[280px] w-full" />;

export const UsersTrendChart = dynamic(
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
      function UsersTrend({ data }: { data: any[] }) {
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
              <YAxis allowDecimals={false} fontSize={12} stroke="#94a3b8" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      return UsersTrend;
    }),
  { ssr: false, loading: chartFallback }
);

export const RevenueByPlanChart = dynamic(
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
      function RevenueByPlan({ data }: { data: any[] }) {
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="plan" fontSize={12} stroke="#94a3b8" />
              <YAxis fontSize={12} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return RevenueByPlan;
    }),
  { ssr: false, loading: chartFallback }
);

export const RevenueTrendChart = dynamic(
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
      function RevenueTrend({ data }: { data: any[] }) {
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
              <YAxis fontSize={12} stroke="#94a3b8" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      return RevenueTrend;
    }),
  { ssr: false, loading: chartFallback }
);
