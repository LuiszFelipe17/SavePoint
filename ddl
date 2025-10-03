CREATE DATABASE IF NOT EXISTS savepoint
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE savepoint;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

CREATE TABLE games (
  id    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32)      NOT NULL,
  name  VARCHAR(80)      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_games_code (code)
) ENGINE=InnoDB;

CREATE TABLE game_session (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  game_id          TINYINT UNSIGNED NOT NULL,
  score            INT UNSIGNED     NOT NULL DEFAULT 0,
  duration_seconds INT UNSIGNED     NULL,
  started_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at         DATETIME         NULL,
  client_version   VARCHAR(30)      NULL,
  device_info      VARCHAR(120)     NULL,
  PRIMARY KEY (id),
  KEY idx_session_user (user_id),
  KEY idx_session_game_score (game_id, score),
  KEY idx_session_ended (ended_at),
  CONSTRAINT fk_session_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_session_game
    FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT INTO games (code, name) VALUES
  ('memory', 'Jogo da Memória'),
  ('math',   'Balão Matemático')
ON DUPLICATE KEY UPDATE name = VALUES(name);
