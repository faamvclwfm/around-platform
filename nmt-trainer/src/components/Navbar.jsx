import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, isAdmin, loading, logOut } = useAuth();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="w-full flex items-center justify-between px-3 sm:px-5 py-2.5 min-h-[56px]">
        <Link to="/" className="shrink-0 mr-2 sm:mr-4">
          <img src="/logo1.svg" alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
        </Link>

        {!user && !loading && (
          <div className="flex gap-2 shrink-0">
            <Link to="/signup" className="auth-btn">Sign up</Link>
            <Link to="/login" className="auth-btn">Log in</Link>
          </div>
        )}

        {user && (
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

            <Link to="/personal-cabinet" className="shrink-0 flex items-center justify-center transition-transform hover:scale-105">
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
  );
}