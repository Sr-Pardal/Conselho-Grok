import { createServerFn } from "@tanstack/react-start";
import { ROLES, isRoleId, type RoleId } from "@/lib/council/roles";

type SpeakInput = {
  roleId: RoleId;
  question: string;
  dossier: string;
};

type SpeakResult = { ok: true; text: string } | { ok: false; error: string };

const MODEL = "grok-4.5";
const DOSSIER_MAX = 14000;

function asSpeakInput(input: unknown): SpeakInput {
  if (!input || typeof input !== "object") {
    throw new Error("Pedido inválido.");
  }
  const data = input as { roleId?: unknown; question?: unknown; dossier?: unknown };
  if (typeof data.roleId !== "string" || !isRoleId(data.roleId)) {
    throw new Error("Assento desconhecido.");
  }
  if (typeof data.question !== "string") {
    throw new Error("Falta a pergunta.");
  }
  const question = data.question.trim();
  if (question.length < 8) throw new Error("A pergunta está curta demais.");
  if (question.length > 2000) throw new Error("A pergunta passa de 2000 caracteres.");
  const dossier = typeof data.dossier === "string" ? data.dossier.slice(0, DOSSIER_MAX) : "";
  return { roleId: data.roleId, question, dossier };
}

function messageText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("")
    .trim();
}

async function callModel(apiKey: string, roleId: RoleId, question: string, dossier: string) {
  const role = ROLES[roleId];
  const user = [
    "Pergunta original:",
    question,
    "",
    dossier
      ? `Dossiê das etapas anteriores:\n${dossier}`
      : "Não há dossiê. Responda só a partir da pergunta.",
    "",
    "Escreva agora, apenas no papel deste assento.",
  ].join("\n");

  const body = JSON.stringify({
    model: MODEL,
    temperature: role.temperature,
    max_tokens: role.maxTokens,
    messages: [
      { role: "system", content: role.system },
      { role: "user", content: user },
    ],
  });

  const run = () =>
    fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: AbortSignal.timeout(55_000),
    });

  let res = await run();
  if (res.status === 429 || res.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    res = await run();
  }
  return res;
}

export const speakSeat = createServerFn({ method: "POST" })
  .validator(asSpeakInput)
  .handler(async ({ data }): Promise<SpeakResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "A inteligência não está disponível neste ambiente." };
    }

    try {
      const res = await callModel(apiKey, data.roleId, data.question, data.dossier);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return {
            ok: false,
            error:
              "A conta de uso do Grok está sem créditos ou bloqueada. A câmara não inventa resposta no lugar.",
          };
        }
        let detail = "";
        try {
          const payload = (await res.json()) as { error?: { message?: string } };
          detail = payload.error?.message?.slice(0, 180) ?? "";
        } catch {
          detail = "";
        }
        const suffix = detail ? ` ${detail}` : "";
        return {
          ok: false,
          error: `Este assento não respondeu (${res.status}).${suffix}`,
        };
      }

      const payload = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const text = messageText(payload.choices?.[0]?.message?.content);
      if (!text) return { ok: false, error: "O assento devolveu uma resposta vazia." };
      return { ok: true, text };
    } catch (err) {
      const message = err instanceof Error ? err.message : "falha de rede";
      return { ok: false, error: `Não foi possível consultar este assento. ${message}` };
    }
  });
