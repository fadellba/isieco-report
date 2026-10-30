import { Link } from 'react-router-dom';

const releaseUrl = import.meta.env.VITE_ANDROID_RELEASE_URL as string | undefined;

export function DownloadPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-eco-50 px-5 py-12 text-eco-900 sm:px-8">
      <section className="w-full max-w-3xl rounded-3xl border border-eco-100 bg-white p-8 shadow-xl shadow-eco-900/5 sm:p-12">
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-600">Application mobile</span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Télécharger ISI-Eco Report</h1>
        <p className="mt-5 text-base leading-7 text-slate-600">L'application mobile réunira les parcours citoyens et agents de terrain. Les fonctionnalités accessibles dépendront du compte connecté et des autorisations du serveur.</p>
        {releaseUrl ? (
          <a className="mt-8 inline-flex rounded-xl bg-eco-700 px-5 py-3 font-bold text-white transition hover:bg-eco-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eco-700" href={releaseUrl} rel="noreferrer">Télécharger l'APK Android</a>
        ) : (
          <div className="mt-8 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">Aucune version publique n'est disponible pour le moment. Le lien GitHub Releases sera configuré lors de la première publication Android.</div>
        )}
        <p className="mt-6 text-sm leading-6 text-slate-500">Installez uniquement un APK signé publié par le projet. Vérifiez la version et son empreinte SHA-256 avant installation.</p>
        <Link className="mt-6 inline-flex font-bold text-eco-700 underline-offset-4 hover:underline" to="/">Retour au site</Link>
      </section>
    </main>
  );
}
