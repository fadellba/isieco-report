export function normalizeEmailAddress(value: string): string;
export function validateEmailAddress(value: string): string | null;
export function signUpErrorMessage(error: { code?: string | null; message?: string | null } | null | undefined): string;
