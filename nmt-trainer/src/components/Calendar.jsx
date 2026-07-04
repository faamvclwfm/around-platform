import { useMemo, useState } from 'react';

const DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTH_NAMES_UKR = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

const STATUS_STYLES = {
  scheduled: {
    cell: 'bg-[#AF1F1F] text-white font-black shadow-sm shadow-red-100 hover:bg-[#911616]',
    time: 'text-red-200'
  },
  conducted: {
    cell: 'bg-emerald-600 text-white font-black shadow-sm shadow-emerald-100 hover:bg-emerald-700',
    time: 'text-emerald-100'
  },
  rescheduled: {
    cell: 'bg-amber-400 text-slate-900 font-black shadow-sm shadow-amber-100 hover:bg-amber-500',
    time: 'text-amber-900/60'
  },
  cancelled: {
    cell: 'bg-amber-400 text-slate-900 font-black shadow-sm shadow-amber-100 hover:bg-amber-500',
    time: 'text-amber-900/60'
  },
  milestone: {
    cell: 'bg-slate-700 text-white font-black shadow-sm shadow-slate-700/30 hover:bg-slate-800',
    time: 'text-slate-300'
  },
  none: {
    cell: 'bg-stone-50/50 border border-transparent text-slate-700 hover:bg-stone-100',
    time: 'text-stone-400'
  }
};

function formatDateUa(dateStr) {
  if (!dateStr) return '';
  const months = [
    'Січня', 'Лютого', 'Березня', 'Квітня', 'Травня', 'Червня',
    'Липня', 'Серпня', 'Вересня', 'Жовтня', 'Листопада', 'Грудня'
  ];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

function normalizeLessonsFromSchedule(dateStr, schedule) {
  const exceptions = schedule?.exceptions || {};
  const dayData = exceptions[dateStr];
  const dateObj = new Date(dateStr + 'T00:00:00');
  let dow = dateObj.getDay();
  if (dow === 0) dow = 7;
  const recurring = schedule?.recurring || [];

  if (dayData) {
    if (Array.isArray(dayData.list) && dayData.list.length > 0) {
      return dayData.list.map((l) => ({ ...l }));
    }
    if (dayData.status && dayData.status !== 'none') {
      return [{ status: dayData.status, time: dayData.time || '', hwTitle: dayData.hwTitle || '' }];
    }
    return [];
  }

  const recLesson = recurring.find((r) => r.day === dow);
  if (recLesson) {
    return [{ status: 'scheduled', time: recLesson.time || '', hwTitle: '' }];
  }
  return [];
}

/**
 * React-заміна renderCalendar() з calendarWidget.js.
 * Без window.* глобального стейту — місяць/рік тримаються у useState,
 * клік на день піднімається назовні через onDayClick(dateStr, dayInfo).
 */
export default function Calendar({ schedule, onDayClick }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const changeMonth = (delta) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  const days = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const shift = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells = Array.from({ length: shift }, () => null);

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const lessons = normalizeLessonsFromSchedule(dateStr, schedule);
      const activeLesson = lessons.find((l) => l.status !== 'cancelled' && l.status !== 'none') || lessons[0];
      const multipleActive = lessons.filter((l) => l.status !== 'none').length > 1;

      let status = 'none';
      let time = '';
      let hwTitle = '';
      let isLesson = false;

      if (lessons.length > 0 && activeLesson) {
        status = activeLesson.status;
        time = activeLesson.time || '';
        hwTitle = lessons.map((l) => l.hwTitle).filter(Boolean).join(' | ');
        if (status !== 'none' && status !== 'cancelled') isLesson = true;
        else if (status === 'cancelled' && lessons.length === 1) isLesson = false;
        else if (lessons.some((l) => l.status !== 'none' && l.status !== 'cancelled')) isLesson = true;
      }

      cells.push({ day, dateStr, lessons, status, time, hwTitle, isLesson, multipleActive });
    }

    return cells;
  }, [year, month, schedule]);

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-[2rem] p-2 sm:p-6 select-none">
      <div className="flex justify-between items-center mb-6 px-2">
        <button
          onClick={() => changeMonth(-1)}
          className="w-10 h-10 flex items-center justify-center bg-stone-50 hover:bg-stone-100 rounded-full transition-all text-stone-400 hover:text-slate-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h4 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-widest">
          {MONTH_NAMES_UKR[month]} {year}
        </h4>
        <button
          onClick={() => changeMonth(1)}
          className="w-10 h-10 flex items-center justify-center bg-stone-50 hover:bg-stone-100 rounded-full transition-all text-stone-400 hover:text-slate-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-[10px] sm:text-xs font-black text-stone-400 uppercase tracking-widest py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((cell, idx) => {
          if (!cell) return <div key={`empty-${idx}`} className="aspect-square" />;

          const style = STATUS_STYLES[cell.isLesson ? cell.status : 'none'] || STATUS_STYLES.none;
          const formattedDate = formatDateUa(cell.dateStr);

          let tooltipText;
          if (cell.hwTitle) {
            tooltipText = (
              <>
                <span className={cell.status === 'milestone' ? 'text-amber-300' : 'text-indigo-300'}>
                  {cell.status === 'milestone' ? 'ТЕМИ:' : 'ДЗ:'}
                </span>{' '}
                {cell.hwTitle}
              </>
            );
          } else {
            tooltipText = cell.isLesson
              ? cell.multipleActive
                ? `${cell.lessons.filter((l) => l.status !== 'none').length} заняття`
                : 'Є заняття'
              : 'Занять немає';
          }

          return (
            <button
              key={cell.dateStr}
              onClick={() => onDayClick?.(cell.dateStr, cell)}
              className={`group relative aspect-square flex flex-col items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 hover:z-10 ${style.cell}`}
            >
              <span className="text-xs sm:text-sm font-black tracking-tight">{cell.day}</span>
              {cell.isLesson && cell.time && (
                <span className={`text-[8px] sm:text-[10px] font-bold tracking-tighter mt-0.5 ${style.time}`}>
                  {cell.time}
                </span>
              )}
              {cell.multipleActive && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/90 text-slate-800 text-[8px] font-black flex items-center justify-center shadow-sm border border-white/60">
                  {cell.lessons.filter((l) => l.status !== 'none').length}
                </span>
              )}
              {cell.hwTitle && (
                <span
                  className={`absolute bottom-1 w-1 h-1 rounded-full shadow-sm ${
                    cell.status === 'none' ? 'bg-indigo-500' : 'bg-white/80'
                  }`}
                />
              )}

              <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[150px] sm:max-w-[200px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] bg-slate-800 text-white text-[10px] font-bold p-2.5 rounded-xl shadow-xl text-center leading-relaxed">
                <div
                  className={`text-[8px] uppercase tracking-widest mb-1 ${
                    cell.status === 'milestone' ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {cell.status === 'milestone' ? '🚩 КОНТРОЛЬ ЗНАНЬ' : formattedDate}
                </div>
                <div>{tooltipText}</div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 justify-center items-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-stone-50 rounded-2xl p-3 border border-stone-100">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#AF1F1F] shadow-sm shadow-[#AF1F1F]/30" />
          <span>Заплановано</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-700 shadow-sm shadow-slate-700/30" />
          <span>Контроль</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-600/30" />
          <span>Проведено</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/30" />
          <span>Перенесено</span>
        </div>
      </div>
    </div>
  );
}