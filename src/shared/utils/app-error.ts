type ErrorLike = { code?: string; message?: string };

const codeMessages: Record<string, string> = {
  "23505": "Já existe um registro com estes dados.",
  "23P01": "Este período entra em conflito com outro já cadastrado.",
  "42501": "Você não tem permissão para realizar esta ação.",
  PGRST116: "O conteúdo solicitado não foi encontrado.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  email_exists: "Já existe uma conta com este e-mail.",
  invalid_credentials: "E-mail ou senha incorretos.",
};

const messagePatterns: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar."],
  [/user already registered|already been registered/i, "Já existe uma conta com este e-mail."],
  [/permission denied|row-level security|violates row-level security/i, "Você não tem permissão para realizar esta ação."],
  [/overlap|conflict/i, "Este período entra em conflito com outro já cadastrado."],
  [/network|failed to fetch/i, "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente."],
  [/rate limit|too many requests/i, "Muitas tentativas em pouco tempo. Aguarde um momento e tente novamente."],
];

export function getErrorMessage(error: unknown, fallback = "Não foi possível concluir a ação. Tente novamente.") {
  const value = error as ErrorLike | null;
  if (value?.code && codeMessages[value.code]) return codeMessages[value.code];
  const message = value?.message;
  if (!message) return fallback;
  return messagePatterns.find(([pattern]) => pattern.test(message))?.[1] ?? message;
}

export function toAppError(error: unknown, fallback?: string) {
  return new Error(getErrorMessage(error, fallback));
}

