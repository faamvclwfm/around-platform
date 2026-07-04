import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthContext сам підхопить користувача і роль (onAuthStateChanged),
      // тож просто перенаправляємо в кабінет — AdminRoute/PrivateRoute
      // самі розберуться, куди пустити.
      navigate('/cabinet');
    } catch (err) {
      console.error('Помилка входу:', err.code, err.message);
      setError('Невірний email або пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen flex flex-col">
      <nav className="bg-white shadow-sm flex justify-between p-4 px-6 items-center">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <img src="/logo1.svg" alt="Logo" className="h-10 w-auto" />
        </Link>
      </nav>

      <main className="flex-grow flex flex-col items-center justify-start pt-10 px-4">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-6 inline-flex items-center text-sm font-medium transition-all group"
          >
            <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span>
            <span>Назад до головної</span>
          </Link>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center tracking-tight">
              Вхід у систему
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <label htmlFor="emailInput" className="text-xs font-semibold text-gray-400 uppercase ml-1">
                  Email
                </label>
                <input
                  type="email"
                  id="emailInput"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-red-200 outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="passwordInput" className="text-xs font-semibold text-gray-400 uppercase ml-1">
                  Пароль
                </label>
                <input
                  type="password"
                  id="passwordInput"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-red-200 outline-none transition-all"
                />
              </div>

              {error && (
                <p className="text-xs font-semibold text-red-500 text-center -mt-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-[#af1f1f] hover:bg-[#8b1818] disabled:opacity-60 text-white rounded-xl py-3 font-semibold transition-all shadow-[0_4px_15px_rgba(175,31,31,0.2)] hover:shadow-[0_6px_20px_rgba(175,31,31,0.4)]"
              >
                {loading ? 'Вхід...' : 'Увійти'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}