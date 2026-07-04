import { useState } from 'react';
import { transferLesson } from '../../../services/groupsService';

export default function TransferLessonModal({ groupId, schedule, oldDateStr, index, onClose, onTransferred }) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('16:00');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!newDate || !newTime) {
      alert('Заповніть нову дату та час');
      return;
    }
    if (newDate === oldDateStr) {
      alert("Для зміни часу в межах одного дня використовуйте інпут 'Змінити час' у картці заняття.");
      return;
    }

    setSaving(true);
    try {
      const updatedSchedule = await transferLesson(groupId, schedule, oldDateStr, index, newDate, newTime);
      onTransferred(updatedSchedule);
    } catch (e) {
      alert('Помилка переносу: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-stone-50 rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500 transition-all text-sm font-bold"
        >
          ✕
        </button>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-6">Перенести заняття</h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Нова дата</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Новий час</label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ring-indigo-50"
            />
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all shadow-lg disabled:opacity-60"
        >
          {saving ? 'Обробка...' : 'Перенести'}
        </button>
      </div>
    </div>
  );
}