from __future__ import annotations

import argparse
import json
import sqlite3
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "questions.sqlite"


class DungeonRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/health":
            self.send_json({"ok": True})
            return

        if parsed.path == "/api/questions/random":
            self.handle_random_question(parse_qs(parsed.query))
            return

        if parsed.path == "/api/questions/count":
            self.handle_question_count()
            return

        super().do_GET()

    def handle_random_question(self, query):
        if not DB_PATH.exists():
            self.send_json(
                {
                    "error": "Banco SQLite não encontrado. Rode: python scripts/init_db.py"
                },
                HTTPStatus.SERVICE_UNAVAILABLE,
            )
            return

        level = self.get_int(query, "level", 1)
        excluded_ids = self.get_excluded_ids(query)

        with sqlite3.connect(DB_PATH) as connection:
            connection.row_factory = sqlite3.Row
            question = self.fetch_question(connection, level, excluded_ids)

            if question is None:
                question = self.fetch_question(connection, level, [])

            if question is None:
                self.send_json({"error": "Nenhuma questão encontrada."}, HTTPStatus.NOT_FOUND)
                return

            options = connection.execute(
                """
                SELECT id, text, is_correct
                FROM question_options
                WHERE question_id = ?
                ORDER BY RANDOM()
                """,
                (question["id"],),
            ).fetchall()

        self.send_json(
            {
                "id": question["id"],
                "level": question["level"],
                "topic": question["topic"],
                "difficulty": question["difficulty"],
                "prompt": question["prompt"],
                "explanation": question["explanation"],
                "options": [
                    {
                        "id": option["id"],
                        "text": option["text"],
                        "isCorrect": bool(option["is_correct"]),
                    }
                    for option in options
                ],
            }
        )

    def handle_question_count(self):
        if not DB_PATH.exists():
            self.send_json({"total": 0, "byLevel": []})
            return

        with sqlite3.connect(DB_PATH) as connection:
            rows = connection.execute(
                """
                SELECT level, COUNT(*) AS total
                FROM questions
                WHERE active = 1
                GROUP BY level
                ORDER BY level
                """
            ).fetchall()

        self.send_json(
            {
                "total": sum(row[1] for row in rows),
                "byLevel": [{"level": row[0], "total": row[1]} for row in rows],
            }
        )

    def fetch_question(self, connection, level, excluded_ids):
        params = [level]
        exclude_sql = ""

        if excluded_ids:
            placeholders = ",".join("?" for _ in excluded_ids)
            exclude_sql = f"AND id NOT IN ({placeholders})"
            params.extend(excluded_ids)

        return connection.execute(
            f"""
            SELECT id, level, topic, difficulty, prompt, explanation
            FROM questions
            WHERE active = 1
              AND level = ?
              {exclude_sql}
            ORDER BY RANDOM()
            LIMIT 1
            """,
            params,
        ).fetchone()

    def get_int(self, query, name, default):
        try:
            return int(query.get(name, [default])[0])
        except (TypeError, ValueError):
            return default

    def get_excluded_ids(self, query):
        raw = query.get("exclude", [""])[0]
        ids = []

        for value in raw.split(","):
            value = value.strip()
            if not value:
                continue
            try:
                ids.append(int(value))
            except ValueError:
                continue

        return ids

    def send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description="Servidor local do Python Dungeon.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), DungeonRequestHandler)
    print(f"Python Dungeon rodando em http://{args.host}:{args.port}")
    print("Pressione Ctrl+C para encerrar.")
    server.serve_forever()


if __name__ == "__main__":
    main()
