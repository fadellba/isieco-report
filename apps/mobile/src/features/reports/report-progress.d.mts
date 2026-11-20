export interface ReportProgressEvent {
  code: string;
  occurredAt: string;
}
export interface ReportProgress {
  isStage2Done: boolean;
  isStage3Active: boolean;
  isStage3Done: boolean;
  isStage4Done: boolean;
  latestWorkflowEventCode: string | null;
}
export function deriveReportProgress(status: string, events?: ReadonlyArray<ReportProgressEvent>): ReportProgress;
