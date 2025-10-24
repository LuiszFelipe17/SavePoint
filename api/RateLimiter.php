<?php
/**
 * RateLimiter - Sistema Anti-Brute Force
 *
 * Controla tentativas de login para prevenir ataques de força bruta
 * - Máximo 5 tentativas em 15 minutos
 * - Bloqueio temporário de conta após falhas consecutivas
 */
class RateLimiter {

    private PDO $pdo;

    // Configurações
    const MAX_ATTEMPTS = 5;              // Máximo de tentativas
    const TIME_WINDOW = 900;             // Janela de tempo (15 min em segundos)
    const LOCKOUT_TIME = 900;            // Tempo de bloqueio (15 min em segundos)
    const CLEANUP_PROBABILITY = 0.01;    // 1% de chance de limpar registros antigos

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;

        // Probabilisticamente limpar registros antigos
        if (mt_rand(1, 100) <= self::CLEANUP_PROBABILITY * 100) {
            $this->cleanupOldRecords();
        }
    }

    /**
     * Verifica se um IP está bloqueado
     *
     * @param string $ip Endereço IP
     * @return bool
     */
    public function isIpBlocked(string $ip): bool {
        $since = date('Y-m-d H:i:s', time() - self::TIME_WINDOW);

        $stmt = $this->pdo->prepare('
            SELECT COUNT(*) as attempts
            FROM login_attempts
            WHERE ip_address = ?
              AND attempted_at > ?
              AND success = 0
        ');
        $stmt->execute([$ip, $since]);
        $row = $stmt->fetch();

        return $row && $row['attempts'] >= self::MAX_ATTEMPTS;
    }

    /**
     * Verifica se uma conta (usuário/email) está bloqueada
     *
     * @param string $identifier Username ou email
     * @return bool
     */
    public function isAccountBlocked(string $identifier): bool {
        $since = date('Y-m-d H:i:s', time() - self::TIME_WINDOW);

        $stmt = $this->pdo->prepare('
            SELECT COUNT(*) as attempts
            FROM login_attempts
            WHERE identifier = ?
              AND attempted_at > ?
              AND success = 0
        ');
        $stmt->execute([$identifier, $since]);
        $row = $stmt->fetch();

        return $row && $row['attempts'] >= self::MAX_ATTEMPTS;
    }

    /**
     * Verifica se usuário está bloqueado na tabela users
     *
     * @param string $identifier Username ou email
     * @return array ['blocked' => bool, 'until' => datetime|null]
     */
    public function isUserLocked(string $identifier): array {
        $stmt = $this->pdo->prepare('
            SELECT locked_until
            FROM users
            WHERE (username = ? OR email = ?)
              AND locked_until IS NOT NULL
              AND locked_until > NOW()
        ');
        $stmt->execute([$identifier, $identifier]);
        $row = $stmt->fetch();

        if ($row) {
            return ['blocked' => true, 'until' => $row['locked_until']];
        }

        return ['blocked' => false, 'until' => null];
    }

    /**
     * Registra uma tentativa de login
     *
     * @param string $ip Endereço IP
     * @param string $identifier Username ou email
     * @param bool $success Se foi bem-sucedida
     */
    public function recordAttempt(string $ip, string $identifier, bool $success): void {
        $stmt = $this->pdo->prepare('
            INSERT INTO login_attempts (ip_address, identifier, success)
            VALUES (?, ?, ?)
        ');
        $stmt->execute([$ip, $identifier, $success ? 1 : 0]);
    }

    /**
     * Incrementa contador de tentativas no usuário
     *
     * @param int $userId ID do usuário
     */
    public function incrementUserAttempts(int $userId): void {
        $stmt = $this->pdo->prepare('
            UPDATE users
            SET login_attempts = login_attempts + 1
            WHERE id = ?
        ');
        $stmt->execute([$userId]);
    }

    /**
     * Bloqueia uma conta temporariamente
     *
     * @param int $userId ID do usuário
     */
    public function lockAccount(int $userId): void {
        $lockUntil = date('Y-m-d H:i:s', time() + self::LOCKOUT_TIME);

        $stmt = $this->pdo->prepare('
            UPDATE users
            SET locked_until = ?
            WHERE id = ?
        ');
        $stmt->execute([$lockUntil, $userId]);
    }

    /**
     * Reseta tentativas de login após sucesso
     *
     * @param int $userId ID do usuário
     */
    public function resetAttempts(int $userId): void {
        $stmt = $this->pdo->prepare('
            UPDATE users
            SET login_attempts = 0,
                locked_until = NULL
            WHERE id = ?
        ');
        $stmt->execute([$userId]);
    }

    /**
     * Obtém número de tentativas restantes para um IP
     *
     * @param string $ip Endereço IP
     * @return int Tentativas restantes
     */
    public function getRemainingAttempts(string $ip): int {
        $since = date('Y-m-d H:i:s', time() - self::TIME_WINDOW);

        $stmt = $this->pdo->prepare('
            SELECT COUNT(*) as attempts
            FROM login_attempts
            WHERE ip_address = ?
              AND attempted_at > ?
              AND success = 0
        ');
        $stmt->execute([$ip, $since]);
        $row = $stmt->fetch();

        $used = $row ? (int)$row['attempts'] : 0;
        return max(0, self::MAX_ATTEMPTS - $used);
    }

    /**
     * Limpa registros antigos da tabela login_attempts
     * Remove registros com mais de 30 dias
     */
    private function cleanupOldRecords(): void {
        $cutoff = date('Y-m-d H:i:s', time() - (30 * 24 * 60 * 60)); // 30 dias

        $stmt = $this->pdo->prepare('
            DELETE FROM login_attempts
            WHERE attempted_at < ?
        ');
        $stmt->execute([$cutoff]);
    }

    /**
     * Formata tempo até desbloqueio
     *
     * @param string $until Datetime do desbloqueio
     * @return string Mensagem formatada
     */
    public static function formatLockoutTime(string $until): string {
        $diff = strtotime($until) - time();

        if ($diff <= 0) {
            return 'desbloqueado';
        }

        $minutes = ceil($diff / 60);

        if ($minutes == 1) {
            return '1 minuto';
        }

        return "{$minutes} minutos";
    }
}
