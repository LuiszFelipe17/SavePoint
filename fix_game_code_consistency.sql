-- =====================================================
-- CORREÇÃO: Consistência de game_code
-- =====================================================
-- Data: 14/11/2025
-- Descrição: Corrige code de 'portuguese' para 'portugues'
--            para manter consistência com pasta/URL
-- =====================================================

-- IMPORTANTE: Execute este SQL no servidor de produção
-- Host: srv1549.hstgr.io (193.203.175.126)
-- Banco: u996520224_savepoint

USE u996520224_savepoint;

-- Atualizar code do jogo de português
UPDATE games
SET code = 'portugues'
WHERE id = 3 AND code = 'portuguese';

-- Verificar resultado
SELECT id, code, name FROM games ORDER BY id;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- id=1, code='memory', name='Jogo da Memória'
-- id=2, code='math', name='Balão Matemático'
-- id=3, code='portugues', name='Complete a Palavra'
-- =====================================================
