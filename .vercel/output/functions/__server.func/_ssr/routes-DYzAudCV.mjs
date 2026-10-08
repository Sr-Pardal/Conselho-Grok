import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Check, i as Copy, n as Square, r as History } from "../_libs/lucide-react.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as STAGE_META, i as STAGES, n as ROLES, o as isRoleId, r as SAMPLES, t as INTENSITIES } from "./roles-vBEqiZkw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DYzAudCV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var DOSSIER_MAX = 14e3;
function asSpeakInput(input) {
	if (!input || typeof input !== "object") throw new Error("Pedido inválido.");
	const data = input;
	if (typeof data.roleId !== "string" || !isRoleId(data.roleId)) throw new Error("Assento desconhecido.");
	if (typeof data.question !== "string") throw new Error("Falta a pergunta.");
	const question = data.question.trim();
	if (question.length < 8) throw new Error("A pergunta está curta demais.");
	if (question.length > 2e3) throw new Error("A pergunta passa de 2000 caracteres.");
	const dossier = typeof data.dossier === "string" ? data.dossier.slice(0, DOSSIER_MAX) : "";
	return {
		roleId: data.roleId,
		question,
		dossier
	};
}
var speakSeat = createServerFn({ method: "POST" }).validator(asSpeakInput).handler(createSsrRpc("6e3b2a01d3d19cdba28da562e3d937ab877b4fbec31a3590c698aced51f799dd"));
function clip(text, max) {
	const trimmed = text.trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max)}…`;
}
function fit(dossier) {
	const max = 12e3;
	if (dossier.length <= max) return dossier;
	return `…(trecho anterior omitido)\n${dossier.slice(dossier.length - max)}`;
}
async function seat(hooks, roleId, stage, dossier, letter) {
	const base = {
		id: `${stage}:${roleId}`,
		roleId,
		stage,
		letter,
		text: ""
	};
	hooks.onTurn({
		...base,
		status: "speaking"
	});
	if (hooks.isCancelled()) return null;
	try {
		const res = await speakSeat({ data: {
			roleId,
			question: hooks.question,
			dossier: fit(dossier)
		} });
		if (hooks.isCancelled()) return null;
		if (!res.ok) {
			hooks.onTurn({
				...base,
				status: "error",
				error: res.error
			});
			return null;
		}
		hooks.onTurn({
			...base,
			status: "done",
			text: res.text
		});
		return res.text;
	} catch (err) {
		if (hooks.isCancelled()) return null;
		const error = err instanceof Error ? err.message : "Falha ao falar com este assento.";
		hooks.onTurn({
			...base,
			status: "error",
			error
		});
		return null;
	}
}
function named(roleId, text) {
	const body = text ? clip(text, 1e3) : "(sem resposta)";
	return `[${ROLES[roleId].title}]\n${body}`;
}
async function runCouncil(hooks) {
	if (hooks.intensity === "direta") {
		await seat(hooks, "analista", "geracao", "");
		return;
	}
	if (hooks.intensity === "debate") {
		const answer = await seat(hooks, "analista", "geracao", "", "A");
		if (hooks.isCancelled()) return;
		const critique = await seat(hooks, "cetico", "critica", answer ? `Respostas anônimas. Não identifique autores.\n\n[A]\n${clip(answer, 1600)}` : "A resposta inicial falhou. Diga apenas o que essa ausência impede de criticar.");
		if (hooks.isCancelled()) return;
		await seat(hooks, "presidente", "sintese", [named("analista", answer), named("cetico", critique)].join("\n\n"));
		return;
	}
	const genSpecs = [
		{
			role: "analista",
			letter: "A"
		},
		{
			role: "quantitativo",
			letter: "B"
		},
		{
			role: "alternativas",
			letter: "C"
		}
	];
	const gens = await Promise.all(genSpecs.map((spec) => seat(hooks, spec.role, "geracao", "", spec.letter)));
	if (hooks.isCancelled()) return;
	const critiqueDossier = `Respostas anônimas. Não identifique autores.\n\n${genSpecs.map((spec, index) => {
		const text = gens[index];
		return `[${spec.letter}]\n${text ? clip(text, 900) : "(sem resposta)"}`;
	}).join("\n\n")}`;
	const [cetico, premissas] = await Promise.all([seat(hooks, "cetico", "critica", critiqueDossier), seat(hooks, "premissas", "critica", critiqueDossier)]);
	if (hooks.isCancelled()) return;
	const laudoDossier = `Respostas, já com o método de cada assento.\n\n${genSpecs.map((spec, index) => named(spec.role, gens[index])).join("\n\n")}\n\nCríticas\n\n${[named("cetico", cetico), named("premissas", premissas)].join("\n\n")}`;
	const laudo = await seat(hooks, "verificador", "verificacao", laudoDossier);
	if (hooks.isCancelled()) return;
	await seat(hooks, "presidente", "sintese", `${laudoDossier}\n\nLaudo\n\n${laudo ? clip(laudo, 1400) : "(laudo indisponível)"}`);
}
var HISTORY_KEY = "conselho.sessoes.v1";
function loadHistory() {
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
	} catch {
		return [];
	}
}
function saveHistory(sessions) {
	localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, 8)));
}
function upsert(turns, next) {
	const index = turns.findIndex((turn) => turn.id === next.id);
	if (index === -1) return [...turns, next];
	const copy = turns.slice();
	copy[index] = next;
	return copy;
}
function verdictOf(turns, intensity) {
	const president = turns.find((turn) => turn.roleId === "presidente");
	if (president && president.status !== "speaking") return president;
	if (intensity === "direta") {
		const analyst = turns.find((turn) => turn.roleId === "analista");
		if (analyst && analyst.status !== "speaking") return analyst;
	}
}
function formatClock(totalSeconds) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function inlineMarks(text) {
	return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
		if (part.startsWith("**") && part.endsWith("**")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
			className: "font-medium text-ink",
			children: part.slice(2, -2)
		}, index);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: part }, index);
	});
}
function lineTone(line) {
	if (line.startsWith("SÓLIDA:") || line.startsWith("Fica:")) return "text-hold";
	if (line.startsWith("REJEITADA:") || line.startsWith("Cai:")) return "text-warn";
	if (line.startsWith("CONTESTADA:") || line.startsWith("Falta:") || line.startsWith("Prioridade:")) return "text-paper";
	return "";
}
function Prose({ text, className = "text-sm leading-relaxed" }) {
	const blocks = text.trim().split(/\n{2,}/);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `space-y-3 text-ink ${className}`,
		children: blocks.map((block, index) => {
			const lines = block.split("\n").filter((line) => line.trim().length > 0);
			if (lines.length > 0 && lines.every((line) => /^[-•]\s+/.test(line.trim()))) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-1.5 pl-4",
				children: lines.map((line, lineIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "list-disc marker:text-faint",
					children: inlineMarks(line.replace(/^[-•]\s+/, ""))
				}, lineIndex))
			}, index);
			if (lines.length > 1) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-1.5",
				children: lines.map((line, lineIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: lineTone(line.trim()),
					children: inlineMarks(line)
				}, lineIndex))
			}, index);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: lineTone(block.trim()),
				children: inlineMarks(block)
			}, index);
		})
	});
}
function CouncilApp() {
	const [question, setQuestion] = (0, import_react.useState)("");
	const [intensity, setIntensity] = (0, import_react.useState)("debate");
	const [phase, setPhase] = (0, import_react.useState)("idle");
	const [turns, setTurns] = (0, import_react.useState)([]);
	const [history, setHistory] = (0, import_react.useState)([]);
	const [historyOpen, setHistoryOpen] = (0, import_react.useState)(false);
	const [seconds, setSeconds] = (0, import_react.useState)(0);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [viewingPast, setViewingPast] = (0, import_react.useState)(false);
	const token = (0, import_react.useRef)(0);
	const resultsRef = (0, import_react.useRef)(null);
	const dialogRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		setHistory(loadHistory());
	}, []);
	(0, import_react.useEffect)(() => {
		if (phase !== "running") return;
		const started = Date.now();
		setSeconds(0);
		const id = window.setInterval(() => {
			setSeconds(Math.floor((Date.now() - started) / 1e3));
		}, 1e3);
		return () => window.clearInterval(id);
	}, [phase]);
	(0, import_react.useEffect)(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (historyOpen && !dialog.open) dialog.showModal();
		if (!historyOpen && dialog.open) dialog.close();
	}, [historyOpen]);
	const selected = INTENSITIES.find((item) => item.id === intensity) ?? INTENSITIES[1];
	const verdict = verdictOf(turns, intensity);
	const promotedId = verdict?.status === "done" || verdict?.status === "error" ? verdict.id : void 0;
	const argument = turns.filter((turn) => turn.id !== promotedId);
	const speaking = turns.find((turn) => turn.status === "speaking");
	const statusLine = phase === "running" ? speaking ? `${ROLES[speaking.roleId].title} em curso. ${formatClock(seconds)}` : `Sessão em curso. ${formatClock(seconds)}` : phase === "stopped" ? "Sessão interrompida." : phase === "done" ? verdict?.status === "done" ? "Sessão encerrada." : "A sessão terminou sem uma resposta." : "A câmara está ociosa.";
	const stageProgress = (0, import_react.useMemo)(() => {
		const present = STAGES.filter((stage) => turns.some((turn) => turn.stage === stage));
		return {
			present,
			current: turns.find((turn) => turn.status === "speaking")?.stage ?? present[present.length - 1]
		};
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
			resultsRef.current?.scrollIntoView({
				behavior: reduce ? "auto" : "smooth",
				block: "start"
			});
		});
		await runCouncil({
			question: trimmed,
			intensity,
			isCancelled: () => token.current !== my,
			onTurn: (turn) => {
				if (token.current !== my) return;
				setTurns((current) => upsert(current, turn));
			}
		});
		if (token.current !== my) return;
		setPhase("done");
		setTurns((current) => {
			const entry = {
				id: `${Date.now()}`,
				question: trimmed,
				intensity,
				at: Date.now(),
				turns: current.filter((turn) => turn.status !== "speaking")
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
		setTurns((current) => current.map((turn) => turn.status === "speaking" ? {
			...turn,
			status: "error",
			error: "Interrompido antes de concluir."
		} : turn));
	}
	function openPast(session) {
		token.current += 1;
		setQuestion(session.question);
		setIntensity(session.intensity);
		setTurns(session.turns);
		setPhase("done");
		setViewingPast(true);
		setHistoryOpen(false);
		setCopied(false);
	}
	function removePast(id) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "sr-only",
				"aria-live": "polite",
				children: statusLine
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-wide text-faint",
							children: "Câmara de raciocínio"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-2 font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl",
							children: "Conselho"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 max-w-lg text-sm leading-relaxed text-mute sm:text-base",
							children: "Nada é treinado. A mesma pergunta passa por métodos que discordam de propósito. A resposta final é o que sobrou da crítica — não a média de vários chats."
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setHistoryOpen(true),
					className: "inline-flex h-11 shrink-0 items-center gap-2 rounded-sm border border-line bg-panel px-3 text-sm font-medium text-ink transition-colors duration-(--motion-quick) hover:bg-raised",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, {
						className: "size-4",
						"aria-hidden": "true"
					}), "Sessões"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 grid items-start gap-6 lg:mt-10 lg:grid-cols-3 lg:gap-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-xl bg-panel p-4 lg:sticky lg:top-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "pergunta",
							className: "text-xs font-medium text-faint",
							children: "Pergunta"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							id: "pergunta",
							value: question,
							onChange: (event) => setQuestion(event.target.value),
							onKeyDown: (event) => {
								if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
									event.preventDefault();
									convene();
								}
							},
							maxLength: 2e3,
							rows: 7,
							placeholder: "Uma pergunta difícil o bastante para valer o debate.",
							className: "mt-2 w-full resize-y rounded-md border border-line bg-canvas px-3 py-3 text-sm leading-relaxed text-ink placeholder:text-faint"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex items-center justify-between text-xs text-faint tabular-nums",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [question.trim().length, " / 2000"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: "Ctrl + Enter"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
							className: "mt-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
									className: "text-xs font-medium text-faint",
									children: "Profundidade"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									role: "radiogroup",
									"aria-label": "Profundidade da sessão",
									className: "mt-2 grid grid-cols-3 gap-1 rounded-sm bg-canvas p-1",
									children: INTENSITIES.map((item) => {
										const active = item.id === intensity;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											role: "radio",
											"aria-checked": active,
											disabled: phase === "running",
											onClick: () => setIntensity(item.id),
											className: "rounded-xs px-2 py-2 text-left transition-colors duration-(--motion-quick) disabled:opacity-50 " + (active ? "bg-paper text-inkbtn" : "text-mute hover:text-ink"),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block text-sm font-medium",
												children: item.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mt-0.5 block text-xs " + (active ? "opacity-70" : "text-faint"),
												children: item.seats
											})]
										}, item.id);
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm leading-relaxed text-mute",
									children: selected.detail
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col gap-2 sm:flex-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void convene(),
								disabled: phase === "running" || question.trim().length < 8,
								className: "inline-flex h-11 flex-1 items-center justify-center rounded-sm bg-paper px-4 text-sm font-medium text-inkbtn transition-opacity duration-(--motion-quick) hover:opacity-90 disabled:opacity-40",
								children: phase === "running" ? "Em sessão" : `Convocar ${selected.title.toLowerCase()}`
							}), phase === "running" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: interrupt,
								className: "inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-line px-4 text-sm font-medium text-ink hover:bg-raised",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {
									className: "size-3.5 fill-current",
									"aria-hidden": "true"
								}), "Interromper"]
							}) : null]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 border-t border-line pt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium text-faint",
								children: "Para experimentar"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 flex flex-col gap-2",
								children: SAMPLES.map((sample) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: phase === "running",
									onClick: () => setQuestion(sample.text),
									className: "min-h-11 rounded-sm px-2 py-2 text-left text-sm text-mute transition-colors duration-(--motion-quick) hover:bg-raised hover:text-ink disabled:opacity-40",
									children: sample.label
								}, sample.label))
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					ref: resultsRef,
					className: "scroll-mt-6 min-w-0 lg:col-span-2",
					"aria-busy": phase === "running",
					children: [
						phase === "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Method, {}) : null,
						phase !== "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-end justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-medium text-faint",
										children: viewingPast ? "Sessão anterior" : statusLine
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "mt-1 font-display text-2xl font-medium tracking-tight text-ink",
										children: phase === "running" ? "A câmara está debatendo" : "Registro da sessão"
									})] }), phase === "running" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-display text-2xl tabular-nums text-paper",
										children: formatClock(seconds)
									}) : null]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
									className: "grid gap-2 sm:grid-cols-2 xl:grid-cols-4",
									children: STAGES.map((stage, index) => {
										const active = stageProgress.current === stage;
										const reached = stageProgress.present.includes(stage);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "rounded-md border px-3 py-3 " + (active ? "border-paper bg-raised" : "border-line bg-panel"),
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-xs tabular-nums text-faint",
													children: ["0", index + 1]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "mt-1 text-sm font-medium " + (reached ? "text-ink" : "text-faint"),
													children: STAGE_META[stage].title
												}),
												active && phase === "running" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "seat-live mt-3 block h-px bg-paper" }) : null
											]
										}, stage);
									})
								}),
								verdict ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Verdict, {
									turn: verdict,
									intensity,
									copied,
									onCopy: () => void copyVerdict()
								}) : null,
								argument.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-3",
									children: STAGES.map((stage) => {
										const group = argument.filter((turn) => turn.stage === stage);
										if (group.length === 0) return null;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
											className: "mb-2 text-xs font-medium tracking-wide text-faint",
											children: [STAGE_META[stage].title, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "ml-2 font-normal text-faint",
												children: STAGE_META[stage].note
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "space-y-3",
											children: group.map((turn) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeatCard, { turn }, turn.id))
										})] }, stage);
									})
								}) : null,
								phase === "stopped" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-mute",
									children: "Sessão interrompida. O que já foi dito continua acima; nada disso entra no histórico."
								}) : null
							]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-8 max-w-xl text-xs leading-relaxed text-faint",
							children: "Os assentos compartilham o mesmo modelo e divergem pelo método. Na crítica, as respostas chegam só como A, B e C — sem o nome de quem escreveu. Cada convocação gasta uso da sua conta."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dialog", {
				ref: dialogRef,
				"aria-labelledby": "sessoes-titulo",
				onClose: () => setHistoryOpen(false),
				className: "dialog-panel m-auto rounded-xl border border-line bg-panel p-0 text-ink",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3 border-b border-line px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "sessoes-titulo",
						className: "font-display text-xl font-medium",
						children: "Sessões"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setHistoryOpen(false),
						className: "h-10 rounded-sm px-3 text-sm text-mute hover:text-ink",
						children: "Fechar"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "history-scroll overflow-y-auto p-3",
					children: history.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-2 py-6 text-sm text-mute",
						children: "Nenhuma sessão ainda. Convoque a primeira."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-2",
						children: history.map((session) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-md bg-raised p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => openPast(session),
								className: "block w-full text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "line-clamp-2 text-sm text-ink",
									children: session.question
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "mt-1 block text-xs text-faint",
									children: [
										INTENSITIES.find((item) => item.id === session.intensity)?.title,
										" ·",
										" ",
										new Date(session.at).toLocaleString("pt-BR", {
											day: "2-digit",
											month: "short",
											hour: "2-digit",
											minute: "2-digit"
										})
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => removePast(session.id),
								className: "mt-2 text-xs text-faint hover:text-warn",
								children: "Apagar"
							})]
						}, session.id))
					})
				})]
			})
		]
	});
}
function Method() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-medium text-faint",
			children: "Como a câmara trabalha"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-2 max-w-md font-display text-3xl font-medium tracking-tight text-ink",
			children: "Quatro etapas. Um erro compartilhado não vira certeza."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "mt-6 grid gap-3 sm:grid-cols-2",
			children: [
				{
					n: "01",
					title: "Geração",
					body: "Assentos respondem sem se ver. Diversidade de método, não de marca."
				},
				{
					n: "02",
					title: "Crítica",
					body: "Outros assentos atacam as respostas com os autores ocultos."
				},
				{
					n: "03",
					title: "Laudo",
					body: "Cada afirmação fica sólida, contestada ou rejeitada."
				},
				{
					n: "04",
					title: "Síntese",
					body: "O presidente escreve só com o que sobreviveu."
				}
			].map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "rounded-lg bg-panel p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tabular-nums text-faint",
						children: step.n
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mt-2 text-base font-medium text-ink",
						children: step.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm leading-relaxed text-mute",
						children: step.body
					})
				]
			}, step.n))
		})
	] });
}
function Verdict({ turn, intensity, copied, onCopy }) {
	const direta = intensity === "direta";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-lg bg-raised p-4 sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium text-faint",
					children: direta ? "Resposta direta" : "Veredito"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mt-1 font-display text-2xl font-medium text-ink",
					children: turn.status === "error" ? "Este assento não concluiu" : direta ? "Analista" : "Presidente"
				})] }), turn.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: onCopy,
					className: "inline-flex h-10 items-center gap-2 rounded-sm border border-line px-3 text-sm text-ink hover:bg-panel",
					children: [copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
						className: "size-4",
						"aria-hidden": "true"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
						className: "size-4",
						"aria-hidden": "true"
					}), copied ? "Copiado" : "Copiar"]
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: turn.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Prose, {
					text: turn.text,
					className: "font-display text-lg leading-snug"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm leading-relaxed text-mute",
					children: turn.error ?? "Sem texto."
				})
			}),
			direta && turn.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-xs text-faint",
				children: "Consulta direta: ninguém revisou esta resposta."
			}) : null
		]
	});
}
function SeatCard({ turn }) {
	const role = ROLES[turn.roleId];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-lg border border-line bg-panel p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
					className: "text-sm font-medium text-ink",
					children: [role.title, turn.letter ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-2 text-faint",
						children: ["letra ", turn.letter]
					}) : null]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-faint",
					children: role.duty
				})]
			}),
			turn.status === "speaking" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "seat-live mt-3 block h-px bg-paper" }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children: turn.status === "speaking" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-mute",
					children: "Escrevendo…"
				}) : turn.status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-mute",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-warn",
						children: "Falha. "
					}), turn.error]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Prose, { text: turn.text })
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CouncilApp, {});
}
//#endregion
export { Home as component };
