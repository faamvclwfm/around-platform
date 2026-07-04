import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Заміна loadSubscription() + #studentSubModal з personalCabinet.html.
export default function SubscriptionModal({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sub, setSub] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) throw new Error('no doc');
        if (!cancelled) setSub(snap.data().subscription || null);
      } catch (e) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const paid = sub?.paid || 0;
  const attended = sub?.attended || 0;
  const left = Math.max(0, paid - attended);
  const percent = paid > 0 ? Math.round((attended / paid) * 100) : 0;

  let badge = { text: 'Не заповнено', cls: 'bg-stone-100 text-stone-400' };
  if (sub) {
    if (left <= 0) badge = { text: '⚠️ Поповни абонемент', cls: 'bg-rose-100 text-rose-600' };
    else if (left <= 2) badge = { text: `Залишилось ${left}`, cls: 'bg-amber-100 text-amber-600' };
    else badge = { text: 'Активний', cls: 'bg-emerald-100 text-emerald-600' };
  }
  if (error) badge = { text: 'Помилка', cls: 'bg-rose-100 text-rose-500' };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border border-indigo-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-white rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500 transition-all font-black text-sm shadow-sm border border-stone-100 z-10"
        >
          ✕
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💳</span>
            <span className="text-sm font-black text-indigo-700 uppercase tracking-widest">Мій абонемент</span>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-stone-100 shadow-sm ${badge.cls}`}>
            {badge.text}
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && !error && sub && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/80 rounded-2xl p-4 text-center border border-indigo-50 shadow-sm">
                <div className="text-2xl font-black text-indigo-600">{paid}</div>
                <div className="text-[9px] font-black text-stone-400 uppercase tracking-wider mt-1">Оплачено</div>
              </div>
              <div className="bg-white/80 rounded-2xl p-4 text-center border border-indigo-50 shadow-sm">
                <div className="text-2xl font-black text-slate-700">{attended}</div>
                <div className="text-[9px] font-black text-stone-400 uppercase tracking-wider mt-1">Відвідано</div>
              </div>
              <div className="bg-white/80 rounded-2xl p-4 text-center border border-emerald-50 shadow-sm">
                <div className="text-2xl font-black text-emerald-600">{left}</div>
                <div className="text-[9px] font-black text-stone-400 uppercase tracking-wider mt-1">Залишилось</div>
              </div>
            </div>

            <div className="mb-5 p-4 bg-white/60 rounded-2xl border border-indigo-50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Використано занять</span>
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{percent}%</span>
              </div>
              <div className="w-full bg-indigo-50/50 h-3 rounded-full overflow-hidden shadow-inner border border-indigo-100/30">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/80 rounded-2xl border border-indigo-50 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">Наступна оплата</span>
              </div>
              <span className="text-xs font-black text-slate-800 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100">
                {sub.nextPayment || 'не вказано'}
              </span>
            </div>
          </div>
        )}

        {!loading && (error || !sub) && (
          <div className="text-center py-8 bg-white/50 rounded-2xl border border-indigo-50 mt-2">
            <span className="text-3xl mb-2 block">📭</span>
            <p className="text-xs font-bold text-stone-400">Абонемент ще не заповнений вчителем</p>
          </div>
        )}
      </div>
    </div>
  );
}