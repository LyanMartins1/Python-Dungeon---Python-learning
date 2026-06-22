import { GAME } from "./constants.js";

export function createInitialState() {
    return {
        level: 1,
        score: 0,
        lives: GAME.startingLives,
        canMove: true,
        player: { x: 0, y: 0 },
        map: [],
        secretLevel: 2 + Math.floor(Math.random() * 3),
        secretFound: false,
        inSecretDungeon: false,
        savedDungeon: null,
        currentQuestion: null,
        currentGate: null,
        answerLocked: false,
        answeredQuestionIds: new Set(),
        questionTimeLimit: GAME.baseQuestionTime,
        timeLeft: GAME.baseQuestionTime,
        timerId: null
    };
}
