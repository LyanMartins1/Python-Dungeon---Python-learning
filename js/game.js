import { getRandomQuestion } from "./api.js";
import { GAME, TILE } from "./constants.js";
import { generateMaze } from "./maze.js";
import { createInitialState } from "./state.js";
import {
    closeQuestion,
    disableOptions,
    hideTimer,
    renderHud,
    renderMaze,
    renderTimer,
    setQuestionLoading,
    showFeedback,
    showMessage,
    showQuestion,
    showTimer,
    updatePlayerPosition
} from "./ui.js";

const state = createInitialState();

function cloneMap(map) {
    return map.map((row) => [...row]);
}

function shouldPlaceSecret() {
    return !state.secretFound && !state.inSecretDungeon && state.level === state.secretLevel;
}

function resetLevel() {
    state.canMove = true;
    state.inSecretDungeon = false;
    state.player = { x: 0, y: 0 };
    state.map = generateMaze(state.level, {
        includeSecret: shouldPlaceSecret()
    });
    state.questionTimeLimit = Math.min(
        GAME.maxQuestionTime,
        GAME.baseQuestionTime + (state.level - 1)
    );
    state.timeLeft = state.questionTimeLimit;
    renderHud(state);
    renderMaze(state);
}

function clearQuestionTimer() {
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
}

function startQuestionTimer() {
    clearQuestionTimer();
    state.timeLeft = state.questionTimeLimit;
    showTimer();
    renderTimer(state);

    state.timerId = setInterval(() => {
        state.timeLeft--;
        renderTimer(state);

        if (state.timeLeft <= 0) {
            clearQuestionTimer();
            loseLife("Tempo esgotado.", "A porta continua fechada. Tente outra vez com calma.");
        }
    }, 1000);
}

function loseLife(title, text) {
    clearQuestionTimer();
    hideTimer();
    state.lives--;
    renderHud(state);
    state.currentQuestion = null;
    state.currentGate = null;
    state.answerLocked = false;

    if (state.lives <= 0) {
        state.canMove = false;
        closeQuestion();
        showMessage({
            title: "Game Over",
            text: `${title} Sua jornada terminou com ${state.score} XP.`,
            actionText: "Reiniciar",
            onAction: () => window.location.reload()
        });
        return;
    }

    closeQuestion();
    state.canMove = false;
    showMessage({
        title,
        text,
        actionText: "Voltar ao mapa",
        onAction: () => {
            state.canMove = true;
        }
    });
}

function getQuestionLevel() {
    if (!state.inSecretDungeon) return state.level;
    return Math.min(GAME.levels, state.level + 1);
}

function getQuestionXp() {
    if (state.inSecretDungeon) return GAME.secretQuestionXp;
    return state.level * 100;
}

async function openGate(y, x) {
    state.canMove = false;
    state.currentGate = { x, y };
    state.answerLocked = false;
    setQuestionLoading();

    try {
        const question = await getRandomQuestion(getQuestionLevel(), [...state.answeredQuestionIds]);
        state.currentQuestion = question;
        showQuestion(question, handleAnswer);
        startQuestionTimer();
    } catch (error) {
        closeQuestion();
        showMessage({
            title: "Banco indisponivel",
            text: "Nao consegui buscar uma pergunta no SQLite. Verifique se o servidor Python esta rodando.",
            actionText: "Voltar ao mapa",
            onAction: () => {
                state.canMove = true;
            }
        });
    }
}

function handleAnswer(option) {
    if (!state.currentQuestion || state.answerLocked) return;

    state.answerLocked = true;
    disableOptions();
    clearQuestionTimer();
    hideTimer();

    if (option.isCorrect) {
        state.answeredQuestionIds.add(state.currentQuestion.id);
        state.score += getQuestionXp();
        state.map[state.currentGate.y][state.currentGate.x] = TILE.FLOOR;
        renderHud(state);
        renderMaze(state);
        showFeedback(state.currentQuestion.explanation, true, () => {
            closeQuestion();
            state.canMove = true;
            state.currentQuestion = null;
            state.currentGate = null;
            state.answerLocked = false;
        });
        return;
    }

    const correct = state.currentQuestion.options.find((item) => item.isCorrect);
    showFeedback(`Resposta correta: ${correct.text}. ${state.currentQuestion.explanation}`, false, () => {
        loseLife("Resposta incorreta.", "Voce perdeu 1 vida, mas ganhou uma dica para tentar de novo.");
    });
}

function collectTimeItem(y, x) {
    state.canMove = false;
    state.map[y][x] = TILE.FLOOR;
    state.questionTimeLimit = Math.min(
        GAME.maxQuestionTime,
        state.questionTimeLimit + GAME.timeItemBonus
    );
    state.timeLeft = state.questionTimeLimit;
    state.player = { x, y };
    renderHud(state);
    renderMaze(state);

    showMessage({
        title: "Tempo extra",
        text: `As proximas questoes deste mapa terao ${state.questionTimeLimit}s.`,
        actionText: "Continuar",
        onAction: () => {
            state.canMove = true;
        }
    });
}

function collectSecret(y, x) {
    state.canMove = false;
    state.secretFound = true;
    state.map[y][x] = TILE.FLOOR;
    state.player = { x, y };
    state.savedDungeon = {
        level: state.level,
        map: cloneMap(state.map),
        player: { ...state.player },
        questionTimeLimit: state.questionTimeLimit,
        timeLeft: state.timeLeft
    };
    renderMaze(state);

    showMessage({
        title: "Passagem secreta",
        text: "Voce encontrou uma runa escondida. Ela abre uma dungeon extra com mais portas e 250 XP por acerto.",
        actionText: "Entrar",
        onAction: enterSecretDungeon
    });
}

