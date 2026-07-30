<?php
/**
 * SW — Session
 *
 * Uso:
 *   Session::set('chave', $valor)
 *   Session::get('chave', $padrao)
 *   Session::del('chave')
 *   Session::limpa()
 *
 *   Session::flash('ok', 'Salvo com sucesso!')   → disponível apenas no próximo request
 *   Session::pegarFlash('ok')                     → retorna e apaga
 *   Session::temFlash('ok')
 *
 *   Session::csrf()                               → token string
 *   Session::verificarCsrf($token)                → bool
 */

namespace SW\Auth;

class Session
{
    private static bool $iniciada = false;

    /* ── INICIAR ───────────────────────────────────────────── */

    public static function iniciar(): void
    {
        if (self::$iniciada || session_status() === PHP_SESSION_ACTIVE) {
            self::$iniciada = true;
            return;
        }
        ini_set('session.cookie_httponly', '1');
        ini_set('session.use_strict_mode', '1');
        session_start();
        self::$iniciada = true;
    }

    /* ── LEITURA / ESCRITA ─────────────────────────────────── */

    public static function set(string $chave, mixed $valor): void
    {
        self::iniciar();
        $_SESSION[$chave] = $valor;
    }

    public static function get(string $chave, mixed $pad = null): mixed
    {
        self::iniciar();
        return $_SESSION[$chave] ?? $pad;
    }

    public static function del(string $chave): void
    {
        unset($_SESSION[$chave]);
    }

    public static function tem(string $chave): bool
    {
        return isset($_SESSION[$chave]);
    }

    public static function limpa(): void
    {
        $_SESSION = [];
    }

    /* ── FLASH (mensagens de único uso) ────────────────────── */

    public static function flash(string $chave, mixed $valor): void
    {
        self::iniciar();
        $_SESSION['_flash'][$chave] = $valor;
    }

    public static function pegarFlash(string $chave, mixed $pad = null): mixed
    {
        $val = $_SESSION['_flash'][$chave] ?? $pad;
        unset($_SESSION['_flash'][$chave]);
        return $val;
    }

    public static function temFlash(string $chave): bool
    {
        return isset($_SESSION['_flash'][$chave]);
    }

    public static function todosFlash(): array
    {
        $flash = $_SESSION['_flash'] ?? [];
        unset($_SESSION['_flash']);
        return $flash;
    }

    /* ── CSRF ──────────────────────────────────────────────── */

    public static function csrf(): string
    {
        self::iniciar();
        if (empty($_SESSION['_csrf'])) {
            $_SESSION['_csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['_csrf'];
    }

    public static function verificarCsrf(string $token): bool
    {
        self::iniciar();
        return hash_equals($_SESSION['_csrf'] ?? '', $token);
    }

    public static function renovarCsrf(): string
    {
        $_SESSION['_csrf'] = bin2hex(random_bytes(32));
        return $_SESSION['_csrf'];
    }

    /* ── REGENERAR (após login — previne fixação) ──────────── */

    public static function regenerar(): void
    {
        session_regenerate_id(true);
    }

    /* ── DESTRUIR ──────────────────────────────────────────── */

    public static function destruir(): void
    {
        self::limpa();
        session_destroy();
        self::$iniciada = false;
    }
}

