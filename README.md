# Python Dungeon

Jogo educacional em HTML, CSS, JavaScript puro e Python, com perguntas carregadas de um banco SQLite local.

## Como rodar

Crie ou recrie o banco de questões:

```bash
python scripts/init_db.py
```

Inicie o servidor local:

```bash
python server/app.py
```

Abra o jogo no navegador:

```text
http://127.0.0.1:8000
```

## Estrutura

```text
index.html              Entrada da aplicação
css/style.css           Estilos do jogo
js/                     Lógica do frontend
server/app.py           Servidor HTTP e API das questões
data/schema.sql         Estrutura do banco SQLite
data/questions.sqlite   Banco local com as questões
scripts/init_db.py      Script para recriar e popular o banco
```

## Dungeon secreta

Uma fase normal entre os niveis 2 e 4 recebe uma runa secreta. Ao coletar essa runa, o jogador entra em uma dungeon extra com mais portas, mais coletaveis de tempo e 250 XP por resposta correta. Ao encontrar a saida da dungeon extra, o jogo retorna para a fase original mantendo o XP conquistado.

## API local

```text
GET /api/health
GET /api/questions/count
GET /api/questions/random?level=1
GET /api/questions/random?level=1&exclude=1,2,3
```
