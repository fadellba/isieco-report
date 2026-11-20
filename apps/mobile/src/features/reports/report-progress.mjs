const WORKFLOW_EVENT_CODES = new Set([
  'INTERVENTION_DEMARREE',
  'INTERVENTION_SOUMISE',
  'VERIFICATION_CONFORME',
  'VERIFICATION_REPRISE',
  'DOSSIER_CLOTURE',
]);

export function deriveReportProgress(status, events = []) {
  const orderedWorkflowEvents = events
    .filter((event) => WORKFLOW_EVENT_CODES.has(event.code))
    .slice()
    .sort((left, right) => {
      const leftTime = Date.parse(left.occurredAt);
      const rightTime = Date.parse(right.occurredAt);
      return (Number.isFinite(leftTime) ? leftTime : 0) - (Number.isFinite(rightTime) ? rightTime : 0);
    });

  const latestWorkflowEvent = orderedWorkflowEvents.at(-1) ?? null;
  const hasDossier = status === 'QUALIFIE' || events.some((event) => event.code === 'DOSSIER_CREE');
  const isStage3Active = ['INTERVENTION_DEMARREE', 'VERIFICATION_REPRISE'].includes(
    latestWorkflowEvent?.code ?? '',
  );
  const isStage3Done = ['INTERVENTION_SOUMISE', 'VERIFICATION_CONFORME', 'DOSSIER_CLOTURE'].includes(
    latestWorkflowEvent?.code ?? '',
  );
  const isStage4Done = latestWorkflowEvent?.code === 'DOSSIER_CLOTURE';

  return {
    isStage2Done: hasDossier,
    isStage3Active,
    isStage3Done,
    isStage4Done,
    latestWorkflowEventCode: latestWorkflowEvent?.code ?? null,
  };
}
