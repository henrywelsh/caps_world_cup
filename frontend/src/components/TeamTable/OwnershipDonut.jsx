import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CHART_COLORS, CHART_COLOR_MUTED } from '../../constants/chartColors';

export default function OwnershipDonut({ breakdown }) {
  if (!breakdown?.length) return null;

  const top = breakdown.slice(0, 5);
  const topSum = top.reduce((s, o) => s + o.ownership_pct, 0);
  const rest = 1 - topSum;

  const data = [
    ...top.map((o) => ({ name: o.user_name, value: o.ownership_pct })),
    ...(rest > 0.001 ? [{ name: 'Others', value: rest }] : []),
  ];

  return (
    <div>
      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Ownership</div>
      <PieChart width={220} height={220}>
        <Pie
          data={data}
          cx={110}
          cy={110}
          innerRadius={52}
          outerRadius={90}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={i < top.length ? CHART_COLORS[i % CHART_COLORS.length] : CHART_COLOR_MUTED}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => `${(value * 100).toFixed(1)}%`}
          contentStyle={{ background: '#1a1d27', border: '1px solid #2e3250', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#e2e8f0' }}
          itemStyle={{ color: '#94a3b8' }}
        />
      </PieChart>
    </div>
  );
}
