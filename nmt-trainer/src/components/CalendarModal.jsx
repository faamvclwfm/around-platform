import React, { useState } from 'react';

const CALENDAR_COLORS = {
  scheduled: 'bg-[#AF1F1F] text-white shadow-md shadow-[#AF1F1F]/20 font-bold',
  conducted: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold',
  rescheduled: 'bg-amber-400 text-slate-900 shadow-md shadow-amber-400/20 font-extrabold',
  cancelled: 'bg-stone-100 text-stone-300 line-through border border-dashed border-stone-200',
  milestone: 'bg-slate-700 text-white shadow-md shadow-slate-900/30 font-black',
  none: 'bg-stone-50/40 text-slate-600 hover:bg-stone-100 border border-stone-100/80'
};

const MONTHS_UA = ["Січня", "Лютого", "Березня", "Квітня", "Травня", "Червня", "Липня", "Серпня", "Вересня", "Жовтня", "Листопада", "Грудня"];
const MONTH_NAMES_HEADER = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];

export default function CalendarModal({ schedule, onClose, onDayClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const shift = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const calendarCells = [];

  for (let i = shift - 1; i >= 0; i--) {
    calendarCells.push({
      dayNum: prevMonthTotalDays - i,
      isCurrentMonth: false,
      dateStr: ''
    });
  }

  for (let d = 1; d <= totalDays; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    calendarCells.push({
      dayNum: d,
      isCurrentMonth: true,
      dateStr
    });
  }

  const gridRows = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    gridRows.push(calendarCells.slice(i, i + 7));
  }

  const changeMonth = (delta) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const getDayStatus = (dateStr) => {
    if (!dateStr || !schedule) return 'none';
    if (schedule.lessons?.[dateStr]) return schedule.lessons[dateStr].status || 'scheduled';
    if (schedule.milestones?.[dateStr]) return 'milestone';
    if (schedule.individualLessons) {
      const ind = schedule.individualLessons.find(l => l.date === dateStr);
      if (ind) return ind.status || 'scheduled';
    }
    return 'none';
  };

  const handleCellClick = (cell) => {
    if (!cell.isCurrentMonth || !cell.dateStr) return;
    
    let dayData = [];
    if (schedule?.lessons?.[cell.dateStr]) {
      dayData.push({ ...schedule.lessons[cell.dateStr], type: 'group' });
    }
    if (schedule?.milestones?.[cell.dateStr]) {
      dayData.push({ ...schedule.milestones[cell.dateStr], type: 'milestone', status: 'milestone' });
    }
    if (schedule?.individualLessons) {
      const matched = schedule.individualLessons.filter(l => l.date === cell.dateStr);
      matched.forEach(m => dayData.push({ ...m, type: 'individual' }));
    }

    onDayClick(cell.dateStr, dayData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">Календар занять</h3>
            <p className="text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">Твій розклад та контроль дедлайнів</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-stone-100 rounded-full text-stone-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold text-sm">✕</button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between bg-stone-50 px-4 py-2 rounded-2xl border border-stone-100 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl border border-stone-200 text-slate-700 hover:bg-stone-100 font-bold transition-all text-sm">←</button>
            <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
              {MONTH_NAMES_HEADER[month]} {year}
            </span>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl border border-stone-200 text-slate-700 hover:bg-stone-100 font-bold transition-all text-sm">→</button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-black text-stone-400 uppercase tracking-wider pb-1">
            <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Нд</div>
          </div>

          <div className="space-y-1">
            {gridRows.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-7 gap-1">
                {row.map((cell, cIdx) => {
                  if (!cell.isCurrentMonth) {
                    return (
                      <div key={cIdx} className="aspect-square flex items-center justify-center text-[11px] font-bold text-stone-200 select-none">
                        {cell.dayNum}
                      </div>
                    );
                  }
                  const status = getDayStatus(cell.dateStr);
                  const colorClass = CALENDAR_COLORS[status];
                  return (
                    <button
                      key={cIdx}
                      onClick={() => handleCellClick(cell)}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xs transition-all ${colorClass}`}
                    >
                      {cell.dayNum}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-wider text-stone-500 bg-stone-50 rounded-2xl p-3 border border-stone-100">
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-[#AF1F1F] shadow-sm"></span><span>Заплановано</span></div>
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-slate-700 shadow-sm"></span><span>Контроль</span></div>
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-sm"></span><span>Проведено</span></div>
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm"></span><span>Перенесено</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}