import { speakSeat } from "@/lib/council/speak";
import { ROLES, type Intensity, type RoleId, type Stage } from "@/lib/council/roles";

export type TurnStatus = "speaking" | "done" | "error";

export type Turn = {
  id: string;
  roleId: RoleId;
  stage: Stage;
  letter?: string;
  status: TurnStatus;
  text: string;
  error?: string;
};

type Hooks = {
  question: string;
  intensity: Intensity;
  onTurn: (turn: Turn) => void;
  isCancelled: () => boolean;
};

function clip(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function fit(dossier: string) {
  const max = 12000;
  if (dossier.length <= max) return dossier;
  return `…(trecho anterior omitido)\n${dossier.slice(dossier.length - max)}`;
}

async function seat(
  hooks: Hooks,
  roleId: RoleId,
  stage: Stage,
  dossier: string,
  letter?: string,
): Promise<string | null> {
  const id = `${stage}:${roleId}`;
  const base = { id, roleId, stage, letter, text: "" };
  hooks.onTurn({ ...base, status: "speaking" });
  if (hooks.isCancelled()) return null;

  try {
    const res = await speakSeat({
      data: { roleId, question: hooks.question, dossier: fit(dossier) },
    });
    if (hooks.isCancelled()) return null;
    if (!res.ok) {
      hooks.onTurn({ ...base, status: "error", error: res.error });
      return null;
    }
    hooks.onTurn({ ...base, status: "done", text: res.text });
    return res.text;
  } catch (err) {
    if (hooks.isCancelled()) return null;
    const error = err instanceof Error ? err.message : "Falha ao falar com este assento.";
    hooks.onTurn({ ...base, status: "error", error });
    return null;
  }
}

function named(roleId: RoleId, text: string | null) {
  const body = text ? clip(text, 1000) : "(sem resposta)";
  return `[${ROLES[roleId].title}]\n${body}`;
}

export async function runCouncil(hooks: Hooks) {
  if (hooks.intensity === "direta") {
    await seat(hooks, "analista", "geracao", "");
    return;
  }

  if (hooks.intensity === "debate") {
    const answer = await seat(hooks, "analista", "geracao", "", "A");
    if (hooks.isCancelled()) return;
    const critiqueDossier = answer
      ? `Respostas anônimas. Não identifique autores.\n\n[A]\n${clip(answer, 1600)}`
      : "A resposta inicial falhou. Diga apenas o que essa ausência impede de criticar.";
    const critique = await seat(hooks, "cetico", "critica", critiqueDossier);
    if (hooks.isCancelled()) return;
    const dossier = [named("analista", answer), named("cetico", critique)].join("\n\n");
    await seat(hooks, "presidente", "sintese", dossier);
    return;
  }

  const genSpecs: { role: RoleId; letter: string }[] = [
    { role: "analista", letter: "A" },
    { role: "quantitativo", letter: "B" },
    { role: "alternativas", letter: "C" },
  ];
  const gens = await Promise.all(
    genSpecs.map((spec) => seat(hooks, spec.role, "geracao", "", spec.letter)),
  );
  if (hooks.isCancelled()) return;

  const anon = genSpecs
    .map((spec, index) => {
      const text = gens[index];
      return `[${spec.letter}]\n${text ? clip(text, 900) : "(sem resposta)"}`;
    })
    .join("\n\n");
  const critiqueDossier = `Respostas anônimas. Não identifique autores.\n\n${anon}`;
  const [cetico, premissas] = await Promise.all([
    seat(hooks, "cetico", "critica", critiqueDossier),
    seat(hooks, "premissas", "critica", critiqueDossier),
  ]);
  if (hooks.isCancelled()) return;

  const answers = genSpecs.map((spec, index) => named(spec.role, gens[index])).join("\n\n");
  const critiques = [named("cetico", cetico), named("premissas", premissas)].join("\n\n");
  const laudoDossier = `Respostas, já com o método de cada assento.\n\n${answers}\n\nCríticas\n\n${critiques}`;
  const laudo = await seat(hooks, "verificador", "verificacao", laudoDossier);
  if (hooks.isCancelled()) return;

  const pres = `${laudoDossier}\n\nLaudo\n\n${laudo ? clip(laudo, 1400) : "(laudo indisponível)"}`;
  await seat(hooks, "presidente", "sintese", pres);
}
