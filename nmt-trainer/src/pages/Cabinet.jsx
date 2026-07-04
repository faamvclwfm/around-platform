import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import HomeworkPanel from '../components/HomeworkPanel';
import CalendarModal from '../components/CalendarModal';
import DayDetailModal from '../components/DayDetailModal';
import SubscriptionModal from '../components/SubscriptionModal';
import ReviewModal from '../components/ReviewModal';
import MistakesSection from '../components/MistakesSection';
import DetailedStats from '../components/DetailedStats';
import CircularProgress from '../components/CircularProgress';
import TestCard from '../components/TestCard';
import useStudentStats from '../hooks/useStudentStats';
import { SUBJECT_META } from '../utils/testCollections';

export default function Cabinet() {
  const { user, logOut } = useAuth();

  const [groupName, setGroupName] = useState('Завантаження...');
  const [hasGroup, setHasGroup] = useState(true);
  const [schedule, setSchedule] = useState(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [dayDetail, setDayDetail] = useState(null); // { dateStr, dayInfo }
  const [reviewTarget, setReviewTarget] = useState(null); // { collectionId, docId }

  const [activeHw, setActiveHw] = useState([]);
  const [archiveHw, setArchiveHw] = useState([]);
  const [hwTab, setHwTab] = useState('active');
  const [loadingHw, setLoadingHw] = useState(true);
  const [hwError, setHwError] = useState('');

  const [openHw, setOpenHw] = useState(null);

  const { loading: statsLoading, statsByCategory, mistakesByCat, streak, badgeList, chartData } =
    useStudentStats(user);

  useEffect(() => {
    if (!user) return;
    loadStudentInfo();
    loadHomeworks();
  }, [user]);

  async function loadStudentInfo() {
    try {
      const snap = await getDocs(query(collection(db, 'groups'), where('members', 'array-contains', user.uid)));
      if (!snap.empty) {
        const groupData = snap.docs[0].data();
        setGroupName(groupData.groupName);
        setSchedule(groupData.schedule || { recurring: [], exceptions: {} });
        setHasGroup(true);
      } else {
        setGroupName('Група не призначена');
        setSchedule(null);
        setHasGroup(false);
      }
    } catch (e) {
      console.error('Помилка завантаження інформації про учня:', e);
    }
  }

  async function loadHomeworks() {
    setLoadingHw(true);
    setHwError('');
    try {
      const groupSnap = await getDocs(query(collection(db, 'groups'), where('members', 'array-contains', user.uid)));
      if (groupSnap.empty) {
        setActiveHw([]);
        setArchiveHw([]);
        return;
      }
      const groupId = groupSnap.docs[0].id;

      const completedSnap = await getDocs(query(collection(db, 'completed_homeworks'), where('userId', '==', user.uid)));
      const completedIds = new Set(completedSnap.docs.map((d) => d.data().assignmentId));

      const assignmentsSnap = await getDocs(query(collection(db, 'assignments'), where('groupId', '==', groupId)));

      const active = [];
      const archive = [];

      assignmentsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const hwId = docSnap.id;
        const item = {
          id: hwId,
          title: data.title || data.hwTitle || 'Домашнє завдання',
          requiredTests: data.requiredTests || data.tests || [],
          optionalTests: data.optionalTests || [],
          theoryUrls: data.theoryUrls || [],
          isCompleted: completedIds.has(hwId)
        };
        (item.isCompleted ? archive : active).push(item);
      });

      setActiveHw(active);
      setArchiveHw(archive);
    } catch (e) {
      console.error('Помилка завантаження ДЗ:', e);
      setHwError('Помилка завантаження домашніх завдань: ' + e.message);
    } finally {
      setLoadingHw(false);
    }
  }

  const list = hwTab === 'active' ? activeHw : archiveHw;

  const totalCorrect = Object.values(statsByCategory).reduce((sum, s) => sum + s.correct, 0);
  const totalMax = Object.values(statsByCategory).reduce((sum, s) => sum + s.max, 0);

  return (
    <div className="bg-stone-50 min-h-screen flex flex-col">
      <nav className="bg-white shadow-sm flex justify-between p-4 px-6 items-center border-b border-stone-100 sticky top-0 z-[110]">
        <Link to="/">
          <img src="/logo1.svg" alt="Logo" className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubscription(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-violet-50 text-violet-600 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider hover:bg-violet-100 transition-all shadow-sm"
          >
            <span>💳</span>
            <span className="hidden sm:inline">Абонемент</span>
          </button>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider hover:bg-indigo-100 transition-all shadow-sm"
          >
            <span>📅</span>
            <span className="hidden sm:inline">Розклад</span>
          </button>
          <button onClick={logOut} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors">
            Вийти
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto w-full p-4 lg:p-8 flex-1">
        <div className="flex justify-start mb-6">
          <Link to="/" className="flex items-center gap-2 text-stone-400 hover:text-indigo-600 transition-colors font-bold text-sm uppercase tracking-widest">
            <span>←</span>
            <span>Головна</span>
          </Link>
        </div>

        <div
          id="informationCard"
          className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-stone-100 p-4 sm:p-6 lg:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12"
        >
          <div className="flex flex-col gap-6 sm:gap-8 w-full lg:w-2/3">
            <header>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1 leading-tight">
                Привіт, {user?.displayName || 'Учень'}
              </h1>
            </header>

            <div className="mb-2">
              {hasGroup && (
                <span className="px-4 py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200">
                  Учень
                </span>
              )}
              <h2 className="text-slate-800 text-xl sm:text-2xl font-black mt-3 tracking-tighter">{groupName}</h2>
              <p className="text-stone-400 text-[9px] sm:text-[10px] font-bold uppercase mt-1 tracking-widest">{user?.email}</p>
            </div>

            {/* Домашні завдання */}
            <div className="w-full pb-10">
              <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-stone-100 shadow-xl overflow-hidden">
                <div className="px-6 py-6 sm:px-10 sm:py-8 border-b border-stone-50 bg-stone-50/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tighter">Домашні завдання</h2>
                    <p className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">Актуальні та архівні роботи</p>
                  </div>
                  <div className="flex gap-2 bg-stone-100 p-1.5 rounded-2xl self-start">
                    <button
                      onClick={() => setHwTab('active')}
                      className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                        hwTab === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-stone-500 hover:text-slate-800'
                      }`}
                    >
                      Активні
                    </button>
                    <button
                      onClick={() => setHwTab('archive')}
                      className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                        hwTab === 'archive' ? 'bg-white text-slate-800 shadow-sm' : 'text-stone-500 hover:text-slate-800'
                      }`}
                    >
                      Архів
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-10">
                  {loadingHw ? (
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest text-center py-8">Завантаження домашніх завдань...</p>
                  ) : hwError ? (
                    <p className="text-red-500 text-xs font-bold p-4">{hwError}</p>
                  ) : !hasGroup ? (
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest text-center py-8">Вас не додано до жодної групи</p>
                  ) : list.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm font-bold text-stone-400">
                        {hwTab === 'active' ? '🎉 Усі домашні завдання виконано або нових ще не призначено!' : "Здані завдання тут з'являться після першої здачі."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {list.map((hw) => (
                        <div
                          key={hw.id}
                          className={`test-item bg-white border border-stone-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                            hw.isCompleted ? 'opacity-60' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`w-2 h-2 rounded-full ${hw.isCompleted ? 'bg-emerald-400' : 'bg-indigo-500 animate-pulse'}`} />
                              <span className={`text-[9px] font-black uppercase tracking-widest ${hw.isCompleted ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                {hw.isCompleted ? '✓ Здано' : 'Комплексне ДЗ'}
                              </span>
                            </div>
                            <h4 className="text-base font-black text-slate-800 leading-tight mb-2">{hw.title}</h4>
                            <div className="flex flex-wrap gap-2 my-5">
                              <div className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-100/60 px-3 py-1.5 rounded-xl shadow-sm">
                                <span className="text-xs">📋</span>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{hw.requiredTests.length} тестів</span>
                              </div>
                              {hw.theoryUrls.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-100/60 px-3 py-1.5 rounded-xl shadow-sm">
                                  <span className="text-xs">📚</span>
                                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">{hw.theoryUrls.length} консп.</span>
                                </div>
                              )}
                              {hw.optionalTests.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-100/60 px-3 py-1.5 rounded-xl shadow-sm">
                                  <span className="text-xs">⚡</span>
                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">+{hw.optionalTests.length} Дод.</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setOpenHw(hw)}
                            className={`w-full mt-2 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-center ${
                              hw.isCompleted
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                                : 'bg-slate-900 text-white hover:bg-indigo-600'
                            }`}
                          >
                            Детальніше
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Тести по предметах */}
            {statsLoading ? (
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest text-center py-8">Завантаження статистики...</p>
            ) : (
              Object.entries(SUBJECT_META).map(([subject, meta]) => (
                <SubjectSection
                  key={subject}
                  meta={meta}
                  items={statsByCategory[subject]?.items || []}
                  onReview={(collectionId, docId) => setReviewTarget({ collectionId, docId })}
                />
              ))
            )}
          </div>

          {/* Статистика (сайдбар) */}
          <div className="w-full lg:w-1/3 lg:border-l border-stone-100 lg:pl-12">
            <div className="sticky top-24 flex flex-col items-center gap-8">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Статистика</h2>
              <div className="flex flex-col items-center gap-4">
                <CircularProgress correct={totalCorrect} total={totalMax} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Загальна успішність</p>
              </div>

              <div className="w-full bg-stone-50 rounded-3xl p-6 border border-stone-100">
                <div className="space-y-5">
                  {Object.entries(SUBJECT_META).map(([subject, meta]) => {
                    const s = statsByCategory[subject] || { correct: 0, max: 0 };
                    const p = s.max > 0 ? Math.round((s.correct / s.max) * 100) : 0;
                    const colorClass = `bg-${meta.color}-500`;
                    return (
                      <div key={subject} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                          <span className="text-slate-500">{meta.label}</span>
                          <span>{p}%</span>
                        </div>
                        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                          <div className={`${colorClass} h-full transition-all duration-1000`} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <MistakesSection mistakesByCat={mistakesByCat} />

        <DetailedStats streak={streak} badgeList={badgeList} chartData={chartData} userUid={user?.uid} />
      </main>

      {openHw && <HomeworkPanel hw={openHw} onClose={() => setOpenHw(null)} />}

      {showCalendar && (
        <CalendarModal schedule={schedule} onClose={() => setShowCalendar(false)} onDayClick={(dateStr, dayInfo) => setDayDetail({ dateStr, dayInfo })} />
      )}

      {dayDetail && <DayDetailModal dateStr={dayDetail.dateStr} dayInfo={dayDetail.dayInfo} onClose={() => setDayDetail(null)} />}

      {showSubscription && <SubscriptionModal user={user} onClose={() => setShowSubscription(false)} />}

      {reviewTarget && (
        <ReviewModal collectionId={reviewTarget.collectionId} docId={reviewTarget.docId} onClose={() => setReviewTarget(null)} />
      )}
    </div>
  );
}

// Один розділ "Тести з ..." зі списком карток (заміна #mathTests/#englishTests/... секцій)
function SubjectSection({ meta, items, onReview }) {
  return (
    <div className="test-section">
      <h3 className="flex items-center gap-2 text-[11px] font-black text-indigo-400 mb-6 uppercase tracking-[0.2em]">
        Тести з {meta.label.toLowerCase()}
      </h3>
      <div className="custom-scroll max-h-[600px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-stone-300 italic text-xs p-4">Тестів не знайдено</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map(({ data, docId, collectionName }) => (
              <TestCard key={`${collectionName}_${docId}`} data={data} docId={docId} collectionName={collectionName} onReview={onReview} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}