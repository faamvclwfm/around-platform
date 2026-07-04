import { Link } from 'react-router-dom';
import { SUBJECT_META } from '../utils/testCollections';

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' }
};

// Заміна renderMistakesSection() — картки "робота над помилками" по кожному предмету.
export default function MistakesSection({ mistakesByCat }) {
  return (
    <div className="max-w-7xl mx-auto pb-10 w-full">
      <div className="mt-12 mb-8">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <span className="p-2 bg-rose-100 text-rose-600 rounded-lg">🚀</span>Робота над помилками
        </h3>
        <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-2">
          Завдання, де ти припустився помилки в останній спробі
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(SUBJECT_META).map(([subject, meta]) => {
          const ids = mistakesByCat?.[subject] || [];
          const count = ids.length;
          const isDisabled = count === 0;
          const c = COLOR_MAP[meta.color];

          return (
            <div
              key={subject}
              className={`bg-white border border-stone-100 p-6 rounded-[2.5rem] shadow-sm flex flex-col justify-between transition-all ${
                isDisabled ? 'opacity-50' : 'hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl">{meta.icon}</span>
                  <span className={`${c.bg} ${c.text} px-3 py-1 rounded-full text-[10px] font-black border ${c.border}`}>
                    {count} ПИТАНЬ
                  </span>
                </div>
                <h4 className="font-black text-slate-800 text-lg mb-2">{meta.label}</h4>
              </div>

              {!isDisabled ? (
                <Link
                  to={`/mistakes?subject=${subject}&ids=${ids.join(',')}`}
                  className="w-full mt-4 py-3 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all text-center border border-rose-100"
                >
                  Почати роботу
                </Link>
              ) : (
                <div className="w-full mt-4 py-3 bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-widest rounded-xl text-center border border-stone-100">
                  Помилок немає
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}