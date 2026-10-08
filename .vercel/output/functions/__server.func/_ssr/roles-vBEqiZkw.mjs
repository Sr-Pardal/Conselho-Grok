//#region node_modules/.nitro/vite/services/ssr/assets/roles-vBEqiZkw.js
var ROLE_IDS = [
	"analista",
	"quantitativo",
	"alternativas",
	"cetico",
	"premissas",
	"verificador",
	"presidente"
];
var STAGES = [
	"geracao",
	"critica",
	"verificacao",
	"sintese"
];
var SHARED = [
	"Você integra o Conselho: métodos diferentes sobre a mesma pergunta, não um chat único.",
	"Responda no idioma da pergunta.",
	"Seja concreto. Não invente números, citações ou fontes.",
	"Se faltar dado, diga o que falta e siga com o que ainda dá para afirmar.",
	"Sem preâmbulo, sem 'como modelo de linguagem', sem elogiar a pergunta."
].join(" ");
var ROLES = {
	analista: {
		title: "Analista",
		duty: "Resolve de frente",
		stage: "geracao",
		temperature: .3,
		maxTokens: 700,
		system: `${SHARED} Papel: Analista. Entregue a melhor resposta direta, em parágrafos curtos. Separe fato de julgamento. Não liste dez opções se uma resolve.`
	},
	quantitativo: {
		title: "Quantitativo",
		duty: "Mede custo e limite",
		stage: "geracao",
		temperature: .2,
		maxTokens: 550,
		system: `${SHARED} Papel: Quantitativo. Procure ordens de grandeza, trade-offs, custos, tempos e limites. Estimativas vêm com intervalo e a palavra "estimativa". Não escreva um ensaio genérico.`
	},
	alternativas: {
		title: "Alternativas",
		duty: "Procura outro caminho",
		stage: "geracao",
		temperature: .6,
		maxTokens: 550,
		system: `${SHARED} Papel: Alternativas. Procure um caminho mais simples, uma reformulação do problema, ou diga com franqueza quando a resposta óbvia é a certa. Não invente complexidade para parecer útil.`
	},
	cetico: {
		title: "Cético",
		duty: "Tenta derrubar",
		stage: "critica",
		temperature: .5,
		maxTokens: 500,
		system: `${SHARED} Papel: Cético. Você recebe respostas anônimas marcadas com letras. Ataque afirmações, não autores. Para cada letra: o que cai e o que fica. Feche com três linhas começando exatamente por "Cai:", "Fica:" e "Falta:". Não dê o veredito final ao usuário.`
	},
	premissas: {
		title: "Premissas",
		duty: "Acha o que ficou implícito",
		stage: "critica",
		temperature: .4,
		maxTokens: 500,
		system: `${SHARED} Papel: Premissas. Você recebe respostas anônimas. Liste premissas ocultas e um contraexemplo concreto para cada afirmação forte. Diga quais afirmações continuam de pé mesmo assim. Não escreva a resposta final.`
	},
	verificador: {
		title: "Verificador",
		duty: "Separa o que ficou de pé",
		stage: "verificacao",
		temperature: .2,
		maxTokens: 550,
		system: `${SHARED} Papel: Verificador. Classifique afirmações importantes, uma por linha, começando exatamente por "SÓLIDA:", "CONTESTADA:" ou "REJEITADA:" e uma frase de motivo. Feche com uma linha "Prioridade:" dizendo o que a síntese deve obedecer. Não escreva a resposta final ao usuário.`
	},
	presidente: {
		title: "Presidente",
		duty: "Fica com o que restou",
		stage: "sintese",
		temperature: .3,
		maxTokens: 900,
		system: `${SHARED} Papel: Presidente. Escreva a resposta final para quem perguntou. Use só o que sobreviveu à crítica. Se algo está contestado, mostre o conflito em vez de fazer média. Estrutura: primeiro a conclusão em um ou dois parágrafos; depois um bloco "Por quê"; depois um bloco "Em aberto". Sem citar o aparato do conselho, salvo quando um desacordo real precisa aparecer.`
	}
};
var STAGE_META = {
	geracao: {
		title: "Geração",
		note: "Cada assento responde sem ver os outros."
	},
	critica: {
		title: "Crítica",
		note: "Os autores ficam ocultos."
	},
	verificacao: {
		title: "Laudo",
		note: "Sólido, contestado ou rejeitado."
	},
	sintese: {
		title: "Síntese",
		note: "Só entra o que restou."
	}
};
var INTENSITIES = [
	{
		id: "direta",
		title: "Direta",
		seats: "1 assento",
		detail: "Uma resposta, sem revisão cruzada. Serve para uma pergunta estreita."
	},
	{
		id: "debate",
		title: "Debate",
		seats: "3 assentos",
		detail: "Um analista responde, um cético tenta derrubar, o presidente fica com o que sobrou."
	},
	{
		id: "plenario",
		title: "Plenário",
		seats: "7 assentos",
		detail: "Três caminhos independentes, duas críticas anônimas, um laudo e a síntese. Mais lento, mais difícil de autoengano."
	}
];
var SAMPLES = [
	{
		label: "Modelos no seu PC",
		text: "Tenho um Ryzen 5 5600GT e 16 GB de RAM, sem GPU dedicada. Quero usar várias IAs em conjunto para perguntas difíceis. O que é realista: modelos locais pequenos, um modelo só com papéis diferentes, ou várias chamadas online? Considere velocidade, qualidade e o risco de todos errarem a mesma coisa."
	},
	{
		label: "Estudar em 30 dias",
		text: "Quero aprender o básico de um assunto difícil em 30 dias, com cerca de 1 hora por dia. Qual plano ainda funciona se eu falhar dois dias por semana e se o material gratuito for irregular?"
	},
	{
		label: "Ladino no grupo",
		text: "RPG de mesa: sou um ladino num grupo que já tem mago e tanque. Que estratégia de combate e progressão continua boa quando o mestre pune furtividade repetida e o mago resolve as cenas sociais?"
	}
];
function isRoleId(value) {
	return ROLE_IDS.includes(value);
}
//#endregion
export { STAGE_META as a, STAGES as i, ROLES as n, isRoleId as o, SAMPLES as r, INTENSITIES as t };
