// Static mode: reads from data/questions.json (compatible with GitHub Pages)
let _questionsCache = null;

async function loadQuestions() {
    if (_questionsCache) return _questionsCache;
    const response = await fetch("data/questions.json");
    if (!response.ok) throw new Error("Não foi possível carregar as questões.");
    _questionsCache = await response.json();
    return _questionsCache;
}

export async function getRandomQuestion(level, excludedIds = []) {
    const all = await loadQuestions();
    let pool = all.filter(q => q.level === level && !excludedIds.includes(q.id));

    // If all questions of this level were already used, reset
    if (pool.length === 0) {
        pool = all.filter(q => q.level === level);
    }

    if (pool.length === 0) {
        throw new Error("Nenhuma questão encontrada para esse nível.");
    }

    const question = pool[Math.floor(Math.random() * pool.length)];

    // Shuffle options (mimics the ORDER BY RANDOM() from the original API)
    const options = [...question.options].sort(() => Math.random() - 0.5);

    return { ...question, options };
}
