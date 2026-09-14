export type NotificationType =
  | "WEEKLY_REVIEW"
  | "DAILY_BREAKFAST_SUMMARY"
  | "DAILY_LUNCH_SUMMARY"
  | "PARTICIPATION_REMINDER"
  | "DINNER_SUMMARY";

export type MealPerson = {
  name: string;
  time: string | null;
  availableUntil: string | null;
  status: "CONFIRMED" | "PLANNED";
  waitingForName?: string | null;
};

type EmailInput = {
  type: NotificationType;
  recipientName: string;
  groupName: string;
  localDate: string;
  appUrl: string;
  groupSlug: string;
  people?: MealPerson[];
};

export function parseSender(value: string) {
  const match = value.trim().match(/^(.*?)\s*<([^<>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "Já pode almoçar?", email: value.trim() };
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatLocalDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatAvailability(person: MealPerson) {
  if (person.waitingForName) return `aguardando ${person.waitingForName}`;
  if (!person.time) return "horário ainda não definido";
  const interval = person.availableUntil ? `${person.time}–${person.availableUntil}` : person.time;
  return `${interval} · ${person.status === "CONFIRMED" ? "confirmado" : "planejado"}`;
}

function emailLayout(title: string, intro: string, content: string, actionLabel: string, actionUrl: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f8f4ee;font-family:Arial,sans-serif;color:#25231f">
    <div style="max-width:600px;margin:0 auto;padding:32px 18px">
      <div style="background:#fff;border-radius:24px;padding:32px;box-shadow:0 8px 30px rgba(52,45,35,.08)">
        <p style="margin:0 0 8px;color:#df5d3f;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Já pode almoçar?</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2">${escapeHtml(title)}</h1>
        <p style="margin:0 0 22px;line-height:1.6;color:#625d54">${escapeHtml(intro)}</p>
        ${content}
        <a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:24px;border-radius:999px;background:#df5d3f;color:#fff;padding:13px 20px;text-decoration:none;font-weight:700">${escapeHtml(actionLabel)}</a>
      </div>
      <p style="margin:18px 0 0;text-align:center;color:#8b857b;font-size:12px">Você recebe este e-mail conforme suas preferências de notificação.</p>
    </div>
  </body>
</html>`;
}

export function buildNotificationEmail(input: EmailInput) {
  const baseUrl = input.appUrl.replace(/\/$/, "");
  const todayUrl = `${baseUrl}/g/${encodeURIComponent(input.groupSlug)}/hoje`;
  const agendaUrl = `${baseUrl}/g/${encodeURIComponent(input.groupSlug)}/agenda`;
  const greeting = `Olá, ${input.recipientName}.`;

  if (input.type === "WEEKLY_REVIEW") {
    return {
      subject: `Revise sua semana em ${input.groupName}`,
      html: emailLayout(
        "Como será sua próxima semana?",
        `${greeting} Revise os horários recorrentes do grupo ${input.groupName} e ajuste os dias que serão diferentes.`,
        `<p style="margin:0;line-height:1.6">Uma agenda atualizada ajuda o grupo a combinar as refeições sem mensagens de última hora.</p>`,
        "Revisar minha agenda",
        agendaUrl,
      ),
    };
  }

  if (input.type === "PARTICIPATION_REMINDER") {
    return {
      subject: `Confirme seu almoço de hoje em ${input.groupName}`,
      html: emailLayout(
        "Seu almoço ainda está como planejado",
        `${greeting} Confirme se o seu planejamento para ${formatLocalDate(input.localDate)} continua valendo.`,
        `<p style="margin:0;line-height:1.6">Você também pode alterar o horário, informar um intervalo de disponibilidade ou avisar que não irá.</p>`,
        "Confirmar participação",
        todayUrl,
      ),
    };
  }

  const mealName = input.type === "DAILY_BREAKFAST_SUMMARY"
    ? "desjejum"
    : input.type === "DINNER_SUMMARY" ? "jantar" : "almoço";
  const people = input.people ?? [];
  const content = people.length
    ? `<ul style="margin:0;padding:0;list-style:none">${people.map((person) => `<li style="padding:12px 0;border-bottom:1px solid #eee8df"><strong>${escapeHtml(person.name)}</strong><br><span style="color:#625d54">${escapeHtml(formatAvailability(person))}</span></li>`).join("")}</ul>`
    : `<p style="margin:0;line-height:1.6;color:#625d54">Ninguém informou disponibilidade até o momento.</p>`;

  return {
    subject: `Resumo do ${mealName} em ${input.groupName}`,
    html: emailLayout(
      `Quem estará disponível para o ${mealName}?`,
      `${greeting} Este é o resumo de ${formatLocalDate(input.localDate)} no grupo ${input.groupName}.`,
      content,
      "Abrir agenda de hoje",
      todayUrl,
    ),
  };
}
