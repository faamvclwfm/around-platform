import { useEffect, useState } from 'react';
import { fetchSubscription, saveSubscription } from '../../../services/groupsService';

export default function SubscriptionModal({ studentUid, studentEmail, onClose }) {
  const [paid, setPaid] = useState(0);
  const [attended, setAttended] = useState(0);
  const [price, setPrice] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSubscription(studentUid)
      .then((sub) => {
        if (!active || !sub) return;
        setPaid(sub.paid || 0);
        setAttended(sub.attended || 0);
        setNextDate(sub.nextPayment || '');
        setPrice(sub.pricePerLesson || '');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [studentUid]);

  const sum = (Number(paid) || 0) * (Number(price) || 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSubscription(studentUid, {
        paid: parseInt(paid, 10) || 0,
        attended: parseInt(attended, 10) || 0,
        nextPayment: nextDate || '',
        pricePerLesson: parseInt(price, 10) || 0,
      });
      onClose();
    } catch (e) {
      alert('Помилка збереження: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-stone-400 hover:text-red-500 font-black text-xl transition-all"
        >
          ✕
        </button>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-1">Абонемент</h3>
        <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-6">{studentEmail}</p>

        {loading ? (
          <p className="text-stone-400 text-xs font-bold uppercase">Завантаження...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Проплачено занять
              </label>
              <input
                type="number"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Відвідано занять
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={attended}
                  onChange={(e) => setAttended(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-50"
                />
                <button
                  onClick={() => setAttended((v) => (Number(v) || 0) + 1)}
                  className="px-4 bg-indigo-100 text-indigo-600 font-black rounded-xl hover:bg-indigo-200 transition-all"
                >
                  +1
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Ціна за 1 заняття (грн)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="напр. 350"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-50"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 bg-indigo-50 rounded-xl border border-indigo-100">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Сума за абонемент</span>
              <span className="text-sm font-black text-indigo-700">{sum.toLocaleString('uk-UA')} грн</span>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Наступна оплата (до)
              </label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-50"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 mt-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all shadow-lg disabled:opacity-60"
            >
              {saving ? 'Збереження...' : 'Зберегти дані'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}