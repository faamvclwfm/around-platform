import { useState } from 'react';
import {
  normalizeDayLessons,
  saveDayLessons,
  formatUkrDate,
  triggerWebhook,
} from '../../../services/groupsService';
import TransferLessonModal from './TransferLessonModal';

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Заплановано' },
  { value: 'milestone', label: 'Контроль' },
  { value: 'conducted', label: 'Проведено' },
  { value: 'rescheduled', label: 'Перенесено' },
  { value: 'cancelled', label: 'Скасовано' },
];

export default function DayScheduleAdminModal({ groupId, dateStr, schedule, onScheduleChange, onClose }) {
  const [lessons, setLessons] = useState(() => normalizeDayLessons(schedule, dateStr));
  const [newTime, setNewTime] = useState('');
  const [newStatus, setNewStatus] = useState('scheduled');
  const [transferIndex, setTransferIndex] = useState(null);

  const persist = async (nextLessons) => {
    const updatedSchedule = await saveDayLessons(groupId, schedule, dateStr, nextLessons);
    setLessons(nextLessons);
    onScheduleChange(updatedSchedule);
  };

  const handleAdd = async () => {
    if (!newTime) {
      alert('Будь ласка, оберіть час заняття!');
      return;
    }
    await persist([...lessons, { time: newTime, status: newStatus, hwTitle: '' }]);
    setNewTime('');
  };

  const handleDelete = async (index) => {
    if (!confirm('Видалити це заняття?')) return;
    const oldLesson = lessons[index];
    const next = lessons.filter((_, i) => i !== index);
    await persist(next);
    if (oldLesson && (oldLesson.status === 'scheduled' || oldLesson.status === 'rescheduled')) {
      triggerWebhook(groupId, dateStr, 'cancelled', oldLesson.time, null);
    }
  };

  const handleFieldChange = async (index, field, value) => {
    const oldTime = lessons[index].time;
    const oldStatus = lessons[index].status;
    const next = lessons.map((l, i) => (i === index ? { ...l, [field]: value } : l));
    await persist(next);

    if (field === 'time' && oldTime !== value && ['scheduled', 'rescheduled'].includes(oldStatus)) {
      triggerWebhook(groupId, dateStr, 'time_change', oldTime, value);
    }
    if (field === 'status' && value === 'cancelled' && oldStatus !== 'cancelled') {
      triggerWebhook(groupId, dateStr, 'cancelled', oldTime, null);
    }
  };

  const sortedLessons = [...lessons].sort((a, b) => a.time.localeCompare(b.time));

  const borderClassFor = (status) => {
    if (status === 'conducted') return 'border-emerald-300 bg-emerald-50';
    if (status === 'rescheduled') return 'border-amber-300 bg-amber-50';
    if (status === 'milestone') return 'border-slate-400 bg-slate-50';
    if (status === 'cancelled') return 'border-red-200 bg-red-50 opacity-75';
    return 'border-stone-200';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-100">
        <div className="p-6 sm:p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Розклад дня</h3>
            <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mt-1">{formatUkrDate(dateStr)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white border border-stone-200 rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-6 sm:p-8 max-h-[50vh] overflow-y-auto custom-scroll space-y-4">
          {sortedLessons.length === 0 ? (
            <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-100 border-dashed">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">На цей день занять не заплановано</p>
            </div>
          ) : (
            sortedLessons.map((lesson, index) => (
              <div key={index} className={`p-4 rounded-2xl border ${borderClassFor(lesson.status)} shadow-sm transition-all flex flex-col gap-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md shadow-sm">
                    Заняття №{index + 1}
                  </span>
                  <div className="flex gap-2">
                    {(lesson.status === 'scheduled' || lesson.status === 'rescheduled') && (
                      <button
                        onClick={() => setTransferIndex(index)}
                        className="text-indigo-500 hover:text-indigo-700 text-[10px] font-black uppercase tracking-widest bg-white px-2 py-1 rounded-md shadow-sm"
                      >
                        Перенести
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase tracking-widest bg-white px-2 py-1 rounded-md shadow-sm"
                    >
                      Видалити
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Змінити час</label>
                    <input
                      type="time"
                      defaultValue={lesson.time || '12:00'}
                      onBlur={(e) => e.target.value !== lesson.time && handleFieldChange(index, 'time', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Статус</label>
                    <select
                      value={lesson.status}
                      onChange={(e) => handleFieldChange(index, 'status', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Тема ДЗ (опціонально)</label>
                  <input
                    type="text"
                    defaultValue={lesson.hwTitle || ''}
                    placeholder="Наприклад: Тема 12. Похідна"
                    onBlur={(e) => e.target.value !== (lesson.hwTitle || '') && handleFieldChange(index, 'hwTitle', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 sm:p-8 bg-stone-50/50 border-t border-stone-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Додати нове заняття</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">Час</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">Статус</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-400 transition-all"
              >
                <option value="scheduled">Заплановано</option>
                <option value="milestone">Контроль знань</option>
                <option value="conducted">Проведено</option>
                <option value="rescheduled">Перенесено</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
          >
            + Додати заняття
          </button>
        </div>
      </div>

      {transferIndex !== null && (
        <TransferLessonModal
          groupId={groupId}
          schedule={schedule}
          oldDateStr={dateStr}
          index={transferIndex}
          onClose={() => setTransferIndex(null)}
          onTransferred={(updatedSchedule) => {
            setLessons(normalizeDayLessons(updatedSchedule, dateStr));
            onScheduleChange(updatedSchedule);
            setTransferIndex(null);
          }}
        />
      )}
    </div>
  );
}