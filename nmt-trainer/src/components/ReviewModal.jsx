import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { allTests } from '../data/questionsData';

function renderLatex(text) {
  if (!text || typeof text !== 'string') return text || '';
  if (typeof window === 'undefined' || !window.katex) return text;
  let formatted = text.replace(/\$\$(.*?)\$\$/g, (m, eq) => {
    try {
      return window.katex.renderToString(eq, { displayMode: true, throwOnError: false });
    } catch {
      return m;
    }
  });
  formatted = formatted.replace(/\$(.*?)\$/g, (m, eq) => {
    try {
      return window.katex.renderToString(eq, { displayMode: false, throwOnError: false });
    } catch {
      return m;
    }
  });
  return formatted;
}
function Latex({ text, className }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderLatex(text) }} />;
}

/**
 * Заміна window.openReviewModal(collectionId, docId) — детальний огляд
 * пройденого тесту: питання, обраний варіант, правильна відповідь.
 */
export default function ReviewModal({ collectionId, docId, questionsCache, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resultData, setResultData] = useState(null);
  const [testQuestions, setTestQuestions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const snap = await getDoc(doc(db, collectionId, docId));
        const data = snap.data();
        if (cancelled) return;
        setResultData(data);

        const localTestKey = collectionId.replace('results_', '');
        let questions = allTests?.[localTestKey]?.questions || null;

        if (!questions && data?.answers) {
          const builtFromCache = data.answers
            .map((ans) => questionsCache?.[String(ans.question_id)] || null)
            .filter(Boolean);
          if (builtFromCache.length > 0) questions = builtFromCache;
        }

        if (!questions && data?.answers) {
          const builtFromAnswers = data.answers
            .filter((ans) => ans.question && ans.options)
            .map((ans) => ({
              id: ans.question_id,
              question: ans.question,
              options: ans.options,
              correct: ans.correct ?? ans.correct_option,
              type: ans.type || 'single'
            }));
          if (builtFromAnswers.length > 0) questions = builtFromAnswers;
        }

        setTestQuestions(questions);
      } catch (e) {
        console.error('openReviewModal error:', e);
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionId, docId, questionsCache]);

  const mins = Math.floor((resultData?.secondsTotal || 0) / 60);
  const secs = (resultData?.secondsTotal || 0) % 60;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[140] flex justify-center items-start pt-10 pb-10 overflow-y-auto px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-stone-100 rounded-full text-stone-500 hover:bg-red-50 hover:text-red-500 transition-all z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 pb-4 border-b border-stone-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-10 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
              <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Завантаження...</p>
            </div>
          ) : resultData ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Аналіз результатів</p>
                <h2 className="text-2xl font-black text-slate-800">{resultData.testName}</h2>
              </div>
              <div className="flex gap-2">
                <div className="bg-white border border-stone-100 p-3 rounded-2xl shadow-sm flex flex-col items-center min-w-[80px]">
                  <span className="text-[9px] uppercase font-black text-stone-400">Бали</span>
                  <span className="text-lg font-black text-indigo-600">
                    {resultData.testResult}/{resultData.maxScore || resultData.testQuestionsQuantity}
                  </span>
                </div>
                <div className="bg-white border border-stone-100 p-3 rounded-2xl shadow-sm flex flex-col items-center min-w-[80px]">
                  <span className="text-[9px] uppercase font-black text-stone-400">Час</span>
                  <span className="text-lg font-black text-slate-700">
                    {mins}:{String(secs).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-8 pt-6 max-h-[70vh] overflow-y-auto">
          {error && <div className="p-10 text-center text-rose-500 font-bold">{error}</div>}

          {!loading && !error && !testQuestions && resultData && (
            <>
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-amber-700 text-xs font-bold uppercase tracking-widest">
                  ℹ️ Детальний перегляд питань недоступний для цього тесту. Показано лише статус відповідей.
                </p>
              </div>
              {(resultData.answers || []).map((ans, idx) => {
                const isCorrect = ans.is_correct;
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-[1.5rem] border mb-3 ${
                      isCorrect ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-xl ${
                          isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                        } text-white flex items-center justify-center text-sm font-black`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                          Питання ID: {ans.question_id}
                        </p>
                        <p className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'} mt-0.5`}>
                          {isCorrect ? '✓ Правильно' : '✕ Неправильно'} · Вибрано варіант{' '}
                          {String.fromCharCode(65 + (ans.chosen_option ?? 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {!loading && !error && testQuestions && resultData && (
            <div className="space-y-6">
              {testQuestions.map((q, idx) => {
                const userAns = resultData.answers
                  ? resultData.answers.find((a) => String(a.question_id) === String(q.id))
                  : null;
                const isUnanswered = !userAns || userAns.chosen_option === -1;

                return (
                  <div key={q.id || idx} className="pb-6 border-b border-stone-50 last:border-0">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                      <Latex text={q.text || q.question} className="text-slate-800 font-bold text-sm md:text-base flex-1" />
                      {isUnanswered && (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-200 ml-auto shrink-0">
                          Не надано
                        </span>
                      )}
                    </div>

                    {(!q.type || q.type === 'single') && (
                      <div className="grid gap-2.5">
                        {(q.options || []).map((opt, optIdx) => {
                          const isCorrectOption = optIdx === q.correct;
                          const isSelectedOption = userAns && userAns.chosen_option === optIdx;
                          let stateClass = 'border-stone-100 bg-white/50 text-slate-500 opacity-60';
                          let icon = null;
                          if (isCorrectOption) {
                            stateClass =
                              'border-emerald-500 bg-white text-emerald-700 font-bold shadow-md shadow-emerald-100 opacity-100 ring-2 ring-emerald-50';
                            icon = (
                              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px]">
                                ✓
                              </div>
                            );
                          } else if (isSelectedOption && !isCorrectOption) {
                            stateClass = 'border-rose-400 bg-white text-rose-700 font-bold opacity-100';
                            icon = (
                              <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px]">
                                ✕
                              </div>
                            );
                          }
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center justify-between px-5 py-3 border-2 rounded-2xl text-sm transition-all ${stateClass}`}
                            >
                              <Latex text={String(opt)} />
                              {icon}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'matching' && <p className="text-xs text-stone-400 italic mt-2">Тип: Відповідності.</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 text-center">
          <button onClick={onClose} className="bg-slate-800 text-white px-8 py-2.5 rounded-2xl font-bold hover:bg-slate-700 transition-all text-sm">
            Закрити огляд
          </button>
        </div>
      </div>
    </div>
  );
}