-- ============================================================================
-- SavePoint - DDL (Data Definition Language)
-- ============================================================================
-- Este arquivo contém a estrutura completa do banco de dados SavePoint
-- Comandos de criação (CREATE) + dados obrigatórios do sistema
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
-- Tabela: palavras_portugues
-- ============================================================================
-- Banco de palavras para o jogo "Complete a Palavra"
-- Contém palavras educacionais organizadas por categoria e dificuldade
-- ============================================================================
CREATE TABLE palavras_portugues (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  palavra VARCHAR(30) NOT NULL,
  dica VARCHAR(150) NOT NULL,
  categoria VARCHAR(30) NOT NULL,
  dificuldade ENUM('facil', 'medio', 'dificil') NOT NULL,
  PRIMARY KEY (id),
  KEY idx_dificuldade (dificuldade),
  KEY idx_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DADOS OBRIGATÓRIOS
-- ============================================================================
-- Estes dados são NECESSÁRIOS para o funcionamento do sistema
-- As APIs de pontuação e ranking dependem destes registros
-- ============================================================================

-- Jogos disponíveis na plataforma
INSERT INTO games (code, name) VALUES
  ('memory', 'Jogo da Memória'),
  ('math', 'Balão Matemático'),
  ('portuguese', 'Complete a Palavra')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Palavras para o jogo "Complete a Palavra" (60 palavras educacionais)
INSERT INTO palavras_portugues (palavra, dica, categoria, dificuldade) VALUES
-- ANIMAIS (15 palavras)
('GATO', 'Animal doméstico que faz miau', 'animais', 'facil'),
('CACHORRO', 'Melhor amigo do homem', 'animais', 'medio'),
('ELEFANTE', 'Maior animal terrestre com tromba', 'animais', 'dificil'),
('GIRAFA', 'Animal de pescoço muito longo', 'animais', 'medio'),
('MACACO', 'Animal que gosta de banana', 'animais', 'medio'),
('TIGRE', 'Grande felino listrado', 'animais', 'facil'),
('LEAO', 'Rei da selva', 'animais', 'facil'),
('ZEBRA', 'Animal listrado de preto e branco', 'animais', 'facil'),
('PANDA', 'Urso preto e branco da China', 'animais', 'facil'),
('CORUJA', 'Ave noturna muito sábia', 'animais', 'medio'),
('TARTARUGA', 'Animal lento com casco', 'animais', 'dificil'),
('PINGUIM', 'Ave que não voa e vive no gelo', 'animais', 'medio'),
('CAVALO', 'Animal usado para cavalgar', 'animais', 'medio'),
('COELHO', 'Animal que pula e tem orelhas longas', 'animais', 'medio'),
('PAPAGAIO', 'Ave colorida que pode falar', 'animais', 'dificil'),

-- OBJETOS (15 palavras)
('CADEIRA', 'Móvel para sentar', 'objetos', 'medio'),
('MESA', 'Móvel para estudar ou comer', 'objetos', 'facil'),
('LAPIS', 'Usado para escrever e desenhar', 'objetos', 'facil'),
('LIVRO', 'Objeto com páginas para ler', 'objetos', 'facil'),
('RELOGIO', 'Mostra as horas', 'objetos', 'medio'),
('TELEFONE', 'Aparelho para fazer ligações', 'objetos', 'dificil'),
('COMPUTADOR', 'Máquina eletrônica para trabalhar', 'objetos', 'dificil'),
('BICICLETA', 'Veículo de duas rodas', 'objetos', 'dificil'),
('TESOURA', 'Ferramenta para cortar papel', 'objetos', 'medio'),
('BORRACHA', 'Apaga o que está escrito a lápis', 'objetos', 'dificil'),
('CADERNO', 'Conjunto de folhas para escrever', 'objetos', 'medio'),
('MOCHILA', 'Bolsa usada nas costas', 'objetos', 'medio'),
('PORTA', 'Abre e fecha a entrada', 'objetos', 'facil'),
('JANELA', 'Por onde entra luz e ar', 'objetos', 'medio'),
('ESPELHO', 'Reflete nossa imagem', 'objetos', 'medio'),

-- NATUREZA (10 palavras)
('FLOR', 'Parte colorida e bonita da planta', 'natureza', 'facil'),
('ARVORE', 'Planta grande com tronco e folhas', 'natureza', 'medio'),
('NUVEM', 'Algodão branco no céu', 'natureza', 'facil'),
('SOL', 'Estrela que ilumina o dia', 'natureza', 'facil'),
('LUA', 'Aparece no céu à noite', 'natureza', 'facil'),
('ESTRELA', 'Pontinhos brilhantes no céu', 'natureza', 'medio'),
('MONTANHA', 'Elevação muito alta de terra', 'natureza', 'dificil'),
('RIO', 'Água doce que corre', 'natureza', 'facil'),
('PRAIA', 'Lugar com areia e mar', 'natureza', 'facil'),
('OCEANO', 'Grande quantidade de água salgada', 'natureza', 'medio'),

-- ALIMENTOS (10 palavras)
('BANANA', 'Fruta amarela e comprida', 'alimentos', 'medio'),
('MACA', 'Fruta redonda vermelha ou verde', 'alimentos', 'facil'),
('LARANJA', 'Fruta cítrica alaranjada', 'alimentos', 'medio'),
('UVA', 'Frutinha redonda em cacho', 'alimentos', 'facil'),
('MELANCIA', 'Fruta grande verde e vermelha', 'alimentos', 'dificil'),
('TOMATE', 'Fruto vermelho usado em saladas', 'alimentos', 'medio'),
('CENOURA', 'Legume laranja que coelhos adoram', 'alimentos', 'medio'),
('BATATA', 'Tubérculo usado para fazer fritas', 'alimentos', 'medio'),
('ARROZ', 'Grão branco muito usado no Brasil', 'alimentos', 'facil'),
('FEIJAO', 'Usado com arroz na comida brasileira', 'alimentos', 'medio'),

-- AÇÕES (10 palavras)
('CORRER', 'Mover-se rapidamente', 'acoes', 'medio'),
('PULAR', 'Saltar com os pés', 'acoes', 'facil'),
('NADAR', 'Mover-se na água', 'acoes', 'facil'),
('VOAR', 'Mover-se pelo ar', 'acoes', 'facil'),
('COMER', 'Ingerir alimentos', 'acoes', 'facil'),
('BEBER', 'Ingerir líquidos', 'acoes', 'facil'),
('DORMIR', 'Descansar fechando os olhos', 'acoes', 'medio'),
('ESTUDAR', 'Aprender coisas novas', 'acoes', 'medio'),
('BRINCAR', 'Divertir-se com jogos', 'acoes', 'medio'),
('CANTAR', 'Produzir sons musicais com a voz', 'acoes', 'medio');

-- ============================================================================
-- Fim do DDL
-- ============================================================================
-- Copie e cole este arquivo completo no phpMyAdmin ou terminal MySQL
-- para criar o banco de dados SavePoint pronto para uso
-- ============================================================================
