import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AppNotification {
  id: string;
  actionCode: string;
  entityType: string;
  entityId: string;
  dossierId: string | null;
  occurredAt: string;
  title: string;
  message: string;
}

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export function NotificationCenterPopover({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.request<AppNotification[]>('/notifications?limit=40'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section
      role="dialog"
      aria-label="Centre de notifications"
      className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Notifications</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">Événements concernant vos habilitations et vos dossiers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => void load()} className="text-[10px] font-bold text-emerald-700">Actualiser</button>
          <button type="button" onClick={onClose} aria-label="Fermer les notifications" className="text-lg leading-none text-slate-400 hover:text-slate-800">×</button>
        </div>
      </div>

      <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-400">Chargement des notifications…</div>
        ) : error ? (
          <div role="alert" className="p-4">
            <p className="text-xs text-rose-700">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-2 text-xs font-bold text-rose-800 underline">Réessayer</button>
          </div>
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <article key={item.id} className="px-4 py-3 transition hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                  <span className="shrink-0 text-[9px] font-semibold text-emerald-800">{item.actionCode.replaceAll('_', ' ')}</span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">{item.message}</p>
                <p className="mt-2 text-[10px] text-slate-400">
                  {Number.isNaN(new Date(item.occurredAt).getTime()) ? 'Date inconnue' : dateTime.format(new Date(item.occurredAt))}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-7 text-center">
            <span className="text-2xl" aria-hidden="true">🔔</span>
            <p className="mt-2 text-xs font-bold text-slate-800">Aucune notification récente</p>
            <p className="mt-1 text-[10px] text-slate-500">Les mises à jour concernant votre espace apparaîtront ici.</p>
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[9px] text-slate-400">
        Les événements disponibles couvrent les 90 derniers jours.
      </div>
    </section>
  );
}
