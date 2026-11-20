const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailAddress(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateEmailAddress(value) {
  const email = normalizeEmailAddress(value);
  if (!email) return 'Renseignez votre adresse e-mail.';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return 'Adresse e-mail invalide. Vérifiez le format, par exemple nom@exemple.com.';
  }
  return null;
}

export function signUpErrorMessage(error) {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '');
  const normalizedMessage = message.toLowerCase();

  if (
    code === 'over_email_send_rate_limit' ||
    normalizedMessage.includes('rate limit') ||
    normalizedMessage.includes('too many emails')
  ) {
    return "Le quota d'envoi des e-mails de confirmation est atteint. Réessayez plus tard. Pour une inscription citoyenne ouverte au public, le projet doit utiliser un fournisseur SMTP configuré.";
  }

  if (
    code === 'email_address_invalid' ||
    (normalizedMessage.includes('email address') && normalizedMessage.includes('invalid')) ||
    normalizedMessage.includes('invalid email')
  ) {
    return 'Supabase a refusé cette adresse e-mail. Vérifiez son orthographe et retirez les espaces éventuels.';
  }

  if (
    code === 'email_address_not_authorized' ||
    normalizedMessage.includes('not authorized') ||
    normalizedMessage.includes('only team members')
  ) {
    return "Le service e-mail du projet refuse ce destinataire. Vérifiez la configuration SMTP et les restrictions du fournisseur d'e-mails Supabase.";
  }

  if (
    code === 'user_already_exists' ||
    normalizedMessage.includes('already registered') ||
    normalizedMessage.includes('user already exists')
  ) {
    return 'Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou réinitialisez votre mot de passe.';
  }

  if (code === 'email_provider_disabled') {
    return "Les inscriptions par e-mail sont désactivées dans la configuration du projet.";
  }

  return message || 'La création du compte est impossible. Vérifiez les informations ou réessayez.';
}
