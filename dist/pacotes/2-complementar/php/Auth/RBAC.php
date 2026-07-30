<?php
/**
 * SW — RBAC (controle de acesso por papel/nível)
 *
 * Uso:
 *   RBAC::definir([
 *     'admin'  => ['*'],                                     // tudo
 *     'editor' => ['posts.ver', 'posts.criar', 'posts.editar'],
 *     'user'   => ['posts.ver', 'perfil.editar'],
 *   ]);
 *
 *   RBAC::pode('posts.editar')           → bool
 *   RBAC::pode('posts.editar', $nivel)   → bool (checa nível específico)
 *   RBAC::requer('admin')                → aborta com 403 se não for admin
 *   RBAC::requerPermissao('posts.editar')
 *
 *   No Controller (via herança de Controller.php):
 *   $this->requerPermissao('usuarios.deletar');
 */

namespace SW\Auth;

class RBAC
{
    private static array $permissoes = [];

    /* ── DEFINIÇÃO ─────────────────────────────────────────── */

    public static function definir(array $mapa): void
    {
        self::$permissoes = $mapa;
    }

    public static function adicionarNivel(string $nivel, array $perms): void
    {
        self::$permissoes[$nivel] = array_merge(self::$permissoes[$nivel] ?? [], $perms);
    }

    /* ── VERIFICAÇÃO ───────────────────────────────────────── */

    public static function pode(string $permissao, ?string $nivel = null): bool
    {
        $nivel ??= Auth::nivel();
        if (!$nivel) return false;

        $perms = self::$permissoes[$nivel] ?? [];

        /* Wildcard: admin com ['*'] tem tudo */
        if (in_array('*', $perms)) return true;

        /* Permissão exata */
        if (in_array($permissao, $perms)) return true;

        /* Wildcard por módulo: 'posts.*' cobre 'posts.criar' */
        [$modulo] = explode('.', $permissao);
        if (in_array("{$modulo}.*", $perms)) return true;

        return false;
    }

    public static function ehNivel(string $nivel): bool
    {
        return Auth::nivel() === $nivel;
    }

    public static function ehAlgum(array $niveis): bool
    {
        return in_array(Auth::nivel(), $niveis);
    }

    /* ── MIDDLEWARES / GUARDS ──────────────────────────────── */

    public static function requer(string $nivel): void
    {
        if (Auth::nivel() !== $nivel) self::_abortar403();
    }

    public static function requerAlgum(array $niveis): void
    {
        if (!in_array(Auth::nivel(), $niveis)) self::_abortar403();
    }

    public static function requerPermissao(string $permissao): void
    {
        if (!self::pode($permissao)) self::_abortar403();
    }

    /* ── HELPER ────────────────────────────────────────────── */

    private static function _abortar403(): never
    {
        http_response_code(403);
        if (!empty($_SERVER['HTTP_X_REQUESTED_WITH'])) {
            header('Content-Type: application/json');
            echo json_encode(['ok' => false, 'mensagem' => 'Sem permissão para esta ação']);
        } else {
            echo '<h1>403 — Acesso negado</h1>';
        }
        exit;
    }
}

