-- =====================================================
-- CORREÇÃO: Sistema de Expiração de Notificações
-- =====================================================
-- Data: 14/11/2025
-- Descrição: Corrige notificações antigas sem expires_at
-- Aplica expiração retroativa baseada no status do desafio
-- =====================================================

-- IMPORTANTE: Execute este SQL no servidor de produção
-- Host: srv1549.hstgr.io (193.203.175.126)
-- Banco: u996520224_savepoint
-- User: u996520224_xihzkgwj

USE u996520224_savepoint;

-- =====================================================
-- PASSO 1: Verificar estrutura da tabela notifications
-- =====================================================
-- O campo expires_at já existe? Se não, executar:
-- ALTER TABLE notifications ADD COLUMN expires_at DATETIME NULL AFTER is_read;
-- ALTER TABLE notifications ADD INDEX idx_expires_at (expires_at);

-- =====================================================
-- PASSO 2: Limpar notificações antigas de desafios
-- =====================================================

-- Atualizar notificações de convites cujos desafios já completaram
UPDATE notifications n
JOIN challenges c ON JSON_EXTRACT(n.data, '$.challenge_id') = c.id
SET
    n.is_read = 1,
    n.expires_at = c.ends_at
WHERE n.type = 'challenge_invite'
  AND c.status IN ('completed', 'cancelled')
  AND n.expires_at IS NULL;

-- Atualizar notificações de convites cujos desafios já iniciaram (mas ainda ativos)
UPDATE notifications n
JOIN challenges c ON JSON_EXTRACT(n.data, '$.challenge_id') = c.id
SET
    n.expires_at = c.starts_at
WHERE n.type = 'challenge_invite'
  AND c.status IN ('active')
  AND n.expires_at IS NULL;

-- Atualizar notificações de convites de desafios pendentes
UPDATE notifications n
JOIN challenges c ON JSON_EXTRACT(n.data, '$.challenge_id') = c.id
SET
    n.expires_at = c.starts_at
WHERE n.type = 'challenge_invite'
  AND c.status = 'pending'
  AND n.expires_at IS NULL;

-- =====================================================
-- PASSO 3: Verificar resultados
-- =====================================================

-- Ver quantas notificações foram atualizadas
SELECT
    'Total de notificações' as metric,
    COUNT(*) as count
FROM notifications
UNION ALL
SELECT
    'Challenge invites com expires_at' as metric,
    COUNT(*) as count
FROM notifications
WHERE type = 'challenge_invite' AND expires_at IS NOT NULL
UNION ALL
SELECT
    'Challenge invites SEM expires_at' as metric,
    COUNT(*) as count
FROM notifications
WHERE type = 'challenge_invite' AND expires_at IS NULL
UNION ALL
SELECT
    'Notificações expiradas' as metric,
    COUNT(*) as count
FROM notifications
WHERE expires_at IS NOT NULL AND expires_at < NOW();

-- =====================================================
-- PASSO 4: Limpeza opcional (CUIDADO!)
-- =====================================================

-- OPCIONAL: Deletar notificações muito antigas (mais de 30 dias expiradas)
-- DESCOMENTE APENAS SE TIVER CERTEZA!
-- DELETE FROM notifications
-- WHERE expires_at IS NOT NULL
--   AND expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
--   AND is_read = 1;

-- =====================================================
-- RESUMO DAS MUDANÇAS NO CÓDIGO PHP
-- =====================================================
--
-- 1. api/teacher/create_challenge.php (linhas 185-226)
--    - Adiciona expires_at ao INSERT de notifications
--    - Convites expiram quando desafio inicia (starts_at)
--
-- 2. api/challenge/get_waiting_room.php (linhas 113-129)
--    - Marca notificações como lidas quando desafio completa
--    - Define expires_at = NOW()
--
-- 3. api/teacher/get_challenges.php (linhas 131-147)
--    - Mesma lógica de limpeza ao completar desafio
--
-- 4. api/teacher/cancel_challenge.php (linhas 88-96)
--    - Adiciona expires_at = NOW() ao cancelar
--
-- =====================================================
-- TESTADO EM: localhost
-- PRONTO PARA: produção (srv1549.hstgr.io)
-- =====================================================
