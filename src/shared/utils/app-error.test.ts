import { expect, test } from "bun:test";

import { getErrorMessage } from "./app-error";

test("translates common Supabase errors", () => {
  expect(getErrorMessage({ message: "Invalid login credentials" })).toBe("E-mail ou senha incorretos.");
  expect(getErrorMessage({ code: "42501", message: "permission denied" })).toBe("Você não tem permissão para realizar esta ação.");
  expect(getErrorMessage({ code: "23505", message: "duplicate key" })).toBe("Já existe um registro com estes dados.");
});

test("preserves an actionable unknown message", () => {
  expect(getErrorMessage(new Error("Detalhe específico"))).toBe("Detalhe específico");
});
