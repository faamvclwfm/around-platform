import { useEffect, useState } from 'react';

// Заміна updateProgress() — той самий "рахуючий" анімований conic-gradient.
export default function CircularProgress({ correct, total }) {
  const [displayed, setDisplayed] = useState(0);
  const target = total > 0 ? Math.round((correct * 100) / total) : 0;

  useEffect(() => {
    let start = 0;
    setDisplayed(0);
    if (target <= 0) return;
    const interval = setInterval(() => {
      start++;
      if (start >= target) {
        start = target;
        clearInterval(interval);
      }
      setDisplayed(start);
    }, 15);
    return () => clearInterval(interval);
  }, [target]);

  const color = displayed > 75 ? '#22c55e' : displayed > 50 ? '#f59e0b' : '#ef4444';
  const background =
    total > 0
      ? `conic-gradient(${color} ${displayed * 3.6}deg, #f5f5f4 0deg)`
      : `conic-gradient(#f5f5f4 360deg, #f5f5f4 360deg)`;

  return (
    <div
      className="shadow-xl relative w-40 h-40 rounded-full flex items-center justify-center bg-stone-50 border-8 border-white"
      style={{ background, transition: 'background 0.8s ease' }}
    >
      <div className="absolute w-[130px] h-[130px] rounded-full bg-white" />
      <span className="relative text-3xl font-black text-slate-800">{total > 0 ? `${displayed}%` : '0%'}</span>
    </div>
  );
}