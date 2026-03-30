import React, { useState, useEffect } from 'react';

function formatDuration(ms) {
  if (ms <= 0) return 'Locked';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export default function CountdownTimer({ endTime, isLocked }) {
  const [remaining, setRemaining] = useState(endTime ? new Date(endTime) - Date.now() : null);

  useEffect(() => {
    if (!endTime || isLocked) return;
    const tick = () => setRemaining(new Date(endTime) - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime, isLocked]);

  if (isLocked) return <span style={{ color: 'var(--red)', fontWeight: 600 }}>🔒 Locked</span>;
  if (!endTime)  return <span className="muted">—</span>;

  const urgent = remaining < 10 * 60 * 1000; // < 10 min
  return (
    <span style={{ color: urgent ? 'var(--yellow)' : 'var(--text)', fontWeight: urgent ? 700 : 400 }}>
      {formatDuration(remaining)}
    </span>
  );
}
