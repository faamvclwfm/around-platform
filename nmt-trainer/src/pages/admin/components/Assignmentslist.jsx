export default function AssignmentsList({ assignments, loading, error, onCreate, onPreview, onMonitor, onDelete }) {
  if (loading) return <p className="text-stone-400 text-xs font-bold uppercase">Завантаження...</p>;
  if (error) return <p className="text-red-400 text-xs">Помилка: {error}</p>;

  if (assignments.length === 0) {
    return (
      <div className="text-center py-6 border-2 border-dashed border-stone-100 rounded-[2rem] p-6 bg-stone-50/30">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Комплексних завдань немає</p>
        <button
          onClick={onCreate}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all"
        >
          Створити комплексне ДЗ
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-48 overflow-y-auto custom-scroll pr-1 mb-8">
      {assignments.map((data) => {
        const tCount =
          (data.requiredTests?.length || 0) + (data.optionalTests?.length || 0) || data.tests?.length || 0;
        const thCount = data.theoryFiles?.length || data.theoryUrls?.length || 0;
        const displayTitle = data.title || data.hwTitle || 'Без назви';

        return (
          <div
            key={data.id}
            className="bg-stone-50/60 border border-stone-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">{displayTitle}</h5>
              <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                Тестів: {tCount} | Конспектів: {thCount}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPreview(data.id)}
                className="px-3 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 font-black rounded-lg text-[9px] uppercase hover:bg-indigo-100 transition-all"
              >
                👁 Перегляд
              </button>
              <button
                onClick={() => onMonitor(data.id, displayTitle)}
                className="px-3 py-2 bg-white border border-stone-200 text-stone-600 font-black rounded-lg text-[9px] uppercase hover:bg-stone-100 transition-all"
              >
                Моніторинг
              </button>
              <button onClick={() => onDelete(data.id)} className="text-red-400 hover:text-red-600 text-xs px-2">
                🗑️
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}