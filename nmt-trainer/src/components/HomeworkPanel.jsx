import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

// Бокова панель з деталями ДЗ — заміна window.openHwPanel() з personalCabinetscript.js.
// Поки що показує лише обов'язкові тести (без розбивки на
// intermediate/summary/optional і без підтягування назв CUSTOM_ тестів —
// це можна додати наступним кроком, коли підключимо TestRunner).
export default function HomeworkPanel({ hw, onClose }) {
  const { currentUser } = useAuth();
  const [completedMap, setCompletedMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hw || !currentUser) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const tasksSnap = await getDocs(
          query(
            collection(db, 'completed_tasks'),
            where('assignmentId', '==', hw.id),
            where('userId', '==', currentUser.uid)
          )
        );
        const map = {};
        tasksSnap.forEach((docSnap) => {
          const d = docSnap.data();
          map[d.testId] = d;
        });
        if (!cancelled) setCompletedMap(map);
      } catch (e) {
        console.error('Помилка завантаження прогресу ДЗ:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hw, currentUser]);

  if (!hw) return null;

  const doneCount = hw.requiredTests.filter((tId) => completedMap[tId] !== undefined).length;
  const totalCount = hw.requiredTests.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex justify-end transition-all duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/30">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tighter">
              {hw.title}
            </h3>
            <p className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">
              {totalCount} обов'язкових тестів
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-stone-100 rounded-full text-stone-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto custom-scroll flex-1 space-y-6">
          {/* Прогрес */}
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                Прогрес
              </span>
              <span className="text-xs font-black text-indigo-700">
                {doneCount} / {totalCount}
              </span>
            </div>
            <div className="w-full bg-indigo-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Конспекти теорії */}
          {hw.theoryUrls?.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3">
                Конспекти теорії
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {hw.theoryUrls.map((t, idx) => (
                  <a
                    key={idx}
                    href={t.path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-100 rounded-xl hover:bg-stone-100 transition-all text-xs font-bold text-slate-700"
                  >
                    <span>📚</span>
                    <span className="truncate">{t.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Обов'язкові тести */}
          <div>
            <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-3">
              Обов'язкові тести
            </h4>

            {loading ? (
              <p className="text-xs font-bold text-stone-400">Завантаження...</p>
            ) : totalCount === 0 ? (
              <p className="text-xs font-bold text-stone-400">Обов'язкових тестів немає</p>
            ) : (
              <div className="space-y-2">
                {hw.requiredTests.map((tId) => {
                  const taskData = completedMap[tId];
                  const isDone = taskData !== undefined;
                  const ts = taskData?.attempt_timestamp || taskData?.completedAt || taskData?.submittedAt;

                  return (
                    <a
                      key={tId}
                      href={`/tests/${tId}?assignmentId=${hw.id}`}
                      className={`flex justify-between items-center p-4 rounded-2xl border transition-all group ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-100 cursor-default'
                          : 'bg-indigo-50/40 border-indigo-100/50 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
                            isDone ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-600'
                          }`}
                        >
                          {isDone ? '✓' : '📋'}
                        </span>
                        <div className="flex flex-col">
                          <span
                            className={`text-xs font-black ${
                              isDone
                                ? 'text-emerald-700 line-through opacity-70'
                                : 'text-slate-700 group-hover:text-indigo-600'
                            }`}
                          >
                            {tId}
                          </span>
                          {isDone && (
                            <span className="text-[10px] text-emerald-600 font-bold mt-0.5">
                              Результат: {taskData.score ?? taskData.testResult ?? 0} з{' '}
                              {taskData.maxScore ?? 0} балів
                              {taskData.secondsTotal !== undefined &&
                                ` • Час: ${Math.floor(taskData.secondsTotal / 60)} хв ${
                                  taskData.secondsTotal % 60
                                } с`}
                              {ts &&
                                ` • ${new Date(ts.seconds * 1000).toLocaleString('uk-UA', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}`}
                            </span>
                          )}
                        </div>
                      </div>
                      {isDone ? (
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg uppercase tracking-wider border border-emerald-200">
                          Пройдено
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-lg uppercase tracking-wider">
                          Пройти
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}