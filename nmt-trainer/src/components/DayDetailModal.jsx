import React from 'react';

const MONTHS_UA = ["Січня", "Лютого", "Березня", "Квітня", "Травня", "Червня", "Липня", "Серпня", "Вересня", "Жовтня", "Листопада", "Грудня"];

const formatDateUa = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[2], 10)} ${MONTHS_UA[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
};

export default function DayDetailModal({ dateStr, dayInfo, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
              {formatDateUa(dateStr)}
            </h3>
            <p className="text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">Деталі занять на цей день</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-stone-100 rounded-full text-stone-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold text-sm">✕</button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {!dayInfo || dayInfo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <span className="text-2xl">🍃</span>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Занять не знайдено</p>
            </div>
          ) : (
            dayInfo.map((lesson, idx) => {
              let typeLabel = "Групове заняття";
              let typeColor = "text-indigo-500 bg-indigo-50 border-indigo-100";
              
              if (lesson.type === 'milestone') {
                typeLabel = "Контрольна точка";
                typeColor = "text-slate-700 bg-slate-100 border-slate-200";
              } else if (lesson.type === 'individual') {
                typeLabel = "Індивідуальне заняття";
                typeColor = "text-amber-600 bg-amber-50 border-amber-100";
              }

              return (
                <div key={idx} className="bg-stone-50/60 rounded-[1.5rem] p-4 border border-stone-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${typeColor}`}>
                      {typeLabel}
                    </span>
                    {lesson.topicIndex && (
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                        Тема {lesson.topicIndex}
                      </span>
                    )}
                  </div>

                  {lesson.title && (
                    <h4 className="text-sm font-black text-slate-800 leading-snug">
                      {lesson.title}
                    </h4>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {lesson.time && (
                      <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 border border-stone-100 shadow-sm">
                        <span className="text-base">🕐</span>
                        <div>
                          <p className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Час заняття</p>
                          <p className="text-sm font-black text-slate-800">{lesson.time}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {lesson.hwTitle && (
                    <div className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 border border-indigo-100 shadow-sm">
                      <span className="text-base mt-0.5">
                        {lesson.status === 'milestone' ? '🚩' : '📋'}
                      </span>
                      <div>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mb-1">
                          {lesson.status === 'milestone' ? 'Теми контролю' : 'Домашнє завдання'}
                        </p>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed">
                          {lesson.hwTitle}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}