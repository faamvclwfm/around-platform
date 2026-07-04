import { useMemo, useState } from 'react';
import { allTests } from '../../../data/questionsData';
import { categorizeTests, THEORY_FILES, publishHomework } from '../../../services/groupsService';
import HwPreviewModal from './HwPreviewModal';

function TestCheckboxList({ items, checked, onToggle, highlightGenerated }) {
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item) => (
        <label
          key={item.id}
          className={`flex items-center gap-3 p-2.5 border rounded-xl cursor-pointer transition-all ${
            highlightGenerated && item.generated
              ? 'bg-rose-50 border-rose-200'
              : 'bg-stone-50 hover:bg-white border-transparent hover:border-stone-100'
          }`}
        >
          <input
            type="checkbox"
            checked={checked.includes(item.id)}
            onChange={() => onToggle(item.id)}
            className="rounded text-indigo-600 focus:ring-indigo-50 w-4 h-4"
          />
          <span className="text-[11px] font-bold text-slate-700">
            {item.title} <span className="text-[10px] font-normal text-stone-400">({item.id})</span>
            {highlightGenerated && item.generated && (
              <span className="text-[10px] font-black text-rose-500"> (Згенеровано)</span>
            )}
          </span>
        </label>
      ))}
    </>
  );
}

export default function AssignHomeworkModal({ groupId, prefill, onClose, onPublished }) {
  const buckets = useMemo(() => categorizeTests(allTests), []);
  const [title, setTitle] = useState(prefill?.title || '');
  const [checked, setChecked] = useState(prefill?.testIds || []);
  const [theoryChecked, setTheoryChecked] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [previewIds, setPreviewIds] = useState(null);

  const generatedItem = prefill?.generatedTest;
  const requiredItems = generatedItem
    ? [{ ...generatedItem, generated: true }, ...buckets.required]
    : buckets.required;

  const toggleTest = (id) => {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleTheory = (idx) => {
    setTheoryChecked((prev) => (prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]));
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('Введіть назву завдання');
      return;
    }
    if (checked.length === 0) {
      alert('Оберіть хоча б один тест');
      return;
    }
    setPublishing(true);
    try {
      await publishHomework(groupId, {
        title: title.trim(),
        requiredTests: checked,
        theoryFiles: theoryChecked,
      });
      onPublished();
    } catch (e) {
      alert('Помилка: ' + e.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl my-8 max-h-[90vh] overflow-y-auto custom-scroll">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-50">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Конструктор домашнього завдання</h3>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Оберіть теми, тести та конспекти</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-red-500 font-black text-xl transition-all">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Назва домашнього комплексу</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наприклад: Тема 4. Trigonometric Equations"
              className="w-full px-5 py-3.5 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 ring-indigo-50 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-3 pb-2 border-b border-stone-100">1. Обов'язкові тести</h4>
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scroll pr-1">
                <TestCheckboxList items={requiredItems} checked={checked} onToggle={toggleTest} highlightGenerated />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-3 pb-2 border-b border-stone-100">2. Додаткові тести (DOD)</h4>
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scroll pr-1">
                <TestCheckboxList items={buckets.optional} checked={checked} onToggle={toggleTest} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-black text-sky-500 uppercase tracking-widest mb-3 pb-2 border-b border-sky-100">3. Проміжні тести (INTERMEDIATE)</h4>
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scroll pr-1">
                <TestCheckboxList items={buckets.intermediate} checked={checked} onToggle={toggleTest} />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 pb-2 border-b border-emerald-100">4. Підсумкові тести (SUMMARY)</h4>
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scroll pr-1">
                <TestCheckboxList items={buckets.summary} checked={checked} onToggle={toggleTest} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3">5. Підв'язати конспекти теорії</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEORY_FILES.map((t, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-100 rounded-xl cursor-pointer hover:bg-white transition-all text-[11px] font-bold text-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={theoryChecked.includes(idx)}
                    onChange={() => toggleTheory(idx)}
                    className="text-indigo-600 rounded w-3.5 h-3.5"
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-stone-100 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={() => {
              if (checked.length === 0) {
                alert('Оберіть хоча б один тест, щоб побачити попередній перегляд');
                return;
              }
              setPreviewIds(checked);
            }}
            className="px-6 py-3.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
          >
            👁 Попередній перегляд
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3.5 border border-stone-100 text-stone-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-50 transition-all"
          >
            Скасувати
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg disabled:opacity-60"
          >
            {publishing ? 'Публікація...' : 'Опублікувати завдання'}
          </button>
        </div>
      </div>

      {previewIds && <HwPreviewModal testIds={previewIds} headerTitle={title.trim()} onClose={() => setPreviewIds(null)} />}
    </div>
  );
}