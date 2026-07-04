import { useEffect, useRef } from 'react';

export default function FlaggedQuestionsModal({ questions = [], onClose }) {
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
  }, [questions]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex justify-center items-start pt-10 pb-10 overflow-y-auto px-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative p-8">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-stone-100 rounded-full text-stone-500 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          ✕
        </button>
        <h3 className="text-xl font-black text-slate-800 mb-6 uppercase">Складні питання учня</h3>
        <div ref={bodyRef} className="max-h-[60vh] overflow-y-auto custom-scroll pr-2">
          {questions.map((q, i) => (
            <div key={i} className="p-4 bg-stone-50 rounded-xl mb-3 border border-stone-200">
              <p className="font-bold text-slate-800 mb-3">
                {i + 1}. {q.text || q.question || ''}
              </p>
              <div className="space-y-1.5">
                {(q.options || []).map((opt, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border border-stone-300 flex items-center justify-center ${
                        q.correct == j ? 'bg-emerald-500 border-emerald-500' : ''
                      }`}
                    >
                      {q.correct == j && <span className="text-[10px] text-white">✓</span>}
                    </div>
                    <p className={`text-xs ${q.correct == j ? 'font-black text-emerald-700' : 'text-slate-600'}`}>{opt}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}