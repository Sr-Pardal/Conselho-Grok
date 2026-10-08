import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, History, Square } from "lucide-react";
import {
  INTENSITIES,
  ROLES,
  SAMPLES,
  STAGES,
  STAGE_META,
  type Intensity,
} from "@/lib/council/roles";
import { runCouncil, type Turn } from "@/lib/council/run";

const HISTORY_KEY = "conselho.sessoes.v1";

type Phase = "idle" | "running" | "done" | "stopped";

type SavedSession = {
  id: string;
  question: string;
  intensity: Intensity;
  at: number;
  turns: Turn[];
};

function loadHistory(): SavedSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSession[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveHistory(sessions: SavedSession[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, 8)));
}

function upsert(turns: Turn[], next: Turn): Turn[] {
  const index = turns.findIndex((turn) => turn.id === next.id);
  if (index === -1) return [...turns, next];
  const copy = turns.slice();
  copy[index] = next;
  return copy;
}

function verdictOf(turns: Turn[], intensity: Intensity): Turn | undefined {
  const president = turns.find((turn) => turn.roleId === "presidente");
  if (president && president.status !== "speaking") return president;
  if (intensity === "direta") {
    const analyst = turns.find((turn) => turn.roleId === "analista");
    if (analyst && analyst.status !== "speaking") return analyst;
  }
  return undefined;
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function inlineMarks(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-medium text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function lineTone(line: string) {
  if (line.startsWith("SÓLIDA:") || line.startsWith("Fica:")) return "text-hold";
  if (line.startsWith("REJEITADA:") || line.startsWith("Cai:")) return "text-warn";
  if (line.startsWith("CONTESTADA:") || line.startsWith("Falta:") || line.startsWith("Prioridade:")) {
    return "text-paper";
  }
  return "";
}

function Prose({ text, className = "text-sm leading-relaxed" }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className={`space-y-3 text-ink ${className}`}>
      {blocks.map((block, index) => {
        const lines = block.split("\n").filter((line) => line.trim().length > 0);
        const bullets = lines.length > 0 && lines.every((line) => /^[-•]\s+/.test(line.trim()));
        if (bullets) {
          return (
            <ul key={index} className="space-y-1.5 pl-4">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="list-disc marker:text-faint">
                  {inlineMarks(line.replace(/^[-•]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }
        if (lines.length > 1) {
          return (
            <div key={index} className="space-y-1.5">
              {lines.map((line, lineIndex) => (
                <p key={lineIndex} className={lineTone(line.trim())}>
                  {inlineMarks(line)}
                </p>
              ))}
            </div>
          );
        }
        return (
          <p key={index} className={lineTone(block.trim())}>
            {inlineMarks(block)}
          </p>
        );
      })}
    </div>
  );
}

export function CouncilApp() {
  const [question, setQuestion] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("debate");
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [viewingPast, setViewingPast] = useState(false);
  const token = useRef(0);
  const resultsRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    const started = Date.now();
    setSeconds(0);
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (historyOpen && !dialog.open) dialog.showModal();
    if (!historyOpen && dialog.open) dialog.close();
  }, [historyOpen]);

  const selected = INTENSITIES.find((item) => item.id === intensity) ?? INTENSITIES[1];
  const verdict = verdictOf(turns, intensity);
  const promotedId = verdict?.status === "done" || verdict?.status === "error" ? verdict.id : undefined;
  const argument = turns.filter((turn) => turn.id !== promotedId);
  const speaking = turns.find((turn) => turn.status === "speaking");
  const statusLine =
    phase === "running"
      ? speaking
        ? `${ROLES[speaking.roleId].title} em curso. ${formatClock(seconds)}`
        : `Sessão em curso. ${formatClock(seconds)}`
      : phase === "stopped"
        ? "Sessão interrompida."
        : phase === "done"
        ? verdict?.status === "done"
          ? "Sessão encerrada."
          : "A sessão terminou sem uma resposta."
        : "A câmara está ociosa.";

  const stageProgress = useMemo(() => {
    const present = STAGES.filter((stage) => turns.some((turn) => turn.stage === stage));
    const current =
      turns.find((turn) => turn.status === "speaking")?.stage ?? present[present.length - 1];
    return { present, current };
  }, [turns]);

  async function convene(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (trimmed.length < 8 || phase === "running") return;
    const my = ++token.current;
    setViewingPast(false);
    setQuestion(trimmed);
    setTurns([]);
    setCopied(false);
    setPhase("running");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });

    await runCouncil({
      question: trimmed,
      intensity,
      isCancelled: () => token.current !== my,
      onTurn: (turn) => {
        if (token.current !== my) return;
        setTurns((current) => upsert(current, turn));
      },
    });

    if (token.current !== my) return;
    setPhase("done");
    setTurns((current) => {
      const entry: SavedSession = {
        id: `${Date.now()}`,
        question: trimmed,
        intensity,
        at: Date.now(),
        turns: current.filter((turn) => turn.status !== "speaking"),
      };
      if (entry.turns.some((turn) => turn.status === "done")) {
        const next = [entry, ...loadHistory().filter((item) => item.question !== trimmed)].slice(0, 8);
        saveHistory(next);
        setHistory(next);
      }
      return current;
    });
  }

  function interrupt() {
    token.current += 1;
    setPhase("stopped");
    setTurns((current) =>
      current.map((turn) =>
        turn.status === "speaking"
          ? { ...turn, status: "error", error: "Interrompido antes de concluir." }
          : turn,
      ),
    );
  }

  function openPast(session: SavedSession) {
    token.current += 1;
    setQuestion(session.question);
    setIntensity(session.intensity);
    setTurns(session.turns);
    setPhase("done");
    setViewingPast(true);
    setHistoryOpen(false);
    setCopied(false);
  }

  function removePast(id: string) {
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    saveHistory(next);
  }

  async function copyVerdict() {
    if (!verdict || verdict.status !== "done") return;
    try {
      await navigator.clipboard.writeText(verdict.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="sr-only" aria-live="polite">
        {statusLine}
      </p>

      <header className="flex items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-medium tracking-wide text-faint">Câmara de raciocínio</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            Conselho
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-mute sm:text-base">
            Nada é treinado. A mesma pergunta passa por métodos que discordam de propósito. A
            resposta final é o que sobrou da crítica — não a média de vários chats.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm border border-line bg-panel px-3 text-sm font-medium text-ink transition-colors duration-(--motion-quick) hover:bg-raised"
        >
          <History className="size-4" aria-hidden="true" />
          Sessões
        </button>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:mt-10 lg:grid-cols-3 lg:gap-8">
        <section className="rounded-xl bg-panel p-4 lg:sticky lg:top-6">
          <label htmlFor="pergunta" className="text-xs font-medium text-faint">
            Pergunta
          </label>
          <textarea
            id="pergunta"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void convene();
              }
            }}
            maxLength={2000}
            rows={7}
            placeholder="Uma pergunta difícil o bastante para valer o debate."
            className="mt-2 w-full resize-y rounded-md border border-line bg-canvas px-3 py-3 text-sm leading-relaxed text-ink placeholder:text-faint"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-faint tabular-nums">
            <span>{question.trim().length} / 2000</span>
            <span className="hidden sm:inline">Ctrl + Enter</span>
          </div>

          <fieldset className="mt-5">
            <legend className="text-xs font-medium text-faint">Profundidade</legend>
            <div
              role="radiogroup"
              aria-label="Profundidade da sessão"
              className="mt-2 grid grid-cols-3 gap-1 rounded-sm bg-canvas p-1"
            >
              {INTENSITIES.map((item) => {
                const active = item.id === intensity;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={phase === "running"}
                    onClick={() => setIntensity(item.id)}
                    className={
                      "rounded-xs px-2 py-2 text-left transition-colors duration-(--motion-quick) disabled:opacity-50 " +
                      (active ? "bg-paper text-inkbtn" : "text-mute hover:text-ink")
                    }
                  >
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className={"mt-0.5 block text-xs " + (active ? "opacity-70" : "text-faint")}>
                      {item.seats}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-mute">{selected.detail}</p>
          </fieldset>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void convene()}
              disabled={phase === "running" || question.trim().length < 8}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-sm bg-paper px-4 text-sm font-medium text-inkbtn transition-opacity duration-(--motion-quick) hover:opacity-90 disabled:opacity-40"
            >
              {phase === "running" ? "Em sessão" : `Convocar ${selected.title.toLowerCase()}`}
            </button>
            {phase === "running" ? (
              <button
                type="button"
                onClick={interrupt}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-line px-4 text-sm font-medium text-ink hover:bg-raised"
              >
                <Square className="size-3.5 fill-current" aria-hidden="true" />
                Interromper
              </button>
            ) : null}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs font-medium text-faint">Para experimentar</p>
            <div className="mt-2 flex flex-col gap-2">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  disabled={phase === "running"}
                  onClick={() => setQuestion(sample.text)}
                  className="min-h-11 rounded-sm px-2 py-2 text-left text-sm text-mute transition-colors duration-(--motion-quick) hover:bg-raised hover:text-ink disabled:opacity-40"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section ref={resultsRef} className="scroll-mt-6 min-w-0 lg:col-span-2" aria-busy={phase === "running"}>
          {phase === "idle" ? <Method /> : null}

          {phase !== "idle" ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-faint">
                    {viewingPast ? "Sessão anterior" : statusLine}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
                    {phase === "running" ? "A câmara está debatendo" : "Registro da sessão"}
                  </h2>
                </div>
                {phase === "running" ? (
                  <p className="font-display text-2xl tabular-nums text-paper">{formatClock(seconds)}</p>
                ) : null}
              </div>

              <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {STAGES.map((stage, index) => {
                  const active = stageProgress.current === stage;
                  const reached = stageProgress.present.includes(stage);
                  return (
                    <li
                      key={stage}
                      className={
                        "rounded-md border px-3 py-3 " +
                        (active ? "border-paper bg-raised" : "border-line bg-panel")
                      }
                    >
                      <p className="text-xs tabular-nums text-faint">0{index + 1}</p>
                      <p className={"mt-1 text-sm font-medium " + (reached ? "text-ink" : "text-faint")}>
                        {STAGE_META[stage].title}
                      </p>
                      {active && phase === "running" ? (
                        <span className="seat-live mt-3 block h-px bg-paper" />
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              {verdict ? (
                <Verdict
                  turn={verdict}
                  intensity={intensity}
                  copied={copied}
                  onCopy={() => void copyVerdict()}
                />
              ) : null}

              {argument.length > 0 ? (
                <div className="space-y-3">
                  {STAGES.map((stage) => {
                    const group = argument.filter((turn) => turn.stage === stage);
                    if (group.length === 0) return null;
                    return (
                      <div key={stage}>
                        <h3 className="mb-2 text-xs font-medium tracking-wide text-faint">
                          {STAGE_META[stage].title}
                          <span className="ml-2 font-normal text-faint">{STAGE_META[stage].note}</span>
                        </h3>
                        <div className="space-y-3">
                          {group.map((turn) => (
                            <SeatCard key={turn.id} turn={turn} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {phase === "stopped" ? (
                <p className="text-sm text-mute">
                  Sessão interrompida. O que já foi dito continua acima; nada disso entra no histórico.
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-8 max-w-xl text-xs leading-relaxed text-faint">
            Os assentos compartilham o mesmo modelo e divergem pelo método. Na crítica, as respostas
            chegam só como A, B e C — sem o nome de quem escreveu. Cada convocação gasta uso da sua
            conta.
          </p>
        </section>
      </div>

        <dialog
        ref={dialogRef}
        aria-labelledby="sessoes-titulo"
        onClose={() => setHistoryOpen(false)}
        className="dialog-panel m-auto rounded-xl border border-line bg-panel p-0 text-ink"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id="sessoes-titulo" className="font-display text-xl font-medium">
            Sessões
          </h2>
          <button
            type="button"
            onClick={() => setHistoryOpen(false)}
            className="h-10 rounded-sm px-3 text-sm text-mute hover:text-ink"
          >
            Fechar
          </button>
        </div>
        <div className="history-scroll overflow-y-auto p-3">
          {history.length === 0 ? (
            <p className="px-2 py-6 text-sm text-mute">Nenhuma sessão ainda. Convoque a primeira.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((session) => (
                <li key={session.id} className="rounded-md bg-raised p-3">
                  <button type="button" onClick={() => openPast(session)} className="block w-full text-left">
                    <span className="line-clamp-2 text-sm text-ink">{session.question}</span>
                    <span className="mt-1 block text-xs text-faint">
                      {INTENSITIES.find((item) => item.id === session.intensity)?.title} ·{" "}
                      {new Date(session.at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removePast(session.id)}
                    className="mt-2 text-xs text-faint hover:text-warn"
                  >
                    Apagar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </main>
  );
}

function Method() {
  const steps = [
    { n: "01", title: "Geração", body: "Assentos respondem sem se ver. Diversidade de método, não de marca." },
    { n: "02", title: "Crítica", body: "Outros assentos atacam as respostas com os autores ocultos." },
    { n: "03", title: "Laudo", body: "Cada afirmação fica sólida, contestada ou rejeitada." },
    { n: "04", title: "Síntese", body: "O presidente escreve só com o que sobreviveu." },
  ];
  return (
    <div>
      <p className="text-xs font-medium text-faint">Como a câmara trabalha</p>
      <h2 className="mt-2 max-w-md font-display text-3xl font-medium tracking-tight text-ink">
        Quatro etapas. Um erro compartilhado não vira certeza.
      </h2>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.n} className="rounded-lg bg-panel p-4">
            <p className="text-xs tabular-nums text-faint">{step.n}</p>
            <h3 className="mt-2 text-base font-medium text-ink">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-mute">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Verdict({
  turn,
  intensity,
  copied,
  onCopy,
}: {
  turn: Turn;
  intensity: Intensity;
  copied: boolean;
  onCopy: () => void;
}) {
  const direta = intensity === "direta";
  return (
    <article className="rounded-lg bg-raised p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-faint">{direta ? "Resposta direta" : "Veredito"}</p>
          <h3 className="mt-1 font-display text-2xl font-medium text-ink">
            {turn.status === "error" ? "Este assento não concluiu" : direta ? "Analista" : "Presidente"}
          </h3>
        </div>
        {turn.status === "done" ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-line px-3 text-sm text-ink hover:bg-panel"
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        ) : null}
      </div>
      <div className="mt-4">
        {turn.status === "done" ? (
          <Prose text={turn.text} className="font-display text-lg leading-snug" />
        ) : (
          <p className="text-sm leading-relaxed text-mute">{turn.error ?? "Sem texto."}</p>
        )}
      </div>
      {direta && turn.status === "done" ? (
        <p className="mt-4 text-xs text-faint">Consulta direta: ninguém revisou esta resposta.</p>
      ) : null}
    </article>
  );
}

function SeatCard({ turn }: { turn: Turn }) {
  const role = ROLES[turn.roleId];
  return (
    <article className="rounded-lg border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium text-ink">
          {role.title}
          {turn.letter ? <span className="ml-2 text-faint">letra {turn.letter}</span> : null}
        </h4>
        <p className="text-xs text-faint">{role.duty}</p>
      </div>
      {turn.status === "speaking" ? <span className="seat-live mt-3 block h-px bg-paper" /> : null}
      <div className="mt-3">
        {turn.status === "speaking" ? (
          <p className="text-sm text-mute">Escrevendo…</p>
        ) : turn.status === "error" ? (
          <p className="text-sm text-mute">
            <span className="text-warn">Falha. </span>
            {turn.error}
          </p>
        ) : (
          <Prose text={turn.text} />
        )}
      </div>
    </article>
  );
}
