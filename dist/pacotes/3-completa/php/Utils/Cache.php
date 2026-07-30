<?php
/**
 * SW — Cache (arquivo simples)
 * Serialização via JSON. Suporta TTL, tags e limpeza.
 *
 * Uso:
 *   Cache::set('usuarios_ativos', $dados, 300);   // 5 min
 *   $dados = Cache::get('usuarios_ativos');        // null se expirado
 *   Cache::lembrar('config_site', 3600, fn() => DB::query('SELECT ...'));
 *   Cache::del('usuarios_ativos');
 *   Cache::flush();                                // limpa tudo
 *   Cache::flushTag('usuarios');                  // limpa por tag
 *
 *   Cache::set('rel_mensal', $dados, 3600, ['relatorios', 'financeiro']);
 */

namespace SW\Utils;

class Cache
{
    private static string $dir    = '';
    private static int    $ttlPad = 3600;

    /* ── CONFIGURAÇÃO ──────────────────────────────────────── */

    public static function configurar(string $dir, int $ttlPad = 3600): void
    {
        self::$dir    = rtrim($dir, '/\\');
        self::$ttlPad = $ttlPad;
        @mkdir(self::$dir, 0755, true);
    }

    /* ── ESCRITA ───────────────────────────────────────────── */

    public static function set(string $chave, mixed $valor, ?int $ttl = null, array $tags = []): bool
    {
        self::_verificarDir();
        $expira = $ttl === 0 ? 0 : time() + ($ttl ?? self::$ttlPad);

        $payload = json_encode([
            'v' => $valor,
            'e' => $expira,
            't' => $tags,
        ], JSON_UNESCAPED_UNICODE);

        return file_put_contents(self::_path($chave), $payload, LOCK_EX) !== false;
    }

    /* ── LEITURA ───────────────────────────────────────────── */

    public static function get(string $chave, mixed $pad = null): mixed
    {
        $path = self::_path($chave);
        if (!file_exists($path)) return $pad;

        $payload = json_decode(file_get_contents($path), true);
        if (!$payload) return $pad;

        /* Verifica TTL */
        if ($payload['e'] !== 0 && time() > $payload['e']) {
            @unlink($path);
            return $pad;
        }

        return $payload['v'];
    }

    public static function tem(string $chave): bool
    {
        return self::get($chave) !== null;
    }

    /**
     * Busca do cache ou executa callback e armazena.
     */
    public static function lembrar(string $chave, int $ttl, callable $fn, array $tags = []): mixed
    {
        $cached = self::get($chave);
        if ($cached !== null) return $cached;

        $valor = $fn();
        self::set($chave, $valor, $ttl, $tags);
        return $valor;
    }

    /* ── DELEÇÃO ───────────────────────────────────────────── */

    public static function del(string $chave): void
    {
        @unlink(self::_path($chave));
    }

    public static function flush(): void
    {
        self::_verificarDir();
        foreach (glob(self::$dir . '/*.cache') ?: [] as $f) {
            @unlink($f);
        }
    }

    public static function flushTag(string $tag): void
    {
        self::_verificarDir();
        foreach (glob(self::$dir . '/*.cache') ?: [] as $f) {
            $payload = json_decode(file_get_contents($f), true);
            if ($payload && in_array($tag, $payload['t'] ?? [])) {
                @unlink($f);
            }
        }
    }

    /** Remove entradas expiradas */
    public static function limpar(): int
    {
        self::_verificarDir();
        $n = 0;
        foreach (glob(self::$dir . '/*.cache') ?: [] as $f) {
            $payload = json_decode(file_get_contents($f), true);
            if (!$payload || ($payload['e'] !== 0 && time() > $payload['e'])) {
                @unlink($f);
                $n++;
            }
        }
        return $n;
    }

    /* ── TTL RESTANTE ──────────────────────────────────────── */

    public static function ttl(string $chave): int
    {
        $path = self::_path($chave);
        if (!file_exists($path)) return -1;
        $payload = json_decode(file_get_contents($path), true);
        if (!$payload || $payload['e'] === 0) return 0;
        return max(0, $payload['e'] - time());
    }

    /* ── HELPERS ───────────────────────────────────────────── */

    private static function _path(string $chave): string
    {
        return self::$dir . '/' . md5($chave) . '.cache';
    }

    private static function _verificarDir(): void
    {
        if (!self::$dir) {
            self::$dir = sys_get_temp_dir() . '/swcache';
            @mkdir(self::$dir, 0755, true);
        }
    }
}

