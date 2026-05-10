const JSON_HEADERS = {
    "Accept": "application/json"
};

export async function getRandomQuestion(level, excludedIds = []) {
    const params = new URLSearchParams({
        level: String(level)
    });

    if (excludedIds.length > 0) {
        params.set("exclude", excludedIds.join(","));
    }

    const response = await fetch(`/api/questions/random?${params}`, {
        headers: JSON_HEADERS
    });

    if (!response.ok) {
        throw new Error("Não foi possível carregar a pergunta.");
    }

    return response.json();
}
