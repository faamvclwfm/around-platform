import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const TG_BOT_USERNAME = 'AROUND_HW_BOT';

// Заміна блоку #detailedStats (streak/badges/графіки/telegram) з personalCabinet.html.
export default function DetailedStats({ streak, badgeList, chartData, userUid }) {
  const [open, setOpen] = useState(false);
  const progressCanvasRef = useRef(null);
  const timeCanvasRef = useRef(null);
  const chartRef = useRef(null);
  const timeChartRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (!progressCanvasRef.current || !timeCanvasRef.current) return;

    const commonOptions = {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } },
        x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } }
      }
    };

    chartRef.current?.destroy();
    timeChartRef.current?.destroy();

    chartRef.current = new Chart(progressCanvasRef.current.getContext('2d'), {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{ data: chartData.scores, borderColor: '#6366f1', backgroundColor: '#6366f122', fill: true, tension: 0.4 }]
      },
      options: commonOptions
    });

    timeChartRef.current = new Chart(timeCanvasRef.current.getContext('2d'), {
      type: 'bar',
      data: { labels: chartData.labels, datasets: [{ data: chartData.minutes, backgroundColor: '#f43f5e', borderRadius: 8 }] },
      options: commonOptions
    });

    return () => {
      chartRef.current?.destroy();
      timeChartRef.current?.destroy();
    };
  }, [open, chartData]);

  return (
    <div className="max-w-7xl mx-auto mt-4 pb-20 w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2 text-stone-400 hover:text-indigo-600 transition-all font-black text-[10px] uppercase tracking-widest"
      >
        <span>Детальна статистика</span>
        <svg
          className={`w-4 h-4 transform transition-transform group-hover:translate-y-1 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">{streak > 0 ? '🔥' : '💀'}</span>
              <span className="text-2xl font-black text-slate-800">{streak}</span>
              <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider mt-1">Ударний режим</span>
            </div>

            <div className="md:col-span-3 bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm">
              <div className="flex flex-wrap gap-3">
                {badgeList.map((b, i) => (
                  <div key={i} className="relative group">
                    <div
                      className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl border transition-all duration-500 ${
                        b.condition
                          ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-white text-indigo-700 shadow-sm opacity-100'
                          : 'border-stone-100 bg-stone-50/50 text-stone-300 opacity-40 grayscale scale-95'
                      }`}
                    >
                      <span className="text-2xl mb-1">{b.icon}</span>
                      <span className="text-[8px] font-black uppercase tracking-tighter text-center px-1 leading-none">{b.label}</span>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-44 p-3 bg-slate-900/95 backdrop-blur-md text-white text-[10px] rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0 z-[100] shadow-2xl border border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">{b.icon}</span>
                        <span className={`font-black uppercase tracking-widest ${b.condition ? 'text-indigo-400' : 'text-stone-400'}`}>
                          {b.label}
                        </span>
                      </div>
                      <p className="text-stone-300 leading-relaxed font-medium">{b.desc}</p>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-900/95" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Динаміка успішності</h4>
              <canvas ref={progressCanvasRef} height="200" />
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Аналіз часу (хв/тест)</h4>
              <canvas ref={timeCanvasRef} height="200" />
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
            <a
              href={`https://t.me/${TG_BOT_USERNAME}?start=${userUid}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-sky-500 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md hover:bg-sky-600 transition-colors w-full sm:w-fit justify-center"
            >
              <span>🤖</span> Підключити сповіщення в Telegram
            </a>
          </div>
        </div>
      )}
    </div>
  );
}