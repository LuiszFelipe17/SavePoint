# SavePoint – Aprendendo Brincando! 🎮✨

Plataforma de jogos educativos (alfabetização e raciocínio) para crianças.  

## 🎯 Funcionalidades
- Cadastro e login.
- Jogos: **Jogo da Memória** e **Balão Matemático**.
- **Pontuação acumulada** conforme joga.
- **Ranking (leaderboard)**: Top 10–50 geral e por jogo.
- **Perfil com foto** (avatar).

---

## 🧠 Modelo de Dados

### Conceitual
- **User** tem um **UserProfile** (1:1).
- **User** realiza muitas **GameSession** (1:N).
- **Game** é o catálogo de jogos e relaciona com **GameSession** (1:N).

### Lógico (tabelas)
- **users**: `id, username*, email*, password_hash, created_at...`
- **user_profile**: `user_id (PK/FK), display_name, avatar_url...`
- **games**: `id, code*, name`
- **game_session**: `id, user_id (FK), game_id (FK), theme, difficulty, score, started_at, ended_at...`

> `theme` ∈ {`geometria`, `animais`, `espaco`}  
> `difficulty` ∈ {`facil`, `medio`, `dificil`}
