import React from 'react';
import { CHART_COLORS as COLORS } from '../../constants/chartColors';

export default function OwnershipBar({ topOwners }) {
  if (!topOwners?.length) return <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3 }} />;

  const total = topOwners.reduce((s, o) => s + o.ownership_pct, 0);
  const rest = Math.max(0, 1 - total);

  return (
    <div title={topOwners.map((o) => `${o.user_name}: ${(o.ownership_pct * 100).toFixed(1)}%`).join('\n')}>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden' }}>
        {topOwners.map((o, i) => (
          <div
            key={o.user_id}
            style={{ width: `${o.ownership_pct * 100}%`, background: COLORS[i % COLORS.length] }}
          />
        ))}
        {rest > 0.001 && (
          <div style={{ width: `${rest * 100}%`, background: 'var(--surface2)' }} />
        )}
      </div>
    </div>
  );
}
