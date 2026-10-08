import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { n as ROLES, o as isRoleId } from "./roles-vBEqiZkw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/speak-rixPzShS.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var MODEL = "grok-4.5";
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
function messageText(content) {
	if (typeof content === "string") return content.trim();
	if (!Array.isArray(content)) return "";
	return content.map((part) => {
		if (typeof part === "string") return part;
		if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text;
		return "";
	}).join("").trim();
}
async function callModel(apiKey, roleId, question, dossier) {
	const role = ROLES[roleId];
	const user = [
		"Pergunta original:",
		question,
		"",
		dossier ? `Dossiê das etapas anteriores:\n${dossier}` : "Não há dossiê. Responda só a partir da pergunta.",
		"",
		"Escreva agora, apenas no papel deste assento."
	].join("\n");
	const body = JSON.stringify({
		model: MODEL,
		temperature: role.temperature,
		max_tokens: role.maxTokens,
		messages: [{
			role: "system",
			content: role.system
		}, {
			role: "user",
			content: user
		}]
	});
	const run = () => fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body,
		signal: AbortSignal.timeout(55e3)
	});
	let res = await run();
	if (res.status === 429 || res.status >= 500) {
		await new Promise((resolve) => setTimeout(resolve, 700));
		res = await run();
	}
	return res;
}
var speakSeat_createServerFn_handler = createServerRpc({
	id: "6e3b2a01d3d19cdba28da562e3d937ab877b4fbec31a3590c698aced51f799dd",
	name: "speakSeat",
	filename: "src/lib/council/speak.ts"
}, (opts) => speakSeat.__executeServer(opts));
var speakSeat = createServerFn({ method: "POST" }).validator(asSpeakInput).handler(speakSeat_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "A inteligência não está disponível neste ambiente."
	};
	try {
		const res = await callModel(apiKey, data.roleId, data.question, data.dossier);
		if (!res.ok) {
			if (res.status === 401 || res.status === 403) return {
				ok: false,
				error: "A conta de uso do Grok está sem créditos ou bloqueada. A câmara não inventa resposta no lugar."
			};
			let detail = "";
			try {
				detail = (await res.json()).error?.message?.slice(0, 180) ?? "";
			} catch {
				detail = "";
			}
			const suffix = detail ? ` ${detail}` : "";
			return {
				ok: false,
				error: `Este assento não respondeu (${res.status}).${suffix}`
			};
		}
		const text = messageText((await res.json()).choices?.[0]?.message?.content);
		if (!text) return {
			ok: false,
			error: "O assento devolveu uma resposta vazia."
		};
		return {
			ok: true,
			text
		};
	} catch (err) {
		return {
			ok: false,
			error: `Não foi possível consultar este assento. ${err instanceof Error ? err.message : "falha de rede"}`
		};
	}
});
//#endregion
export { speakSeat_createServerFn_handler };
