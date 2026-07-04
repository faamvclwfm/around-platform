import { useState } from 'react';

export default function GroupMembersList({ group, onAddMember, onRemoveMember, onOpenSubscription }) {
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const emails = group?.memberEmails || [];
  const members = group?.members || [];

  const handleAdd = async () => {
    if (!email.trim()) {
      alert('Введіть email');
      return;
    }
    setAdding(true);
    try {
      await onAddMember(email.trim());
      setEmail('');
    } catch (e) {
      alert(e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="lg:col-span-4 bg-stone-50/40 border border-stone-100 rounded-[2rem] p-6">
      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Склад класу</h4>

      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Введіть email..."
          className="flex-1 px-4 py-3 bg-white border border-stone-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-50 transition-all"
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="px-4 bg-slate-900 text-white text-xs font-black uppercase rounded-xl hover:bg-slate-700 transition-all disabled:opacity-60"
        >
          +
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll pr-1">
        {emails.length === 0 ? (
          <p className="text-stone-400 text-[11px] font-bold uppercase">У цій групі ще немає учнів</p>
        ) : (
          emails.map((em, index) => {
            const mId = members[index];
            return (
              <div key={mId} className="flex justify-between items-center bg-stone-50 p-3.5 rounded-2xl border border-stone-100/50 mb-2">
                <span className="text-xs font-bold text-slate-700 truncate mr-2">{em}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onOpenSubscription(mId, em)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all"
                  >
                    💳 Абонемент
                  </button>
                  <button
                    onClick={() => onRemoveMember(mId, em)}
                    className="text-stone-400 hover:text-red-500 text-xs transition-all px-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}