function enterSecretDungeon() {
    state.inSecretDungeon = true;
    state.canMove = true;
    state.player = { x: 0, y: 0 };
    state.map = generateMaze(getQuestionLevel(), {
        gates: GAME.secretGatesPerLevel,
        timeItems: GAME.secretTimeItems,
        loopBonus: 0.12,
        extraRooms: 2
    });
    state.questionTimeLimit = Math.min(GAME.maxQuestionTime, GAME.baseQuestionTime + 6);
    state.timeLeft = state.questionTimeLimit;
    renderHud(state);
    renderMaze(state);
}

function exitSecretDungeon() {
    const saved = state.savedDungeon;
    state.inSecretDungeon = false;
    state.savedDungeon = null;
    state.canMove = false;

    if (saved) {
        state.level = saved.level;
        state.map = cloneMap(saved.map);
        state.player = { ...saved.player };
        state.questionTimeLimit = saved.questionTimeLimit;
        state.timeLeft = saved.timeLeft;
    }

    renderHud(state);
    renderMaze(state);
    showMessage({
        title: "Retorno ao mapa",
        text: "Voce saiu da dungeon secreta mantendo todo o XP extra conquistado.",
        actionText: "Continuar",
        onAction: () => {
            state.canMove = true;
        }
    });
}

function nextLevel() {
    if (state.inSecretDungeon) {
        exitSecretDungeon();
        return;
    }

    if (state.level >= GAME.levels) {
        state.canMove = false;
        showMessage({
            title: "Sistema Masterizado",
            text: `Pontuacao final: ${state.score} XP. Rank: ${getRank()}.`,
            actionText: "Reiniciar jornada",
            onAction: () => window.location.reload()
        });
        return;
    }

    state.level++;
    resetLevel();
}

function getRank() {
    if (state.score >= 4500) return "Python Dev Master";
    if (state.score >= 2600) return "Developer";
    return "Comecou bem";
}

function movePlayer(dx, dy) {
    if (!state.canMove) return;

    const next = {
        x: state.player.x + dx,
        y: state.player.y + dy
    };

    if (next.x < 0 || next.x >= GAME.size || next.y < 0 || next.y >= GAME.size) return;

    const tile = state.map[next.y][next.x];
    if (tile === TILE.WALL) return;
    if (tile === TILE.GATE) {
        openGate(next.y, next.x);
        return;
    }
    if (tile === TILE.TIME) {
        collectTimeItem(next.y, next.x);
        return;
    }
    if (tile === TILE.SECRET) {
        collectSecret(next.y, next.x);
        return;
    }
    if (tile === TILE.FINISH) {
        const remainingGates = state.map.flat().filter((t) => t === TILE.GATE).length;
        if (remainingGates > 0) {
            state.canMove = false;
            showMessage({
                title: "Saida bloqueada",
                text: `Ainda restam ${remainingGates} questao(oes) no labirinto. Resolva todas para avancar.`,
                actionText: "Voltar ao mapa",
                onAction: () => {
                    state.canMove = true;
                }
            });
            return;
        }
        nextLevel();
        return;
    }

    state.player = next;
    updatePlayerPosition(state);
}

function togglePause() {
    const pauseDialog = document.getElementById("pause-dialog");

    if (pauseDialog.open) {
        pauseDialog.close();
        state.canMove = true;
        return;
    }

    // Don't open pause if any other dialog is active
    if (state.currentQuestion) return;
    if (document.getElementById("intro-dialog").open) return;
    if (document.getElementById("message-dialog").open) return;
    if (document.getElementById("quiz-dialog").open) return;

    state.canMove = false;
    pauseDialog.showModal();
}

function handleKeydown(event) {
    if (event.key === "Escape") {
        event.preventDefault();
        togglePause();
        return;
    }

    const keys = {
        ArrowUp: [0, -1],
        ArrowRight: [1, 0],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0]
    };

    if (state.currentQuestion && ["1", "2", "3", "4"].includes(event.key)) {
        const index = Number(event.key) - 1;
        const option = state.currentQuestion.options[index];
        if (option) handleAnswer(option);
        return;
    }

    if (!keys[event.key]) return;
    event.preventDefault();
    movePlayer(keys[event.key][0], keys[event.key][1]);
}

function showIntroScreen() {
    const introDialog = document.getElementById("intro-dialog");
    const startButton = document.getElementById("intro-start");

    state.canMove = false;
    introDialog.showModal();

    startButton.addEventListener("click", () => {
        introDialog.close();
        state.canMove = true;
    }, { once: true });
}

function setupPauseMenu() {
    const pauseDialog = document.getElementById("pause-dialog");

    document.getElementById("pause-resume").addEventListener("click", () => {
        pauseDialog.close();
        state.canMove = true;
    });

    document.getElementById("pause-restart-level").addEventListener("click", () => {
        pauseDialog.close();
        resetLevel();
    });

    document.getElementById("pause-restart-game").addEventListener("click", () => {
        pauseDialog.close();
        window.location.reload();
    });

    pauseDialog.addEventListener("cancel", (e) => {
        e.preventDefault();
    });
}

export function startGame() {
    resetLevel();
    hideTimer();
    window.addEventListener("keydown", handleKeydown);
    setupPauseMenu();
    showIntroScreen();
}
