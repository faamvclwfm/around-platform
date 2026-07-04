import { useState } from 'react';

const DAYS = [
  { value: 1, label: 'Понеділок' },
  { value: 2, label: 'Вівторок' },
  { value: 3, label: 'Середа' },
  { value: 4, label: 'Четвер' },
  { value: 5, label: "П'ятниця" },
  { value: 6, label: 'Субота' },
  { value: 7, label: 'Неділя' },
];

export default function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [days, setDays] = useState(() =>
    Object.fromEntries(DAYS.map((d) => [d.value, { checked: false, time: '16:00' }]))
  );
  const [saving, setSaving] = useState(false);

  const toggleDay = (value) => {
    setDays((prev) => ({ ...prev, [value]: { ...prev[value], checked: !prev[value].checked } }));
  };

  const setDayTime = (value, time) => {
    setDays((prev) => ({ ...prev, [value]: { ...prev[value], time } }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Введіть назву групи');
      return;
    }
    const recurring = DAYS.filter((d) => days[d.value].checked).map((d) => ({
      day: d.value,
      time: days[d.value].time || '16:00',
    }));

    setSaving(true);
    try {
      await onCreate(name.trim(), recurring);
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scroll">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Нова група</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-red-500 font-black text-xl transition-all">
            ✕
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Назва класу (напр., 11-А Математика)"
          className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 ring-indigo-50 transition-all mb-6"
        />

        <div className="space-y-3 mb-6 bg-stone-50 p-5 rounded-3xl border border-stone-100">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Розклад занять</label>
          <div className="grid grid-cols-2 gap-2">
            {DAYS.map((d) => (
              <label
                key={d.value}
                className="flex flex-col p-3 bg-white border border-stone-200 rounded-2xl cursor-pointer hover:border-slate-900 transition-all"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-black text-slate-700">{d.label}</span>
                  <input
                    type="checkbox"
                    checked={days[d.value].checked}
                    onChange={() => toggleDay(d.value)}
                    className="rounded text-[#AF1F1F] w-4 h-4 focus:ring-0"
                  />
                </div>
                <input
                  type="time"
                  value={days[d.value].time}
                  onChange={(e) => setDayTime(d.value, e.target.value)}
                  className="text-xs font-bold bg-stone-50 px-2 py-1 rounded-lg border-none"
                />
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all shadow-lg disabled:opacity-60"
        >
          {saving ? 'Збереження...' : 'Зберегти групу'}
        </button>
      </div>
    </div>
  );
}