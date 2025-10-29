-- ============================================================================
-- SavePoint - Migração para corrigir Login (Erro 500)
-- ============================================================================
-- Execute este SQL no phpMyAdmin da hospedagem para corrigir o login
-- ============================================================================

USE u996520224_savepoint;

-- Adicionar campos de controle de login na tabela users
-- (Se os campos já existirem, vai dar erro mas não tem problema)
ALTER TABLE users
  ADD COLUMN last_login DATETIME NULL AFTER updated_at,
  ADD COLUMN login_attempts TINYINT(3) UNSIGNED NOT NULL DEFAULT 0 AFTER last_login,
  ADD COLUMN locked_until DATETIME NULL AFTER login_attempts,
  ADD KEY idx_last_login (last_login),
  ADD KEY idx_locked_until (locked_until);

-- Criar tabela login_attempts para rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip_address VARCHAR(45) NOT NULL,
  identifier VARCHAR(255) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_ip_time (ip_address, attempted_at),
  KEY idx_identifier_time (identifier, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Fim da migração
-- ============================================================================
-- Após executar este SQL, teste o login em https://savepoint.click/login/
-- ============================================================================
