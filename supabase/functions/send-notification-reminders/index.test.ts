import { describe, expect, test } from "bun:test";
import { buildNotificationEmail, escapeHtml, parseSender } from "../_shared/notification-email";

describe("notification email helpers", () => {
  test("parses a named sender", () => {
    expect(parseSender("Já pode almoçar? <agenda@example.com>")).toEqual({
      name: "Já pode almoçar?",
      email: "agenda@example.com",
    });
  });

  test("escapes user-controlled HTML", () => {
    expect(escapeHtml('<João & "Maria">')).toBe("&lt;João &amp; &quot;Maria&quot;&gt;");
  });

  test("builds a lunch summary with availability ranges", () => {
    const email = buildNotificationEmail({
      type: "DAILY_LUNCH_SUMMARY",
      recipientName: "João",
      groupName: "Equipe Produto",
      localDate: "2026-09-14",
      appUrl: "https://example.com/",
      groupSlug: "equipe-produto",
      people: [{ name: "Maria", time: "12:30", availableUntil: "13:00", status: "CONFIRMED" }],
    });

    expect(email.subject).toBe("Resumo do almoço em Equipe Produto");
    expect(email.html).toContain("12:30–13:00 · confirmado");
    expect(email.html).toContain("Desculpa a ansiedade, mas… já pode almoçar?");
    expect(email.html).toContain("https://example.com/g/equipe-produto/hoje");
  });

  test("links the weekly review to the recurring agenda", () => {
    const email = buildNotificationEmail({
      type: "WEEKLY_REVIEW",
      recipientName: "João",
      groupName: "Equipe Produto",
      localDate: "2026-09-20",
      appUrl: "https://example.com",
      groupSlug: "equipe-produto",
    });

    expect(email.subject).toContain("Revise sua semana");
    expect(email.html).toContain("https://example.com/g/equipe-produto/agenda");
  });

  test("builds a breakfast summary", () => {
    const email = buildNotificationEmail({
      type: "DAILY_BREAKFAST_SUMMARY",
      recipientName: "João",
      groupName: "Equipe Produto",
      localDate: "2026-09-15",
      appUrl: "https://example.com",
      groupSlug: "equipe-produto",
      people: [{ name: "João", time: "07:20", availableUntil: null, status: "PLANNED" }],
    });

    expect(email.subject).toBe("Resumo do desjejum em Equipe Produto");
    expect(email.html).toContain("07:20 · planejado");
  });
});
