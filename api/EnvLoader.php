<?php
/**
 * EnvLoader - Carregador de Variáveis de Ambiente
 *
 * Classe simples para ler arquivos .env sem dependências externas
 * Substitui a necessidade do vlucas/phpdotenv
 */
class EnvLoader {

    /**
     * Carrega variáveis do arquivo .env
     *
     * @param string $filePath Caminho para o arquivo .env
     * @return bool Retorna true se carregado com sucesso
     */
    public static function load(string $filePath): bool {
        if (!file_exists($filePath)) {
            throw new RuntimeException("Arquivo .env não encontrado: {$filePath}");
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            // Ignora comentários
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parse da linha KEY=VALUE
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);

                $key = trim($key);
                $value = trim($value);

                // Remove aspas ao redor do valor se existirem
                $value = trim($value, '"\'');

                // Define como constante se ainda não existir
                if (!defined($key)) {
                    define($key, $value);
                }

                // Também coloca em $_ENV para compatibilidade
                $_ENV[$key] = $value;
            }
        }

        return true;
    }

    /**
     * Obtém uma variável de ambiente
     *
     * @param string $key Nome da variável
     * @param mixed $default Valor padrão se não existir
     * @return mixed
     */
    public static function get(string $key, $default = null) {
        if (defined($key)) {
            return constant($key);
        }

        if (isset($_ENV[$key])) {
            return $_ENV[$key];
        }

        return $default;
    }

    /**
     * Verifica se uma variável existe
     *
     * @param string $key Nome da variável
     * @return bool
     */
    public static function has(string $key): bool {
        return defined($key) || isset($_ENV[$key]);
    }
}
