const JSON_HEADERS = {
    "Accept": "application/json"
};

let questionsCache = null;

function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5);
}

async function loadQuestions() {
    if (questionsCache) {
        return questionsCache;
    }

    const response = await fetch("./data/questions.json", {
        headers: JSON_HEADERS
    });

    if (!response.ok) {
        throw new Error("Nao foi possivel carregar o banco de perguntas.");
    }

    questionsCache = await response.json();
    return questionsCache;
}

export async function getRandomQuestion(level, excludedIds = []) {
    const questions = await loadQuestions();
    const excluded = new Set(excludedIds);
    const levelQuestions = questions.filter((question) => question.level === level);
    let availableQuestions = levelQuestions.filter((question) => !excluded.has(question.id));

    if (availableQuestions.length === 0) {
        availableQuestions = levelQuestions;
    }

    if (availableQuestions.length === 0) {
        throw new Error("Nenhuma pergunta encontrada para este nivel.");
    }

    const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    return {
        ...question,
        options: shuffle(question.options)
    };
}
