import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ALL_TESTS, COLLECTION_CATEGORY, resolveCategory } from '../utils/testCollections';

const EMPTY_STATS = () => ({ math: [], eng: [], hist: [], ukr: [], chinese: [] });

function calculateStreak(sortedResults) {
  if (sortedResults.length === 0) return 0;
  const dates = sortedResults.map((r) => new Date(r.attempt_timestamp.seconds * 1000).toDateString());
  const uniqueDates = [...new Set(dates)].reverse();

  const today = new Date().toDateString();
  let checkDate = new Date();
  if (uniqueDates[0] !== today) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (uniqueDates[0] !== checkDate.toDateString()) return 0;
  }

  let streak = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    const d = new Date(uniqueDates[i]);
    const expected = new Date();
    expected.setDate(new Date().getDate() - i);
    if (uniqueDates[0] !== today) expected.setDate(expected.getDate() - 1);
    if (d.toDateString() === expected.toDateString()) streak++;
    else break;
  }
  return streak;
}

function buildBadgeList(results) {
  const perfectTests = results.filter((r) => r.testResult / (r.maxScore || 1) >= 1).length;

  let hasComeback = false;
  for (let i = 1; i < results.length; i++) {
    const prevScore = results[i - 1].testResult / results[i - 1].maxScore;
    const currentScore = results[i].testResult / results[i].maxScore;
    if (prevScore < 0.5 && currentScore >= 0.8) {
      hasComeback = true;
      break;
    }
  }

  const times = results.map((r) => {
    const d = new Date(r.attempt_timestamp.seconds * 1000);
    return { hour: d.getHours(), duration: r.secondsTotal || 0 };
  });

  return [
    { condition: results.length >= 1, icon: '🚀', label: 'Пілот', desc: 'Твій перший крок у космос знань' },
    { condition: perfectTests >= 5, icon: '💎', label: 'Ювелір', desc: '5 тестів без жодної помилки' },
    { condition: times.some((t) => t.hour >= 0 && t.hour <= 5), icon: '🦉', label: 'Лицар', desc: 'Нічне навчання (00:00 - 05:00)' },
    { condition: times.some((t) => t.duration > 0 && t.duration < 120), icon: '⚡️', label: 'Спідраннер', desc: 'Тест пройдено швидше ніж за 2 хвилини' },
    { condition: times.some((t) => t.hour >= 6 && t.hour <= 8), icon: '🌅', label: 'Пташка', desc: 'Ранкове тренування до 08:00' },
    { condition: results.length >= 10, icon: '📚', label: 'Марафонець', desc: 'Пройдено 10 повноцінних тестів' },
    { condition: hasComeback, icon: '🛡️', label: 'Незламний', desc: 'Зробив крутий камбек після невдалого тесту' }
  ];
}

/**
 * Тягне результати тестів по всіх предметних колекціях для юзера,
 * рахує статистику/помилки/streak/бейджі/дані для графіків.
 * Заміна великого блоку firebase.auth().onAuthStateChanged(...) у personalCabinetscript.js.
 */
export default function useStudentStats(user) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statsByCategory, setStatsByCategory] = useState({
    math: { correct: 0, max: 0, count: 0, items: [] },
    eng: { correct: 0, max: 0, count: 0, items: [] },
    hist: { correct: 0, max: 0, count: 0, items: [] },
    ukr: { correct: 0, max: 0, count: 0, items: [] },
    chinese: { correct: 0, max: 0, count: 0, items: [] }
  });
  const [mistakesByCat, setMistakesByCat] = useState(EMPTY_STATS());
  const [allResults, setAllResults] = useState([]);
  const [streak, setStreak] = useState(0);
  const [badgeList, setBadgeList] = useState([]);
  const [chartData, setChartData] = useState({ labels: [], scores: [], minutes: [] });
  const [questionsCache, setQuestionsCache] = useState({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');

      try {
        const snapshots = await Promise.all(
          ALL_TESTS.map((t) => getDocs(query(collection(db, t), where('userId', '==', user.uid))))
        );

        const stats = {
          math: { correct: 0, max: 0, count: 0, items: [] },
          eng: { correct: 0, max: 0, count: 0, items: [] },
          hist: { correct: 0, max: 0, count: 0, items: [] },
          ukr: { correct: 0, max: 0, count: 0, items: [] },
          chinese: { correct: 0, max: 0, count: 0, items: [] }
        };

        const allResultsRaw = [];
        const questionsStatus = {};
        const localQuestionsCache = {};

        snapshots.forEach((snap, i) => {
          if (snap.empty) return;
          const collectionName = ALL_TESTS[i];
          const baseCategory = COLLECTION_CATEGORY[collectionName] || 'math';

          snap.forEach((docSnap) => {
            const data = docSnap.data();
            const itemCategory = resolveCategory(collectionName, data, baseCategory);

            allResultsRaw.push(data);
            stats[itemCategory].items.push({ data, docId: docSnap.id, collectionName });
            stats[itemCategory].correct += data.testResult || 0;
            stats[itemCategory].max += data.maxScore || data.testQuestionsQuantity || 0;
            stats[itemCategory].count++;

            if (data.answers && Array.isArray(data.answers)) {
              const attemptTime = data.attempt_timestamp?.seconds || 0;
              data.answers.forEach((ans) => {
                if (ans.type === 'matching') return;
                const qId = String(ans.question_id);
                if (ans.question && ans.options && !localQuestionsCache[qId]) {
                  localQuestionsCache[qId] = {
                    id: qId,
                    question: ans.question,
                    options: ans.options,
                    correct: ans.correct ?? ans.correct_option,
                    type: ans.type || 'single'
                  };
                }
                const statusKey = `${itemCategory}_${qId}`;
                const isCorrect = ans.is_correct ?? (ans.correct !== undefined ? ans.correct : undefined);
                if (!questionsStatus[statusKey] || attemptTime > questionsStatus[statusKey].ts) {
                  questionsStatus[statusKey] = { correct: isCorrect, ts: attemptTime, cat: itemCategory, qId };
                }
              });
            }
          });
        });

        const mistakes = EMPTY_STATS();
        Object.values(questionsStatus).forEach(({ cat, qId, correct }) => {
          if (!correct && mistakes[cat] && !mistakes[cat].includes(qId)) mistakes[cat].push(qId);
        });

        const sortedForStats = allResultsRaw
          .filter((r) => r.attempt_timestamp)
          .sort((a, b) => a.attempt_timestamp.seconds - b.attempt_timestamp.seconds);

        if (cancelled) return;

        setStatsByCategory(stats);
        setMistakesByCat(mistakes);
        setAllResults(allResultsRaw);
        setStreak(calculateStreak(sortedForStats));
        setBadgeList(buildBadgeList(allResultsRaw));
        setChartData({
          labels: sortedForStats.map((r) => new Date(r.attempt_timestamp.seconds * 1000).toLocaleDateString('uk-UA')),
          scores: sortedForStats.map((r) => Math.round((r.testResult / (r.maxScore || 1)) * 100)),
          minutes: sortedForStats.map((r) => Math.round((r.secondsTotal || 0) / 60))
        });
        setQuestionsCache(localQuestionsCache);
      } catch (e) {
        console.error('Помилка завантаження статистики учня:', e);
        if (!cancelled) setError('Помилка завантаження статистики: ' + e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { loading, error, statsByCategory, mistakesByCat, allResults, streak, badgeList, chartData, questionsCache };
}