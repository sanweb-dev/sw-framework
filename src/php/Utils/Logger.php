<?php
/**
 * SW — Logger (log em tabela MySQL)
 *
 * SQL da tabela:
 *   CREATE TABLE logs (
 *     id INT AUTO_INCREMENT PRIMARY KEY,
 *     nivel VARCHAR(10) NOT NULL DEFAULT 'info',
 *     canal VARCHAR(50) NOT NULL DEFAULT 'app',
 *     mensagem TEXT NOT NULL,
 *     contexto JSON,
 *     usuario_id INT,
 *     ip VARCHAR(45),
 *     criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
 *     INDEX idx_nivel (nivel),
 *     INDEX idx_canal (canal),
 *     INDEX idx_criado (criado_em)
 *   );
 *
 * Uso:
 *   Logger::info('Usuário logou', ['user_id' => 5]);
 *   Logger::erro('Falha no pagamento', ['pedido' => 99, 'erro' => $e->getMessage()]);
 *   Logger::aler('Tentativa de acesso negado');
 *   Logger::debug('Query lenta', ['sql' => $sql, 'ms' => 450]);
 *   Logger::canal('email')->info('E-mail enviado', ['para' => 'a@b.com']);
 */

namespace SW\Utils;

use SW\Core\DB;

class Logger
{
    private string $canal;
    private static bool $silencioso = false;

    public function __construct(string $canal = 'app')
    {
        $this->canal = $canal;
    }

    /* ── FACTORY ───────────────────────────────────────────── */

    public static function canal(string $canal): static
    {
        return new static($canal);
    }

    /* ── SILENCIAR (útil em testes) ────────────────────────── */

    public static function silenciar(bool $v = true): void
    {
        self::$silencioso = $v;
    }

    /* ── MÉTODOS DE NÍVEL ──────────────────────────────────── */

    public static function info(string $msg, array $ctx = []): void
    {
        static::_gravar('info', $msg, $ctx);
    }

    public static function aler(string $msg, array $ctx = []): void
    {
        static::_gravar('aler', $msg, $ctx);
    }

    public static function erro(string $msg, array $ctx = []): void
    {
        static::_gravar('erro', $msg, $ctx);
    }

    public static function debug(string $msg, array $ctx = []): void
    {
        static::_gravar('debug', $msg, $ctx);
    }

    /* ── Instância ─────────────────────────────────────────── */

    public function registrar(string $nivel, string $msg, array $ctx = []): void
    {
        static::_gravar($nivel, $msg, $ctx, $this->canal);
    }

    /* ── GRAVAR ────────────────────────────────────────────── */

    private static function _gravar(string $nivel, string $msg, array $ctx, string $canal = 'app'): void
    {
        if (self::$silencioso) return;

        $usuarioId = null;
        try {
            $usuarioId = \SW\Auth\Auth::id();
        } catch (\Throwable) {}

        $ip = $_SERVER['HTTP_X_FORWARDED_FOR']
           ?? $_SERVER['HTTP_CLIENT_IP']
           ?? $_SERVER['REMOTE_ADDR']
           ?? null;

        try {
            DB::executar(
                'INSERT INTO logs (nivel, canal, mensagem, contexto, usuario_id, ip) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    $nivel,
                    $canal,
                    $msg,
                    $ctx ? json_encode($ctx, JSON_UNESCAPED_UNICODE) : null,
                    $usuarioId,
                    $ip,
                ]
            );
        } catch (\Throwable $e) {
            /* Fallback para arquivo se banco falhar */
            $linha = date('Y-m-d H:i:s') . " [{$nivel}] [{$canal}] {$msg}";
            if ($ctx) $linha .= ' ' . json_encode($ctx);
            @error_log($linha);
        }
    }

    /* ── BUSCAR LOGS ───────────────────────────────────────── */

    public static function buscar(array $filtros = [], int $limite = 100): array
    {
        $qb = \SW\Core\QueryBuilder::tabela('logs')->orderBy('criado_em', 'DESC')->limite($limite);
        if (!empty($filtros['nivel']))  $qb->where('nivel', $filtros['nivel']);
        if (!empty($filtros['canal']))  $qb->where('canal', $filtros['canal']);
        if (!empty($filtros['desde']))  $qb->where('criado_em', '>=', $filtros['desde']);
        if (!empty($filtros['user_id'])) $qb->where('usuario_id', $filtros['user_id']);
        return $qb->buscar();
    }

    /** Remove logs antigos */
    public static function limparAntigos(int $dias = 90): int
    {
        return DB::executar(
            'DELETE FROM logs WHERE criado_em < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [$dias]
        );
    }
}

