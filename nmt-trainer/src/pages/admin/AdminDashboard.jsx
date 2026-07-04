import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
const PAGE_SIZE = 50;

const genRange = (prefix, start, end, suffix = '') =>
  Array.from({ length: end - start + 1 }, (_, i) => `${prefix}${start + i}${suffix}`);

const COLLECTIONS_TO_SCAN = [
  'results_mathQuizDiagnosticNEW',
  'results_test_completed',
  ...genRange('results_HOMEWORKTHEME', 1, 6),
  ...genRange('results_HOMEWORKTHEME', 9, 10),
  ...genRange('results_HOMEWORKTHEME', 12, 41),
  'results_KLACALKATHEME12',
  ...genRange('results_KLACALKATHEME', 17, 20),
  ...genRange('results_LESSON', 19, 28, 'THEME'),
  ...genRange('results_HISTORYTEST', 1, 2),
  ...genRange('results_NMTTEST', 1, 5),
  ...genRange('results_INTERMEDIATETEST', 1, 2),
  ...genRange('results_ENGLISHWORDSQUIZ', 1, 26),
  ...genRange('results_SUMMARYTEST', 1, 2),
  ...genRange('results_PRACTICE', 1, 7),
  ...genRange('results_UKRAINIAN', 1, 12),
  'results_mistakes_math',
  'results_mistakes_eng',
  'results_mistakes_hist',
  'results_mistakes_ukr',
];

export function AdminDashboard() {
  const [allResults, setAllResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const snapshots = await Promise.all(
          COLLECTIONS_TO_SCAN.map((col) =>
            getDocs(query(collection(db, col), orderBy('attempt_timestamp', 'desc')))
          )
        );

        const results = [];
        snapshots.forEach((snap) => {
          snap.forEach((doc) => results.push({ ...doc.data(), id: doc.id }));
        });

        results.sort((a, b) => (b.attempt_timestamp?.seconds || 0) - (a.attempt_timestamp?.seconds || 0));
        setAllResults(results);
      } catch (e) {
        console.error('Dashboard Error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return allResults;
    return allResults.filter(
      (r) =>
        (r.userEmail || '').toLowerCase().includes(term) ||
        (r.testName || '').toLowerCase().includes(term)
    );
  }, [allResults, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <nav className="flex justify-between items-center px-10 py-6 bg-white border-b border-stone-100 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡️</span>
          <h1 className="text-xl font-black tracking-tighter uppercase">
            Admin <span className="text-indigo-600">Portal</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <Link
            to="/admin/groups"
            className="text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-600 transition-all"
          >
            Керування класами
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-10 py-12">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Панель керування</h2>
            <p className="text-stone-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Статистика успішності</p>
          </div>
          <div className="bg-white px-8 py-5 rounded-[2rem] border border-stone-100 shadow-sm text-center">
            <span className="block text-2xl font-black text-indigo-600">{allResults.length}</span>
            <span className="text-[8px] font-black uppercase text-stone-400 tracking-widest">Активностей</span>
          </div>
        </header>

        <div className="bg-white rounded-[3rem] border border-stone-100 shadow-xl overflow-hidden">
          <div className="px-10 py-8 border-b border-stone-50 flex justify-between items-center bg-stone-50/20">
            <h2 className="text-xl font-black text-slate-800">Останні активності</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Пошук учня..."
              className="px-6 py-3 bg-white border border-stone-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 ring-indigo-50 transition-all w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/50 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                  <th className="px-10 py-4">Учень</th>
                  <th className="px-10 py-4">Тест</th>
                  <th className="px-10 py-4 text-center">Результат</th>
                  <th className="px-10 py-4">Час</th>
                  <th className="px-10 py-4">Дата</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading && (
                  <tr><td colSpan={5} className="py-20 text-center animate-pulse font-black text-stone-400 text-xs uppercase tracking-widest">Синхронізація результатів...</td></tr>
                )}
                {error && (
                  <tr><td colSpan={5} className="py-20 text-center text-red-400 font-bold">ПОМИЛКА ЗАВАНТАЖЕННЯ: {error}</td></tr>
                )}
                {!loading && !error && pageItems.length === 0 && (
                  <tr><td colSpan={5} className="py-20 text-center text-stone-300 font-bold uppercase text-[10px]">Жодних активностей не знайдено</td></tr>
                )}
                {!loading && !error && pageItems.map((res) => {
                  const date = res.attempt_timestamp
                    ? new Date(res.attempt_timestamp.seconds * 1000).toLocaleDateString('uk-UA')
                    : '--';
                  const maxScore = res.maxScore || res.testQuestionsQuantity || 0;
                  const scorePercent = maxScore > 0 ? Math.round((res.testResult / maxScore) * 100) : 0;
                  const statusColor = scorePercent >= 80 ? 'text-emerald-500' : scorePercent >= 50 ? 'text-amber-500' : 'text-rose-500';

                  return (
                    <tr key={res.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-all">
                      <td className="px-10 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{res.userEmail || 'Учень'}</span>
                          <span className="text-[9px] text-stone-300 font-mono tracking-tighter uppercase">UID: {(res.userId || '').slice(0, 6)}...</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-xs font-black text-slate-500 uppercase tracking-tighter">{res.testName || 'Без назви'}</td>
                      <td className="px-10 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full bg-white border border-stone-100 font-black ${statusColor}`}>
                          {res.testResult}/{maxScore}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-xs font-bold text-stone-400 font-mono">{res.timeSpent || '--'}</td>
                      <td className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase">{date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && !error && filtered.length > 0 && (
            <div className="flex items-center justify-between px-10 py-5 border-t border-stone-50 bg-stone-50/30">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} з {filtered.length} активностей
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${page === 0 ? 'border-stone-100 text-stone-300 cursor-not-allowed' : 'border-stone-200 text-slate-700 hover:bg-stone-100'}`}
                >
                  ← Назад
                </button>
                <span className="px-4 py-2 text-[10px] font-black text-slate-500">{page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${page >= totalPages - 1 ? 'border-stone-100 text-stone-300 cursor-not-allowed' : 'border-stone-200 text-slate-700 hover:bg-stone-100'}`}
                >
                  Далі →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}