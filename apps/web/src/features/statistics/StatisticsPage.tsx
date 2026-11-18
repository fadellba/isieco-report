import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

type StatisticsPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL';

interface StatisticsBucket {
  bucketStart: string;
  signalements: number;
  dossiers: number;
  affectations: number;
  interventions: number;
}

interface StatisticsResponse {
  period: StatisticsPeriod;
  from: string;
  to: string;
  totals: {
    signalements: number;
    dossiers: number;
    affectations: number;
    interventions: number;
    verificationsConformes: number;
  };
  series: StatisticsBucket[];
}

const periods: Array<{ value: StatisticsPeriod; label: string }> = [
  { value: 'DAILY', label: 'Aujourd’hui' },
  { value: 'WEEKLY', label: 'Cette semaine' },
  { value: 'MONTHLY', label: 'Ce mois' },
  { value: 'SEMIANNUAL', label: 'Ce semestre' },
  { value: 'ANNUAL', label: 'Cette année' },
];

const numberFormat = new Intl.NumberFormat('fr-FR');
const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

const metrics = [
  { key: 'signalements', label: 'Signalements', emoji: '📍', color: 'bg-emerald-600' },
  { key: 'dossiers', label: 'Dossiers créés', emoji: '🗂️', color: 'bg-sky-600' },
  { key: 'affectations', label: 'Affectations', emoji: '🧭', color: 'bg-amber-500' },
  { key: 'interventions', label: 'Interventions', emoji: '🚚', color: 'bg-violet-600' },
] as const;

function csvCell(value: string | number) {
  const text = String(value);
  return '"' + text.replaceAll('"', '""') + '"';
}

function exportCsv(data: StatisticsResponse) {
  const rows = [
    ['Période', data.period],
    ['Du', data.from],
    ['Au', data.to],
    [],
    ['Indicateur', 'Total'],
    ['Signalements', data.totals.signalements],
    ['Dossiers créés', data.totals.dossiers],
    ['Affectations', data.totals.affectations],
    ['Interventions', data.totals.interventions],
    ['Vérifications conformes', data.totals.verificationsConformes],
    [],
    ['Date', 'Signalements', 'Dossiers', 'Affectations', 'Interventions'],
    ...data.series.map((item) => [
      item.bucketStart,
      item.signalements,
      item.dossiers,
      item.affectations,
      item.interventions,
    ]),
  ];
  const csv = '\uFEFF' + rows.map((row) => row.map((cell) => csvCell(cell ?? '')).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'isieco-statistiques-' + data.period.toLowerCase() + '.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function StatisticsPage() {
  const [period, setPeriod] = useState<StatisticsPeriod>('MONTHLY');
  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.request<StatisticsResponse>(
        '/command-center/statistics?period=' + period,
      );
      setData(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const peak = useMemo(() => {
    if (!data) return 1;
    return Math.max(
      1,
      ...data.series.flatMap((item) => [
        item.signalements,
        item.dossiers,
        item.affectations,
        item.interventions,
      ]),
    );
  }, [data]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Statistiques</h1>
          <p className="mt-1 text-xs text-slate-500">Activité réelle de la plateforme par période.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="statistics-period" className="text-xs font-semibold text-slate-600">Période</label>
          <select
            id="statistics-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value as StatisticsPeriod)}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
          >
            {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => data && exportCsv(data)}
            disabled={!data || loading}
            className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white disabled:opacity-50"
          >
            Exporter CSV
          </button>
        </div>
      </header>

      {error ? (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-bold underline">Réessayer</button>
        </div>
      ) : null}

      <section aria-label="Totaux de la période" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <article key={metric.key} className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-base">{metric.emoji}</span>
              <span className="text-[11px] font-semibold text-slate-600">{metric.label}</span>
            </div>
            <p className="mt-1 text-xl font-extrabold text-slate-900">
              {loading ? '—' : numberFormat.format(data?.totals[metric.key] ?? 0)}
            </p>
          </article>
        ))}
        <article className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-base">✅</span>
            <span className="text-[11px] font-semibold text-slate-600">Vérifications conformes</span>
          </div>
          <p className="mt-1 text-xl font-extrabold text-slate-900">
            {loading ? '—' : numberFormat.format(data?.totals.verificationsConformes ?? 0)}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-900">Évolution de l’activité</h2>
          {data ? <p className="text-[10px] text-slate-500">Du {dateTime.format(new Date(data.from))} au {dateTime.format(new Date(data.to))}</p> : null}
        </div>

        {loading ? (
          <div className="flex h-44 items-center justify-center text-xs text-slate-400">Calcul des indicateurs…</div>
        ) : data?.series.length ? (
          <div className="flex h-44 items-end gap-1 overflow-hidden border-b border-slate-100 pb-2">
            {data.series.map((item) => (
              <div key={item.bucketStart} className="flex h-full min-w-0 flex-1 items-end justify-center gap-px" title={dateTime.format(new Date(item.bucketStart))}>
                {metrics.map((metric) => {
                  const value = item[metric.key];
                  const height = value === 0 ? 2 : Math.max(4, (value / peak) * 100);
                  return (
                    <div
                      key={metric.key}
                      className={'min-w-0 flex-1 rounded-t-sm ' + metric.color}
                      style={{ height: height + '%' }}
                      title={metric.label + ': ' + numberFormat.format(value)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-44 items-center justify-center text-xs text-slate-400">Aucune activité enregistrée sur cette période.</div>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {metrics.map((metric) => (
            <span key={metric.key} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
              <span className={'h-2 w-2 rounded-sm ' + metric.color} />
              {metric.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-400">Chaque barre représente une heure, une journée ou un mois selon la périodicité choisie.</p>
      </section>

      {data ? (
        <details className="rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-xs font-bold text-slate-700">Afficher les valeurs détaillées ({data.series.length} intervalles)</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Signalements</th>
                  <th className="py-2 pr-3 font-semibold">Dossiers</th>
                  <th className="py-2 pr-3 font-semibold">Affectations</th>
                  <th className="py-2 pr-3 font-semibold">Interventions</th>
                </tr>
              </thead>
              <tbody>
                {data.series.map((item) => (
                  <tr key={item.bucketStart} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-3">{dateTime.format(new Date(item.bucketStart))}</td>
                    <td className="py-2 pr-3">{numberFormat.format(item.signalements)}</td>
                    <td className="py-2 pr-3">{numberFormat.format(item.dossiers)}</td>
                    <td className="py-2 pr-3">{numberFormat.format(item.affectations)}</td>
                    <td className="py-2 pr-3">{numberFormat.format(item.interventions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}
