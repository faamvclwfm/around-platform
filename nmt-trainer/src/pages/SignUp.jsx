import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Пароль має бути не менше 6 символів.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });

      // У старому скрипті роль/профіль у Firestore не створювались тут -
      // це робив check-admin.js/AuthContext, що читає users/{uid}.
      // Створюємо базовий документ користувача, щоб AuthContext
      // одразу міг визначити роль 'student' за замовчуванням.
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role: 'student',
        createdAt: serverTimestamp()
      });

      navigate('/cabinet');
    } catch (err) {
      console.error('Помилка реєстрації:', err.code, err.message);
      if (err.code === 'auth/email-already-in-use') {
        setError('Ця електронна пошта вже використовується.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Некоректний email.');
      } else {
        setError('Помилка: ' + err.message);
      }
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
              Створити акаунт
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label htmlFor="nameInput" className="text-xs font-semibold text-gray-400 uppercase ml-1">
                  Ім'я
                </label>
                <input
                  type="text"
                  id="nameInput"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше ім'я"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-red-200 outline-none transition-all"
                />
              </div>

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
                <p className="text-xs font-semibold text-red-500 text-center -mt-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-[#af1f1f] hover:bg-[#8b1818] disabled:opacity-60 text-white rounded-xl py-3 font-semibold transition-all shadow-[0_4px_15px_rgba(175,31,31,0.2)] hover:shadow-[0_6px_20px_rgba(175,31,31,0.4)]"
              >
                {loading ? 'Реєстрація...' : 'Зареєструватись'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}