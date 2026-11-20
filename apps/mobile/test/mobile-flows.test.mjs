import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeEmailAddress,
  signUpErrorMessage,
  validateEmailAddress,
} from '../src/features/auth/email-utils.mjs';
import { isUsableRecentPosition } from '../src/features/media/mobile-location-utils.mjs';
import { deriveReportProgress } from '../src/features/reports/report-progress.mjs';

test('email addresses are trimmed and normalized consistently', () => {
  assert.equal(normalizeEmailAddress('  Citoyen.Test@Example.COM  '), 'citoyen.test@example.com');
  assert.equal(validateEmailAddress('  citoyen@example.com '), null);
});

test('email addresses with invalid syntax are rejected before calling Supabase', () => {
  assert.match(validateEmailAddress('citoyen.example.com') ?? '', /invalide/i);
  assert.match(validateEmailAddress('citoyen @example.com') ?? '', /invalide/i);
  assert.match(validateEmailAddress('') ?? '', /Renseignez/i);
});

test('signup errors explain invalid addresses, restricted mail delivery and rate limits', () => {
  assert.match(signUpErrorMessage({ code: 'email_address_invalid' }), /adresse e-mail/i);
  assert.match(signUpErrorMessage({ code: 'email_address_not_authorized' }), /SMTP/i);
  assert.match(signUpErrorMessage({ code: 'over_email_send_rate_limit' }), /quota/i);
});

test('recent device location is accepted only when fresh, accurate and in range', () => {
  const now = 1_000_000;
  const recent = {
    timestamp: now - 60_000,
    coords: { latitude: 14.7167, longitude: -17.4677, accuracy: 35 },
  };
  assert.equal(isUsableRecentPosition(recent, now), true);
  assert.equal(isUsableRecentPosition({ ...recent, timestamp: now - 180_000 }, now), false);
  assert.equal(
    isUsableRecentPosition({ ...recent, coords: { ...recent.coords, accuracy: 2500 } }, now),
    false,
  );
  assert.equal(
    isUsableRecentPosition({ ...recent, coords: { ...recent.coords, latitude: 91 } }, now),
    false,
  );
});

test('a qualified report is not shown as cleaned before operational closure', () => {
  const progress = deriveReportProgress('QUALIFIE', [
    { code: 'DOSSIER_CREE', occurredAt: '2026-11-20T08:00:00.000Z' },
  ]);
  assert.equal(progress.isStage2Done, true);
  assert.equal(progress.isStage3Active, false);
  assert.equal(progress.isStage3Done, false);
  assert.equal(progress.isStage4Done, false);
});

test('operational progress follows the latest intervention event, including a requested restart', () => {
  const submitted = deriveReportProgress('QUALIFIE', [
    { code: 'INTERVENTION_DEMARREE', occurredAt: '2026-11-20T08:00:00.000Z' },
    { code: 'INTERVENTION_SOUMISE', occurredAt: '2026-11-20T09:00:00.000Z' },
  ]);
  assert.equal(submitted.isStage3Active, false);
  assert.equal(submitted.isStage3Done, true);
  assert.equal(submitted.isStage4Done, false);

  const restarted = deriveReportProgress('QUALIFIE', [
    { code: 'INTERVENTION_SOUMISE', occurredAt: '2026-11-20T09:00:00.000Z' },
    { code: 'VERIFICATION_REPRISE', occurredAt: '2026-11-20T10:00:00.000Z' },
  ]);
  assert.equal(restarted.isStage3Active, true);
  assert.equal(restarted.isStage3Done, false);
  assert.equal(restarted.isStage4Done, false);
});

test('the final stage becomes complete only after dossier closure', () => {
  const progress = deriveReportProgress('QUALIFIE', [
    { code: 'INTERVENTION_SOUMISE', occurredAt: '2026-11-20T09:00:00.000Z' },
    { code: 'VERIFICATION_CONFORME', occurredAt: '2026-11-20T10:00:00.000Z' },
    { code: 'DOSSIER_CLOTURE', occurredAt: '2026-11-20T10:05:00.000Z' },
  ]);
  assert.equal(progress.isStage3Done, true);
  assert.equal(progress.isStage4Done, true);
});
