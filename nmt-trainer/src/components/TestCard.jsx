// Заміна createCardHtml() — картка одного пройденого тесту в списку предмета.
export default function TestCard({ data, docId, collectionName, onReview }) {
  const ms = (data.attempt_timestamp?.seconds || 0) * 1000;
  const date =
    ms > 0
      ? new Date(ms).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Нещодавно';

  const totalQuestions = data.maxScore || data.testQuestionsQuantity || 0;
  const percent = totalQuestions > 0 ? Math.round((data.testResult / totalQuestions) * 100) : 0;

  const colorClass =
    percent >= 80
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : percent >= 50
      ? 'bg-amber-50 text-amber-700 border-amber-100'
      : 'bg-rose-50 text-rose-700 border-rose-100';

  return (
    <li className="test-item group bg-white p-6 rounded-[24px] border border-stone-100 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div>
        <div className="flex justify-between items-start mb-4">
          <span className={`${colorClass} px-3 py-1.5 rounded-xl text-[11px] font-extrabold border uppercase tracking-wider shadow-sm`}>
            {percent}%
          </span>
          <div className="text-[10px] text-stone-400 font-bold uppercase flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {date}
          </div>
        </div>

        <h4 className="text-[15px] font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors mb-2">
          {data.testName || 'Тест без назви'}
        </h4>

        <p className="text-[11px] text-slate-400 font-medium italic">
          Результат:{' '}
          <span className="text-slate-600 font-bold">
            {data.testResult} з {totalQuestions} балів
          </span>
        </p>
      </div>

      <div className="flex gap-2 mt-6 pt-4 border-t border-stone-50">
        <button
          onClick={() => onReview(collectionName, docId)}
          className="flex-1 px-3 py-2.5 bg-white text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-50 transition-all border border-indigo-100 active:scale-95"
        >
          Огляд
        </button>
        <a
          href={data.testUrl || data.testURl || '#'}
          className="flex-1 px-3 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-slate-200 text-center active:scale-95"
        >
          Повторити
        </a>
      </div>
    </li>
  );
}