import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import allTests from '../data/questionsData';

const CLOUD_FUNCTION_URL =
  'https://us-central1-diagnostictestresults-9f6ac.cloudfunctions.net/submitTestResults';
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д'];

// --- KaTeX inline/display рендер, як у universal_script.js ---
function renderLatex(text) {
  if (!text || typeof text !== 'string') return text || '';
  if (typeof window === 'undefined' || !window.katex) return text;
  let formatted = text.replace(/\$\$(.*?)\$\$/g, (match, eq) => {
    try {
      return window.katex.renderToString(eq, { displayMode: true, throwOnError: false });
    } catch {
      return match;
    }
  });
  formatted = formatted.replace(/\$(.*?)\$/g, (match, eq) => {
    try {
      return window.katex.renderToString(eq, { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });
  return formatted;
}

function Latex({ text, className }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderLatex(text) }} />;
}

export default function TestRunner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const testId = searchParams.get('id') || 'default';
  const assignmentId = searchParams.get('assignmentId');
  const collectionName = `results_${testId}`;

  // --- завантаження тесту (локальний questionsData або custom_tests у Firestore) ---
  const [testData, setTestData] = useState(null);
  const [loadingTest, setLoadingTest] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTest(true);
      setNotFound(false);
      let data = null;

      if (allTests) {
        data = Array.isArray(allTests) ? allTests.find((t) => t.id === testId) : allTests[testId];
      }

      if (!data && testId.startsWith('CUSTOM_')) {
        try {
          const snap = await getDoc(doc(db, 'custom_tests', testId));
          if (snap.exists()) data = snap.data();
        } catch (e) {
          console.error('Помилка завантаження кастомного тесту', e);
        }
      }

      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoadingTest(false);
        return;
      }
      setTestData(data);
      setLoadingTest(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const questions = testData?.questions || [];

  // --- стан проходження тесту ---
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [secondsTotal, setSecondsTotal] = useState(0);
  const [timerVisible, setTimerVisible] = useState(true);
  const [flagged, setFlagged] = useState([]); // масив індексів
  const [singleAnswers, setSingleAnswers] = useState({}); // { qIndex: optionIndex }
  const [matchingAnswers, setMatchingAnswers] = useState({}); // { qIndex: { rowIndex: colIndex } }
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null); // { score, max, timeStr, perQuestionCorrect }
  const [submitting, setSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
  );

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // dark mode — як у test.html (клас на <html> + localStorage)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // KaTeX auto-render для блоків, які не проходять через dangerouslySetInnerHTML
  useEffect(() => {
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }
  }, [questions, currentQuestion, finished]);

  // попередження перед закриттям вкладки, якщо тест не завершено
  useEffect(() => {
    function handler(e) {
      if (isTestStarted && !finished) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isTestStarted, finished]);

  // навігація стрілками
  useEffect(() => {
    function handler(e) {
      if (!isTestStarted || finished || questions.length === 0) return;
      if (e.key === 'ArrowRight') nextQuestion();
      if (e.key === 'ArrowLeft') showQuestion((currentQuestion - 1 + questions.length) % questions.length);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTestStarted, finished, currentQuestion, questions.length]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function startTest() {
    setIsTestStarted(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setSecondsTotal(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }

  function showQuestion(index) {
    setCurrentQuestion(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function nextQuestion() {
    if (questions.length === 0) return;
    showQuestion((currentQuestion + 1) % questions.length);
  }

  function toggleFlag(index) {
    setFlagged((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  }

  function selectSingle(qIndex, optIndex) {
    if (finished) return;
    setSingleAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  }

  function selectMatching(qIndex, rowIndex, colIndex) {
    if (finished) return;
    setMatchingAnswers((prev) => {
      const qMap = { ...(prev[qIndex] || {}) };
      // кожен варіант відповіді можна використати лише в одному рядку
      Object.keys(qMap).forEach((r) => {
        if (qMap[r] === colIndex) delete qMap[Number(r)];
      });
      qMap[rowIndex] = colIndex;
      return { ...prev, [qIndex]: qMap };
    });
  }

  const progressPercent = useMemo(() => {
    let answered = 0;
    let total = 0;
    questions.forEach((q, i) => {
      if (q.type === 'single') {
        total += 1;
        if (singleAnswers[i] !== undefined) answered++;
      } else if (q.type === 'matching') {
        const subCount = q.subQuestions?.length || 0;
        total += subCount;
        answered += Object.keys(matchingAnswers[i] || {}).length;
      }
    });
    return total > 0 ? Math.round((answered / total) * 100) : 0;
  }, [questions, singleAnswers, matchingAnswers]);

  async function sendResults(payload) {
    try {
      const res = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch {
      return null;
    }
  }

  async function checkAnswers() {
    if (!currentUser) {
      alert('Зачекайте, триває авторизація...');
      return;
    }
    if (!isTestStarted || questions.length === 0) return;

    clearInterval(timerRef.current);
    setSubmitting(true);

    const mins = Math.floor(secondsTotal / 60);
    const secs = secondsTotal % 60;
    const finalTimeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    let totalScore = 0;
    let maxPossibleScore = 0;
    const answersArray = [];
    const perQuestionCorrect = [];

    questions.forEach((qData, index) => {
      let isQuestionFullyCorrect = false;

      if (qData.type === 'single') {
        const questionMax = qData.maxScore !== undefined ? Number(qData.maxScore) : 1;
        maxPossibleScore += questionMax;

        const val = singleAnswers[index] !== undefined ? singleAnswers[index] : -1;
        const correctVal = parseInt(qData.correct, 10);
        const isCorrect = val === correctVal;
        if (isCorrect) {
          totalScore += questionMax;
          isQuestionFullyCorrect = true;
        }

        answersArray.push({
          question_id: qData.id,
          type: 'single',
          chosen_option: val,
          is_correct: isCorrect,
          question: qData.text || qData.question || '',
          options: qData.options || []
        });
      } else if (qData.type === 'matching') {
        const subCount = qData.subQuestions?.length || 0;
        const questionMax = qData.maxScore !== undefined ? Number(qData.maxScore) : subCount;
        maxPossibleScore += questionMax;

        let rowScore = 0;
        const userChoices = [];
        for (let r = 0; r < subCount; r++) {
          const val = matchingAnswers[index]?.[r] !== undefined ? matchingAnswers[index][r] : -1;
          const correctVal = parseInt(qData.correct[r], 10);
          if (val === correctVal) rowScore++;
          userChoices.push(val);
        }
        const finalRowScore = Math.min(rowScore, questionMax);
        totalScore += finalRowScore;
        if (finalRowScore === questionMax) isQuestionFullyCorrect = true;

        answersArray.push({
          question_id: qData.id,
          type: 'matching',
          chosen_options: userChoices,
          score: finalRowScore,
          max_score: questionMax
        });
      }

      perQuestionCorrect[index] = isQuestionFullyCorrect;
    });

    try {
      if (assignmentId && currentUser) {
        const docId = `${currentUser.uid}_${assignmentId}_${testId}`;
        await setDoc(doc(db, 'completed_tasks', docId), {
          assignmentId,
          userId: currentUser.uid,
          testId,
          score: totalScore,
          maxScore: maxPossibleScore,
          flaggedQuestions: flagged.map((i) => questions[i]),
          completedAt: serverTimestamp()
        });
      }

      const payload = {
        userId: currentUser.uid,
        testName: testData.title,
        testQuestionsQuantity: maxPossibleScore,
        testResult: totalScore,
        maxScore: maxPossibleScore,
        testURl: window.location.href,
        answers: answersArray,
        collection_id: collectionName,
        secondsTotal,
        assignmentId
      };
      await sendResults(payload);

      setResult({ score: totalScore, max: maxPossibleScore, timeStr: finalTimeStr, perQuestionCorrect });
      setFinished(true);

      const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
      if (percentage >= 80 && typeof window.confetti === 'function') {
        window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      alert('Сталася помилка при збереженні результатів.');
    } finally {
      setSubmitting(false);
    }
  }

  function tryAgain() {
    window.location.reload();
  }

  // ---------------------------------------------------------------- render

  if (loadingTest) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-100 dark:bg-slate-900">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-stone-100 dark:bg-slate-900">
        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Тест не знайдено!</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm"
        >
          На головну
        </button>
      </div>
    );
  }

  const activeQuestion = questions[currentQuestion];

  return (
    <div className={`bg-stone-100 dark:bg-slate-900 min-h-screen transition-colors duration-300`}>
      <nav className="bg-white dark:bg-slate-800 flex justify-between p-3 px-5 items-center shadow-sm transition-colors duration-300">
        <button onClick={() => navigate('/')}>
          <img src="/logo1.svg" alt="Logo" className="w-10 h-10" />
        </button>
        <button
          onClick={() => setDarkMode((d) => !d)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-700 text-base hover:bg-stone-200 dark:hover:bg-slate-600 transition-all border border-stone-200 dark:border-slate-600"
          title="Змінити тему"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </nav>

      <main className="container mx-auto px-2 py-6 max-w-[940px]">
        {/* Навігація по питаннях */}
        {isTestStarted && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {questions.map((_, i) => {
              let cls =
                'w-10 h-10 rounded-xl font-bold transition-all border shadow-sm flex-shrink-0 border-stone-200 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-600 dark:text-slate-300';
              if (finished) {
                cls += result?.perQuestionCorrect?.[i]
                  ? ' !bg-green-100 !text-green-800 !border-green-200'
                  : ' !bg-red-100 !text-red-800 !border-red-200';
              } else if (i === currentQuestion) {
                cls += ' ring-2 ring-blue-500 text-blue-600 bg-blue-50 dark:bg-slate-700';
              }
              return (
                <button key={i} onClick={() => showQuestion(i)} className={cls}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        )}

        {/* Прогрес-бар */}
        {isTestStarted && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider">
                {testData.title || 'Тест'}
              </span>
              <p className="font-bold text-blue-600 text-sm">{progressPercent}%</p>
            </div>
            <div className="relative w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Стартовий екран */}
        {!isTestStarted && (
          <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-stone-100 dark:border-slate-700 mb-6 transition-colors duration-300">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-4">Готові почати?</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6 text-center">
              Таймер увімкнеться після натискання кнопки.
            </p>
            <button
              onClick={startTest}
              className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
            >
              Почати тест
            </button>
          </div>
        )}

        {/* Таймер */}
        {isTestStarted && (
          <div className="fixed top-20 right-5 z-50 flex items-center gap-2">
            <button
              onClick={() => setTimerVisible((v) => !v)}
              className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-md border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-700 transition-all"
              title="Сховати/Показати таймер"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            {timerVisible && (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-5 py-2 rounded-2xl shadow-lg border border-red-100 dark:border-slate-700 flex items-center gap-3 transition-all duration-300">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                </div>
                <span className="font-mono text-xl font-black text-gray-800 dark:text-slate-100 tracking-tighter">
                  {String(Math.floor(secondsTotal / 60)).padStart(2, '0')}:
                  {String(secondsTotal % 60).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Питання */}
        {isTestStarted && activeQuestion && (
          <QuestionBlock
            key={currentQuestion}
            q={activeQuestion}
            index={currentQuestion}
            flagged={flagged.includes(currentQuestion)}
            onToggleFlag={() => toggleFlag(currentQuestion)}
            singleValue={singleAnswers[currentQuestion]}
            onSelectSingle={(optIdx) => selectSingle(currentQuestion, optIdx)}
            matchingValue={matchingAnswers[currentQuestion] || {}}
            onSelectMatching={(row, col) => selectMatching(currentQuestion, row, col)}
            finished={finished}
          />
        )}

        {/* Кнопки керування */}
        {isTestStarted && !finished && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={nextQuestion}
              className="btn-action next px-6 py-3 rounded-2xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 transition-all"
            >
              Наступне питання
            </button>
            <button
              onClick={checkAnswers}
              disabled={submitting}
              className="btn-action main px-6 py-3 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
            >
              {submitting ? 'Перевірка...' : 'Перевірити тест'}
            </button>
          </div>
        )}

        {finished && (
          <div className="mt-6">
            <button
              onClick={tryAgain}
              className="btn-action again px-6 py-3 rounded-2xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
            >
              Спробувати знову
            </button>
          </div>
        )}

        {/* Результат */}
        {finished && result && (
          <div className="mt-6">
            <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-2xl border border-stone-100 dark:border-slate-700 text-center mx-auto max-w-lg mb-12">
              <p className="text-stone-400 uppercase tracking-widest text-[10px] font-bold mb-4">
                Результат тестування
              </p>
              <div className="flex justify-center items-baseline gap-2 mb-6">
                <span className="text-6xl font-black text-slate-800 dark:text-slate-100">{result.score}</span>
                <span className="text-2xl text-slate-300 font-bold">/ {result.max}</span>
              </div>
              <div className="flex gap-3 justify-center items-center">
                <div className="bg-stone-50 dark:bg-slate-900 px-5 py-4 rounded-2xl border border-stone-100 dark:border-slate-700 flex-1">
                  <p className="text-[10px] text-stone-400 uppercase font-black mb-1">Точність</p>
                  <p className="text-2xl font-black text-blue-600">
                    {result.max > 0 ? Math.round((result.score / result.max) * 100) : 0}%
                  </p>
                </div>
                <div className="bg-stone-50 dark:bg-slate-900 px-5 py-4 rounded-2xl border border-stone-100 dark:border-slate-700 flex-1">
                  <p className="text-[10px] text-stone-400 uppercase font-black mb-1">Час</p>
                  <p className="text-xl font-bold text-slate-700 dark:text-slate-200 font-mono">{result.timeStr}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------
// Один блок питання (single / matching), винесений окремо для чистоти
// ---------------------------------------------------------------------
function QuestionBlock({
  q,
  index,
  flagged,
  onToggleFlag,
  singleValue,
  onSelectSingle,
  matchingValue,
  onSelectMatching,
  finished
}) {
  return (
    <div className="question active">
      <div className="bg-white dark:bg-slate-800 shadow-sm flex justify-center items-center py-8 rounded-3xl px-4 mb-6 border border-stone-100 dark:border-slate-700 relative">
        <button
          onClick={onToggleFlag}
          className={`absolute top-4 right-4 w-10 h-10 rounded-xl border flex items-center justify-center text-lg transition-all shadow-sm z-10 ${
            flagged
              ? 'bg-amber-100 text-amber-600 border-amber-400'
              : 'bg-stone-50 dark:bg-slate-700 text-stone-400 border-stone-200 dark:border-slate-600 hover:bg-amber-50 hover:text-amber-500'
          }`}
          title="Позначити як складне"
        >
          ❓
        </button>
        <Latex
          text={q.text || q.question || ''}
          className="text-center text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 w-full pr-12"
        />
      </div>

      {q.type === 'single' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(q.options || []).map((opt, i) => {
            const isSelected = singleValue === i;
            const isCorrectOption = finished && parseInt(q.correct, 10) === i;
            const isWrongSelected = finished && isSelected && !isCorrectOption;

            let cls =
              'option-btn px-6 py-4 border-2 rounded-2xl transition-all flex items-center justify-center text-center font-medium cursor-pointer';
            if (isCorrectOption) cls += ' bg-green-100 border-green-500';
            else if (isWrongSelected) cls += ' bg-red-100 border-red-500';
            else if (isSelected) cls += ' bg-blue-100 border-blue-500 shadow-inner';
            else cls += ' border-stone-200 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/30';

            return (
              <label key={i} className="cursor-pointer group relative">
                <input
                  type="radio"
                  name={`q${index}`}
                  value={i}
                  checked={isSelected}
                  onChange={() => onSelectSingle(i)}
                  disabled={finished}
                  className="hidden"
                />
                <div className={cls}>
                  <Latex text={String(opt)} />
                </div>
              </label>
            );
          })}
        </div>
      )}

      {q.type === 'matching' && (
        <>
          <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl mb-8 border border-slate-100 dark:border-slate-700 space-y-3">
            {(q.options || []).map((opt, i) => (
              <div key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-200 text-sm md:text-base">
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <Latex text={String(opt)} />
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-stone-200 dark:border-slate-700 shadow-sm overflow-hidden overflow-x-auto">
            <div className="min-w-[600px]">
              <div
                className="grid bg-slate-50 dark:bg-slate-900 border-b border-stone-200 dark:border-slate-700"
                style={{ gridTemplateColumns: `100px 1fr repeat(${q.options.length}, 70px)` }}
              >
                <div className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-center">
                  Умова
                </div>
                <div className="p-4" />
                {q.options.map((_, i) => (
                  <div key={i} className="flex items-center justify-center font-bold text-slate-500 border-l border-stone-200/50 dark:border-slate-700/50">
                    {i + 1}
                  </div>
                ))}
              </div>

              {(q.subQuestions || []).map((sub, r) => {
                const selectedCol = matchingValue[r];
                const correctVal = parseInt(q.correct[r], 10);

                return (
                  <div
                    key={r}
                    className="grid border-b border-stone-100 dark:border-slate-700 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                    style={{ gridTemplateColumns: `100px 1fr repeat(${q.options.length}, 70px)` }}
                  >
                    <div className="flex items-center justify-center border-r border-stone-100 dark:border-slate-700 font-black text-blue-600 text-lg">
                      {LETTERS[r]}
                    </div>
                    <div className="p-4 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center">
                      <Latex text={String(sub)} />
                    </div>
                    {q.options.map((_, c) => {
                      const isChecked = selectedCol === c;
                      const isCorrectCell = finished && correctVal === c;
                      const isWrongSelectedCell = finished && isChecked && !isCorrectCell;

                      let cellCls = 'matching-cell w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all';
                      if (isCorrectCell) cellCls += ' bg-green-100 border-green-500';
                      else if (isWrongSelectedCell) cellCls += ' bg-red-100 border-red-500';
                      else if (isChecked) cellCls += ' bg-blue-50 border-blue-400';
                      else cellCls += ' border-stone-200 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-blue-400';

                      const showMark = isChecked || isCorrectCell;
                      const markColor = isCorrectCell ? '#16a34a' : isWrongSelectedCell ? '#dc2626' : '#2563eb';

                      return (
                        <div key={c} className="border-l border-stone-100 dark:border-slate-700 relative flex items-center justify-center">
                          <label className="w-full h-full flex items-center justify-center cursor-pointer py-4 px-1 group">
                            <input
                              type="radio"
                              name={`q${index}_row${r}`}
                              value={c}
                              checked={isChecked}
                              onChange={() => onSelectMatching(r, c)}
                              disabled={finished}
                              className="hidden"
                            />
                            <div className={cellCls}>
                              {showMark && (
                                <div className="check-mark font-black text-xl" style={{ color: markColor }}>
                                  ✕
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-stone-400 italic mt-2">Тип: Відповідності.</p>
        </>
      )}
    </div>
  );
}