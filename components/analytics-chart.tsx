"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Satu-satunya bagian analytics yang butuh client JS (Recharts pakai ResizeObserver dkk)
// -> data-nya di-fetch di Server Component (OverviewSection), chart cuma nerima props.
export function AnalyticsChart({ data }: { data: { label: string; views: number; clicks: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="kl-views" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="kl-clicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Area type="monotone" dataKey="views" stroke="#4f46e5" fill="url(#kl-views)" strokeWidth={2} name="Views" />
          <Area type="monotone" dataKey="clicks" stroke="#22c55e" fill="url(#kl-clicks)" strokeWidth={2} name="Clicks" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
