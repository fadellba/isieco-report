import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';

const releaseUrl = import.meta.env.VITE_ANDROID_RELEASE_URL as string | undefined;

export function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" aria-label="ISIECO, retour à l'accueil">
          <BrandMark size="md" />
        </Link>
        <Link
          to="/connexion"
          className="text-xs font-bold text-slate-700 hover:text-emerald-700 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm transition"
        >
          Espace professionnel →
        </Link>
      </header>

      <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* Visual column */}
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 p-10 flex flex-col items-center justify-center text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(52,211,153,0.15),transparent)]" />
            <div className="w-24 h-48 bg-emerald-900/80 border-2 border-emerald-400/40 rounded-2xl shadow-2xl relative flex flex-col items-center justify-between p-3 mb-6">
              <div className="w-8 h-1 bg-emerald-400/30 rounded-full" />
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                <span className="text-emerald-300 font-black text-xs">IS</span>
              </div>
              <div className="w-4 h-4 rounded-full border border-emerald-400/40" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              Android Preview APK
            </span>
            <p className="text-xs text-emerald-100/70 mt-1 max-w-xs">
              Citoyens et agents de terrain sur une application mobile unifiée.
            </p>
          </div>

          {/* Action column */}
          <div className="p-8 sm:p-12 flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">
              Application Mobile
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              ISIECO sur le terrain.
            </h1>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              Signalez un dépôt en quelques secondes avec géolocalisation et photo, ou suivez vos
              missions d'intervention en temps réel.
            </p>

            <div className="mt-8">
              {releaseUrl ? (
                <a
                  href={releaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition"
                >
                  <span>Télécharger l'APK Android</span>
                  <span>↓</span>
                </a>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs font-bold text-slate-800">
                    Version interne en cours de test
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    L'APK de prévisualisation est généré via GitHub Actions et distribué via les
                    releases internes.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
              <span className="text-emerald-600 text-base">🛡</span>
              <span className="text-[11px] text-slate-400 leading-normal">
                Authentification sécurisée par Supabase Auth et autorisations résolues par l'API.
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto px-6 py-6 text-center text-xs text-slate-400">
        © ISIECO · Ensemble pour une ville plus propre
      </footer>
    </div>
  );
}
