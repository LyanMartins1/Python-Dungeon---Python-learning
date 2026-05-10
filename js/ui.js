import { GAME, TILE } from "./constants.js";

const elements = {
    maze: document.getElementById("maze"),
    level: document.getElementById("level-text"),
    levelMax: document.getElementById("level-max"),
    lives: document.getElementById("lives-text"),
    score: document.getElementById("score-text"),
    timerFill: document.getElementById("timer-fill"),
    timerText: document.getElementById("timer-text"),
    quizDialog: document.getElementById("quiz-dialog"),
    questionText: document.getElementById("question-text"),
    questionTopic: document.getElementById("question-topic"),
    questionDifficulty: document.getElementById("question-difficulty"),
    options: document.getElementById("options"),
    feedback: document.getElementById("feedback-text"),
    messageDialog: document.getElementById("message-dialog"),
    messageTitle: document.getElementById("message-title"),
    messageText: document.getElementById("message-text"),
    messageAction: document.getElementById("message-action")
};

export function renderHud(state) {
    elements.level.textContent = state.inSecretDungeon ? "Extra" : state.level;
    elements.levelMax.textContent = state.inSecretDungeon ? "" : `/${GAME.levels}`;
    renderLives(state.lives);
    elements.score.textContent = state.score;
    renderTimer(state);
}

function renderLives(lives) {
    elements.lives.innerHTML = "";
    elements.lives.setAttribute("aria-label", `${lives} de ${GAME.startingLives} vidas`);

    for (let index = 0; index < GAME.startingLives; index++) {
        const heart = document.createElement("span");
        const isFull = index < lives;
        heart.className = `heart ${isFull ? "heart--full" : "heart--empty"}`;
        heart.textContent = isFull ? "♥" : "♡";
        heart.setAttribute("aria-hidden", "true");
        elements.lives.appendChild(heart);
    }
}

export function renderTimer(state) {
    const percent = Math.max(0, Math.min(100, (state.timeLeft / state.questionTimeLimit) * 100));
    elements.timerFill.style.width = `${percent}%`;
    elements.timerFill.classList.toggle("is-low", percent <= 30);
    elements.timerText.textContent = `${state.timeLeft}s`;
}

export function renderMaze(state) {
    elements.maze.innerHTML = "";
    elements.maze.classList.toggle("maze--secret", state.inSecretDungeon);

    for (let y = 0; y < GAME.size; y++) {
        for (let x = 0; x < GAME.size; x++) {
            const cell = document.createElement("div");
            const tile = state.map[y][x];
            cell.className = "cell";

            if (tile === TILE.WALL) cell.classList.add("wall");
            if (tile === TILE.GATE) {
                cell.classList.add("gate");
                cell.textContent = "{}";
            }
            if (tile === TILE.FINISH) {
                cell.classList.add("finish");
                cell.textContent = ">>";
            }
            if (tile === TILE.TIME) {
                cell.classList.add("time-item");
                cell.textContent = "+";
            }
            if (tile === TILE.SECRET) {
                cell.classList.add("secret");
                cell.textContent = "?";
            }

            elements.maze.appendChild(cell);
        }
    }

    const player = document.createElement("div");
    player.id = "player";
    player.className = "player";
    player.textContent = "@";
    elements.maze.appendChild(player);
    updatePlayerPosition(state);
}

export function updatePlayerPosition(state) {
    const player = document.getElementById("player");
    player.style.setProperty("--player-x", state.player.x);
    player.style.setProperty("--player-y", state.player.y);
}

export function showQuestion(question, onAnswer) {
    elements.questionTopic.textContent = question.topic;
    elements.questionDifficulty.textContent = question.difficulty;
    elements.questionText.textContent = `>>> ${question.prompt}`;
    elements.feedback.textContent = "";
    elements.feedback.className = "feedback";
    elements.options.innerHTML = "";

    question.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.className = "option-button";
        button.type = "button";
        button.textContent = `${index + 1}. ${option.text}`;
        button.addEventListener("click", () => onAnswer(option));
        elements.options.appendChild(button);
    });

    if (!elements.quizDialog.open) {
        elements.quizDialog.showModal();
    }
}

export function setQuestionLoading() {
    elements.questionTopic.textContent = "Python";
    elements.questionDifficulty.textContent = "Carregando";
    elements.questionText.textContent = ">>> Buscando uma questao no banco SQLite...";
    elements.options.innerHTML = "";
    elements.feedback.textContent = "";

    if (!elements.quizDialog.open) {
        elements.quizDialog.showModal();
    }
}

export function showFeedback(message, isRight) {
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback ${isRight ? "is-right" : "is-wrong"}`;
}

export function closeQuestion() {
    if (elements.quizDialog.open) {
        elements.quizDialog.close();
    }
}

export function disableOptions() {
    elements.options.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
    });
}

export function showMessage({ title, text, actionText = "Continuar", onAction }) {
    elements.messageTitle.textContent = title;
    elements.messageText.textContent = text;
    elements.messageAction.textContent = actionText;
    elements.messageAction.onclick = () => {
        if (elements.messageDialog.open) {
            elements.messageDialog.close();
        }
        onAction?.();
    };

    if (!elements.messageDialog.open) {
        elements.messageDialog.showModal();
    }
}
