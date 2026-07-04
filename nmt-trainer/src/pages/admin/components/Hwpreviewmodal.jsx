import { useEffect, useRef } from 'react';
import { allTests } from '../../../data/questionsData';

function PreviewSection({ testId }) {
  const test = !Array.isArray(allTests) ? allTests?.[testId] : null;
  const questions = test?.questions || [];
  const title = test?.title || testId;

  if (questions.length === 0) {
    return (
      <div className="mb-6">
        <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-2 pb-2 border-b border-stone-100">
          {title} <span className="text-stone-400 font-normal">({testId})</span>
        </h4>
        <p className="text-xs text-stone-400 italic px-1">Питання для цього тесту не знайдено в базі questionsData.js.</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-3 pb-2 border-b border-stone-100">
        {title} <span className="text-stone-400 font-normal">({testId}) · {questions.length} завдань</span>
      </h4>
      {questions.map((q, i) => {
        const qText = q.text || q.question || '';
        const typeLabel = q.type === 'matching' ? 'Відповідність' : q.type === 'multiple' ? 'Декілька відповідей' : 'Один варіант';
        const optsCount = Array.isArray(q.options) ? q.options.length : 0;
        return (
          <div key={i} className="p-4 bg-stone-50 rounded-2xl mb-2.5 border border-stone-100">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{qText}</p>
                {q.image && <img src={q.image} className="max-h-40 rounded-xl border border-stone-100 mt-2" alt="" />}
                <span className="inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest text-stone-400 bg-white px-2 py-0.5 rounded-md border border-stone-100">
                  {typeLabel}
                  {optsCount ? ` · ${optsCount} варіантів` : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HwPreviewModal({ testIds = [], headerTitle, onClose }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current && typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(bodyRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    }
  }, [testIds]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex justify-center items-start pt-10 pb-10 overflow-y-auto px-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-stone-100 rounded-full text-stone-500 hover:bg-red-50 hover:text-red-500 transition-all z-10"
        >
          ✕
        </button>
        <div className="p-8 pb-4 border-b border-stone-50">
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Попередній перегляд ДЗ</p>
          <h3 className="text-xl font-black text-slate-800">{headerTitle || 'Домашнє завдання'}</h3>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
            Варіанти відповідей приховані · лише умови завдань
          </p>
        </div>
        <div ref={bodyRef} className="p-8 pt-6 max-h-[65vh] overflow-y-auto custom-scroll">
          {testIds.length === 0 ? (
            <p className="text-center text-stone-400 text-xs font-black uppercase tracking-widest py-10">Тести не обрано</p>
          ) : (
            testIds.map((id) => <PreviewSection key={id} testId={id} />)
          )}
        </div>
        <div className="p-6 bg-slate-50 text-center rounded-b-[2.5rem]">
          <button onClick={onClose} className="bg-slate-800 text-white px-8 py-2.5 rounded-2xl font-bold hover:bg-slate-700 transition-all text-sm">
            Закрити перегляд
          </button>
        </div>
      </div>
    </div>
  );
}