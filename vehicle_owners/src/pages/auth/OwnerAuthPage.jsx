import { Link, useLocation } from 'react-router-dom';
import { ownerLandingI18n } from '../../features/owner-landing/data/ownerLandingI18n';

export default function OwnerAuthPage() {
  const { pathname } = useLocation();
  const isLogin = pathname.endsWith('/login');

  const language = 'vi';
  const t = ownerLandingI18n[language];

  return (
    <section className="grid min-h-screen place-items-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <article className="w-full max-w-xl rounded-2xl border border-blue-200 bg-white p-6 text-center shadow-lg shadow-slate-300/30">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isLogin ? t.authPlaceholder.loginTitle : t.authPlaceholder.registerTitle}
        </h1>
        <p className="mt-3 text-slate-600">
          {isLogin ? t.authPlaceholder.loginDescription : t.authPlaceholder.registerDescription}
        </p>
        <Link className="mt-4 inline-block font-bold text-blue-700 hover:underline" to="/owner">
          {t.authPlaceholder.back}
        </Link>
      </article>
    </section>
  );
}
