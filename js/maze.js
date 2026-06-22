import { GAME, TILE } from "./constants.js";

const DIRECTIONS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
];

function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function inBounds(x, y, size) {
    return x >= 0 && x < size && y >= 0 && y < size;
}

function carveMaze(map, size) {
    const stack = [{ x: 0, y: 0 }];
    map[0][0] = TILE.FLOOR;

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const options = shuffle(DIRECTIONS)
            .map((direction) => ({
                x: current.x + direction.x * 2,
                y: current.y + direction.y * 2,
                wallX: current.x + direction.x,
                wallY: current.y + direction.y
            }))
            .filter((next) => inBounds(next.x, next.y, size) && map[next.y][next.x] === TILE.WALL);

        if (options.length === 0) {
            stack.pop();
            continue;
        }

        const next = options[0];
        map[next.wallY][next.wallX] = TILE.FLOOR;
        map[next.y][next.x] = TILE.FLOOR;
        stack.push({ x: next.x, y: next.y });
    }
}

function addLoops(map, size, chance) {
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            if (map[y][x] !== TILE.WALL || Math.random() > chance) continue;

            const horizontal = map[y][x - 1] === TILE.FLOOR && map[y][x + 1] === TILE.FLOOR;
            const vertical = map[y - 1][x] === TILE.FLOOR && map[y + 1][x] === TILE.FLOOR;

            if (horizontal || vertical) {
                map[y][x] = TILE.FLOOR;
            }
        }
    }
}

function addRooms(map, size, count) {
    for (let i = 0; i < count; i++) {
        const width = 2 + Math.floor(Math.random() * 3);
        const height = 2 + Math.floor(Math.random() * 3);
        const startX = 1 + Math.floor(Math.random() * (size - width - 2));
        const startY = 1 + Math.floor(Math.random() * (size - height - 2));

        let touchesFloor = false;
        for (let y = startY - 1; y <= startY + height; y++) {
            for (let x = startX - 1; x <= startX + width; x++) {
                if (inBounds(x, y, size) && map[y][x] === TILE.FLOOR) {
                    touchesFloor = true;
                }
            }
        }

        if (!touchesFloor) continue;

        for (let y = startY; y < startY + height; y++) {
            for (let x = startX; x < startX + width; x++) {
                map[y][x] = TILE.FLOOR;
            }
        }
    }
}

function getReachableTiles(map, start) {
    const size = map.length;
    const queue = [{ ...start, distance: 0 }];
    const visited = new Set([`${start.x},${start.y}`]);
    const tiles = [];

    while (queue.length > 0) {
        const current = queue.shift();
        tiles.push(current);

        for (const direction of DIRECTIONS) {
            const next = {
                x: current.x + direction.x,
                y: current.y + direction.y,
                distance: current.distance + 1
            };
            const key = `${next.x},${next.y}`;

            if (!inBounds(next.x, next.y, size) || visited.has(key)) continue;
            if (map[next.y][next.x] !== TILE.FLOOR) continue;

            visited.add(key);
            queue.push(next);
        }
    }

    return tiles;
}

function placeObjects(map, tiles, tileType, count, forbiddenKeys, minDistance = 5) {
    const candidates = shuffle(
        tiles.filter((tile) => tile.distance > minDistance && !forbiddenKeys.has(`${tile.x},${tile.y}`))
    );

    let placed = 0;
    for (const tile of candidates) {
        if (placed >= count) break;
        map[tile.y][tile.x] = tileType;
        forbiddenKeys.add(`${tile.x},${tile.y}`);
        placed++;
    }
}

export function generateMaze(level, options = {}) {
    const size = GAME.size;
    const map = Array.from({ length: size }, () => Array.from({ length: size }, () => TILE.WALL));
    const gates = options.gates ?? GAME.gatesPerLevel;
    const timeItems = options.timeItems ?? GAME.timeItemsPerLevel;
    const includeSecret = options.includeSecret ?? false;
    const loopBonus = options.loopBonus ?? 0;

    carveMaze(map, size);
    addLoops(map, size, 0.18 + level * 0.025 + loopBonus);
    addRooms(map, size, 2 + level + (options.extraRooms ?? 0));

    map[0][0] = TILE.FLOOR;

    const reachable = getReachableTiles(map, { x: 0, y: 0 }).sort((a, b) => b.distance - a.distance);
    const finish = reachable[0];
    map[finish.y][finish.x] = TILE.FINISH;

    const forbidden = new Set([
        "0,0",
        `${finish.x},${finish.y}`
    ]);

    if (includeSecret) {
        placeObjects(map, reachable, TILE.SECRET, 1, forbidden, 8);
    }

    placeObjects(map, reachable, TILE.GATE, gates, forbidden);
    placeObjects(map, reachable, TILE.TIME, timeItems, forbidden);

    return map;
}
