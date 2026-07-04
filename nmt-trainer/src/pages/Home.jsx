import { Link } from 'react-router-dom';
import logo from '../assets/logo1.svg';
import { useAuth } from '../context/AuthContext';

const SUBJECTS = [
  {
    id: 'english',
    title: 'Англійська мова',
    path: '/tests/english',
    bgClass: 'bg-[#1a3a5a]',
    textClass: 'text-[#1f7baf]',
    mainImg: 'flag.png',
  },
  {
    id: 'math',
    title: 'Математика',
    path: '/tests/math',
    bgClass: 'bg-slate-800',
    textClass: 'text-[#AF1F1F]',
    mainImg: 'mathematics.png',
  },
];

export default function Home() {
  const { user, isAdmin, loading, logOut } = useAuth();

  return (
    <div className="bg-stone-100 min-h-screen">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="w-full flex items-center justify-between px-3 sm:px-5 py-2.5 min-h-[56px]">
          <Link to="/" className="shrink-0 mr-2 sm:mr-4">
            <img src={logo} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          </Link>

          {!loading && !user && (
            <div className="flex gap-2 shrink-0">
              <Link to="/signup" className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs uppercase transition-colors">
                Sign up
              </Link>
              <Link to="/login" className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-xs uppercase transition-colors">
                Log in
              </Link>
            </div>
          )}

          {!loading && user && (
            <div className="flex flex-nowrap items-center gap-2 sm:gap-4 ml-auto shrink-0">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-white rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide hover:bg-slate-700 transition-colors shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-yellow-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:block">Панель вчителя</span>
                  <span className="block sm:hidden">Адмін</span>
                </Link>
              )}

              <Link to="/cabinet" className="shrink-0 flex items-center justify-center transition-transform hover:scale-105">
                <img src="/people.png" className="w-7 h-7 sm:w-9 sm:h-9 object-contain" alt="Профіль" />
              </Link>

              <button
                onClick={logOut}
                className="cursor-pointer shrink-0 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-colors"
              >
                Вийти
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 text-center md:text-left uppercase tracking-tight font-sans">
          Оберіть предмет
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {SUBJECTS.map((subject) => (
            <Link
              key={subject.id}
              to={subject.path}
              className={`subject-card group relative overflow-hidden ${subject.bgClass} rounded-2xl shadow-lg flex flex-col h-full`}
            >
              <div className="relative flex-grow flex items-center justify-center min-h-[160px] md:min-h-[200px]">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                  <img
                    src={`/src/assets/${subject.mainImg}`}
                    alt={subject.title}
                    className="w-16 h-16 md:w-20 md:h-20 object-contain relative z-20 opacity-90 transition-transform group-hover:scale-110 duration-300"
                  />
                </div>
              </div>
              <div className="label-wrapper relative z-20 bg-white py-4 md:py-5 text-center w-full">
                <p className={`${subject.textClass} font-black uppercase tracking-widest text-[12px] md:text-sm`}>
                  {subject.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}