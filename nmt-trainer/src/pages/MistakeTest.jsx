import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import allTests from '../questionsData';

const SUBJECT_COLLECTIONS = {
  math: [
    'results_mathQuizDiagnosticNEW',
    ...Array.from({ length: 6 }, (_, i) => `results_HOMEWORKTHEME${i + 1}`),
    'results_HOMEWORKTHEME9', 'results_HOMEWORKTHEME10',
    ...Array.from({ length: 92 }, (_, i) => `results_HOMEWORKTHEME${i + 12}`),
    'results_KLACALKATHEME12',
    ...Array.from({ length: 4 }, (_, i) => `results_KLACALKATHEME${i + 17}`),
    ...Array.from({ length: 20 }, (_, i) => `results_LESSON${i + 19}THEME`),
    ...Array.from({ length: 2 }, (_, i) => `results_SUMMARYTEST${i + 1}`),
    ...Array.from({ length: 7 }, (_, i) => `results_PRACTICE${i + 1}`),
    'results_mistakes_math'
  ],
  eng: [
    ...Array.from({ length: 40 }, (_, i) => `results_ENGLISHWORDSQUIZ${i + 1}`)
  ]
};

const TITLE_MAP = {
  math: 'Математика: робота над помилками',
  eng: 'Англійська мова: робота над помилками'
};

export default function MistakeTest() {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject') || 'math';
  const idsParam = searchParams.get('ids') || '';
  const mistakeIds = idsParam ? idsParam.split(',').map(String) : [];

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuestions() {
      let localFound = [];
      const flatLocalTests = Array.isArray(allTests) ? allTests : Object.values(allTests).flat();

      flatLocalTests.forEach(t => {
        if (t && Array.isArray(t.questions)) {
          t.questions.forEach(q => {
            if (q && mistakeIds.includes(String(q.id))) {
              localFound.push(q);
            }
          });
        }
      });

      const localIds = localFound.map(q => String(q.id));
      const missingIds = mistakeIds.filter(id => !localIds.includes(id));
      let firestoreFound = [];

      if (missingIds.length > 0 && SUBJECT_COLLECTIONS[subject]) {
        try {
          const collectionsToScan = SUBJECT_COLLECTIONS[subject];
          const promises = collectionsToScan.map(col => getDocs(collection(db, col)));
          const snapshots = await Promise.all(promises);

          snapshots.forEach(snap => {
            snap.forEach(doc => {
              const data = doc.data();
              if (data && Array.isArray(data.questions_snapshots)) {
                data.questions_snapshots.forEach(q => {
                  if (q && missingIds.includes(String(q.id))) {
                    const alreadyExists = firestoreFound.some(f => String(f.id) === String(q.id));
                    if (!alreadyExists) firestoreFound.push(q);
                  }
                });
              }
            });
          });
        } catch (e) {
          console.error(e);
        }
      }

      let combined = [...localFound, ...firestoreFound];
      combined.sort((a, b) => mistakeIds.indexOf(String(a.id)) - mistakeIds.indexOf(String(b.id)));
      setQuestions(combined);
      setLoading(false);
    }

    loadQuestions();
  }, [subject, idsParam]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-stone-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Завантажуємо питання...</p>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 text-slate-900 font-sans min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-800">
            {TITLE_MAP[subject] || 'Робота над помилками'}
          </h1>
          <p className="text-stone-400 font-bold text-xs uppercase tracking-wider mt-2">Виправ всі свої факапи</p>
        </header>

        {questions.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-stone-100 shadow-sm text-center">
            <p className="text-sm font-black text-stone-400 uppercase tracking-wider">Питань для опрацювання не знайдено</p>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id || idx} className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black text-stone-400 uppercase tracking-wider border-b border-stone-50 pb-2">
                  <span>Завдання {idx + 1}</span>
                  <span>ID: {q.id}</span>
                </div>
                <div className="text-sm font-bold text-slate-800 leading-relaxed">
                  {q.question}
                </div>
                {q.options && (
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {Object.entries(q.options).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-3 bg-stone-50 hover:bg-stone-100/70 border border-stone-200/60 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 transition-colors">
                        <span className="w-5 h-5 flex items-center justify-center bg-white border border-stone-300 rounded-lg text-[10px] font-black text-stone-500 uppercase">{key}</span>
                        <span>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}