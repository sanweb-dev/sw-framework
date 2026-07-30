<?php
/**
 * SW — View (renderizador de templates PHP)
 *
 * Uso:
 *   View::renderizar('usuarios/lista', ['usuarios' => $dados]);
 *   View::parcial('_header', ['titulo' => 'Meu Site']);
 *   $html = View::capturar('email/boas-vindas', ['nome' => 'João']);
 *
 * Views ficam em: /views/{nome}.php  (ou caminho customizado)
 * Suporte a layout (extends):
 *   No arquivo de view: View::layout('layouts/app', ['titulo' => 'Página']);
 */

namespace SW\Core;

class View
{
    private static string $basePath  = '';
    private static ?string $layout   = null;
    private static array $layoutVars = [];

    /* ── CONFIGURAÇÃO ──────────────────────────────────────── */

    public static function setPath(string $path): void
    {
        self::$basePath = rtrim($path, '/\\');
    }

    /* ── RENDERIZAR ────────────────────────────────────────── */

    public static function renderizar(string $view, array $dados = []): void
    {
        echo self::capturar($view, $dados);
    }

    public static function capturar(string $view, array $dados = []): string
    {
        $arquivo = self::_resolver($view);

        if (!file_exists($arquivo)) {
            throw new \RuntimeException("View não encontrada: {$arquivo}");
        }

        /* Extrai variáveis e captura output */
        extract($dados, EXTR_SKIP);
        ob_start();
        require $arquivo;
        $conteudo = ob_get_clean();

        /* Verifica se a view definiu um layout */
        if (self::$layout !== null) {
            $layoutArq  = self::_resolver(self::$layout);
            self::$layout = null;

            extract(self::$layoutVars, EXTR_SKIP);
            self::$layoutVars = [];

            ob_start();
            require $layoutArq;
            $conteudo = str_replace('<!-- @conteudo -->', $conteudo, ob_get_clean());
        }

        return $conteudo;
    }

    /** Inclui uma view parcial (sem layout) */
    public static function parcial(string $view, array $dados = []): void
    {
        $arquivo = self::_resolver($view);
        if (!file_exists($arquivo)) return;
        extract($dados, EXTR_SKIP);
        require $arquivo;
    }

    /* ── LAYOUT ────────────────────────────────────────────── */

    /**
     * Chamar dentro de uma view para envolvê-la num layout.
     * O layout deve conter <!-- @conteudo --> onde o corpo será inserido.
     */
    public static function layout(string $layout, array $dados = []): void
    {
        self::$layout     = $layout;
        self::$layoutVars = $dados;
    }

    /* ── HELPERS DE TEMPLATE ───────────────────────────────── */

    /** Escapa HTML para exibição segura */
    public static function e(mixed $val): string
    {
        return htmlspecialchars((string) $val, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /** Exibe valor ou traço se vazio */
    public static function ou(mixed $val, string $pad = '—'): string
    {
        return ($val !== null && $val !== '') ? self::e($val) : $pad;
    }

    /** Formata data br */
    public static function data(mixed $val, string $fmt = 'd/m/Y'): string
    {
        if (!$val) return '—';
        $d = $val instanceof \DateTimeInterface ? $val : new \DateTime($val);
        return $d->format($fmt);
    }

    /** Formata valor monetário BRL */
    public static function brl(mixed $val): string
    {
        return 'R$ ' . number_format((float) $val, 2, ',', '.');
    }

    /* ── RESOLUÇÃO DE CAMINHO ──────────────────────────────── */

    private static function _resolver(string $view): string
    {
        $view = str_replace('.', '/', $view);
        $base = self::$basePath ?: (defined('VIEWS_PATH') ? VIEWS_PATH : __DIR__ . '/../../views');
        return rtrim($base, '/\\') . '/' . ltrim($view, '/\\') . '.php';
    }
}

