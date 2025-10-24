-- ============================================================================
-- SavePoint - DDL (Data Definition Language)
-- ============================================================================
-- Este arquivo contém a estrutura completa do banco de dados SavePoint
-- Apenas comandos de criação (CREATE) - SEM inserção de dados
-- ============================================================================

-- Criação do banco de dados
CREATE DATABASE IF NOT EXISTS savepoint
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE savepoint;

-- ============================================================================
-- Tabela: users
-- ============================================================================
-- Armazena informações básicas de autenticação dos usuários
-- ============================================================================
CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(30)     NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Tabela: user_profile
-- ============================================================================
-- Informações adicionais e personalizáveis do perfil do usuário
-- ============================================================================
CREATE TABLE user_profile (
  user_id        BIGINT UNSIGNED NOT NULL,
  display_name   VARCHAR(60)     NULL,
  avatar_url     VARCHAR(500)    NULL,
  birth_year     SMALLINT        NULL,
  guardian_email VARCHAR(255)    NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profile_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Tabela: games
-- ============================================================================
-- Catálogo de jogos disponíveis na plataforma
-- ============================================================================
CREATE TABLE games (
  id    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32)      NOT NULL,
  name  VARCHAR(80)      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_games_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Tabela: game_session
-- ============================================================================
-- Registro de todas as partidas jogadas pelos usuários
--
-- Campos adicionados para sistema de pontuação:
-- - difficulty: Nível de dificuldade (fácil, médio, difícil)
-- - theme: Tema escolhido no Jogo da Memória (geometria, animais, espaço)
-- - operation_type: Tipo de operação no Balão Matemático (soma, subtração, etc)
-- - status: Status da partida (completed, timeout, quit)
-- - metadata: Dados extras em JSON (pares encontrados, erros, etc)
-- ============================================================================
CREATE TABLE game_session (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED  NOT NULL,
  game_id          TINYINT UNSIGNED NOT NULL,
  score            INT UNSIGNED     NOT NULL DEFAULT 0,
  duration_seconds INT UNSIGNED     NULL,
  difficulty       VARCHAR(20)      NULL,
  theme            VARCHAR(30)      NULL,
  operation_type   VARCHAR(30)      NULL,
  status           VARCHAR(20)      DEFAULT 'completed',
  metadata         JSON             NULL,
  started_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at         DATETIME         NULL,
  client_version   VARCHAR(30)      NULL,
  device_info      VARCHAR(120)     NULL,
  PRIMARY KEY (id),
  KEY idx_session_user (user_id),
  KEY idx_session_game_score (game_id, score),
  KEY idx_session_ended (ended_at),
  KEY idx_game_score (game_id, score DESC),
  KEY idx_user_game (user_id, game_id),
  CONSTRAINT fk_session_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_session_game
    FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Fim do DDL
-- ============================================================================
-- Para popular o banco com dados iniciais (jogos), execute o arquivo de seeds
-- separadamente após criar a estrutura
-- ============================================================================
