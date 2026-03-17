import { useState, useEffect } from 'react';

export function ProgressBarLoader({ className = '' }: { className?: string }) {
  const width = 20;
  const [pos, setPos] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPos(p => (p + 1) % (width + 1)), 200);
    return () => clearInterval(id);
  }, []);
  const filled = '█'.repeat(pos);
  const empty = '░'.repeat(width - pos);
  return <span className={`font-[800] text-sm whitespace-pre ${className}`}>{filled}{empty}</span>;
}
