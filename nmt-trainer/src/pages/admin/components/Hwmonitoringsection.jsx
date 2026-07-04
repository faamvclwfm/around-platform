import { useEffect, useState } from 'react';
import { fetchHwMonitoring } from '../../../services/groupsService';
import FlaggedQuestionsModal from './FlaggedQuestionsModal';

export default function HwMonitoringSection({ groupId, assignmentId, hwTitle, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [flaggedFor, setFlaggedFor] = useState(null);

  useEffect(() => {
    let active = true;
    setRows(null);
    setError(null);
    fetchHwMonitoring(groupId, assignmentId)
      .then((r) => active && setRows(r))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [groupId, assignmentId]);

  return (
    <div className="mt-8 p-6 bg-stone-50/50 border border-stone-100 rounded-[2rem]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase">{hwTitle}</h4>
          <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-0.5">Моніторинг прогресу групи</p>
        </div>
        <button onClick={onClose} className="text-stone-400 text-xs font-bold uppercase hover:text-red-500">
          Закрити
        </button>
      </div>
      <div className="overflow-x-auto custom-scroll">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-white text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
              <th className="p-4">Учень</th>
              <th className="p-4 text-center">Шкала виконання</th>
              <th className="p-4 text-center">Процент</th>
              <th className="p-4 text-center">Статус</th>
            </tr>
          </thead>
          <tbody className="bg-white rounded-b-2xl">
            {error && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-red-400">
                  Помилка: {error}
                </td>
              </tr>
            )}
            {!error && rows === null && (
              <tr>
                <td colSpan={4} className="p-4 text-center font-bold text-stone-400 text-xs">
                  Завантаження прогресу...
                </td>
              </tr>
            )}
            {!error && rows !== null && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-stone-400">
                  У групі немає учнів
                </td>
              </tr>
            )}
            {!error &&
              rows?.map((row, i) => (
                <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/50 transition-all">
                  <td className="p-4 font-bold text-slate-700">
                    {row.email}
                    <div className="block">
                      {row.flaggedItems.length > 0 && (
                        <button
                          onClick={() => setFlaggedFor(row.flaggedItems)}
                          className="mt-2 px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-lg border border-amber-100 uppercase hover:bg-amber-100 transition-all"
                        >
                          Складні ({row.flaggedItems.length})
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="w-32 bg-stone-100 h-2 rounded-full mx-auto overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${row.percent}%` }} />
                    </div>
                  </td>
                  <td className="p-4 text-center font-black text-indigo-600">{row.percent}%</td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full font-black uppercase text-[9px] ${
                        row.isSubmitted
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}
                    >
                      {row.isSubmitted ? 'Здано' : 'В процесі'}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {flaggedFor && <FlaggedQuestionsModal questions={flaggedFor} onClose={() => setFlaggedFor(null)} />}
    </div>
  );
}