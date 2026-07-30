<?php
/**
 * SW — Request (encapsula $_GET, $_POST, $_FILES, headers)
 *
 * Uso:
 *   $req = Request::atual();
 *   $nome = $req->input('nome');
 *   $todos = $req->all();
 *   $arquivo = $req->file('foto');
 *   $req->isAjax()
 *   $req->isPost()
 *   $req->metodo()   → 'GET' | 'POST' | 'PUT' | 'DELETE'
 *   $req->ip()
 *   $req->header('Authorization')
 */

namespace SW\Core;

class Request
{
    private static ?self $instancia = null;

    private array $dados;
    private array $arquivos;
    private array $headers;
    private string $metodo;
    private string $uri;
    private string $corpo;

    private function __construct()
    {
        /* Método real (suporte a PUT/DELETE via _method ou header) */
        $this->metodo = strtoupper(
            $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']
            ?? $_POST['_method']
            ?? $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );

        $this->uri     = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $this->corpo   = file_get_contents('php://input') ?: '';
        $this->arquivos = $_FILES ?? [];

        /* Unifica GET + POST + JSON body */
        $json = [];
        if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
            $json = json_decode($this->corpo, true) ?? [];
        }

        $this->dados = array_merge($_GET, $_POST, $json);

        /* Headers */
        $this->headers = [];
        foreach ($_SERVER as $k => $v) {
            if (str_starts_with($k, 'HTTP_')) {
                $nome = str_replace('_', '-', substr($k, 5));
                $this->headers[strtolower($nome)] = $v;
            }
        }
    }

    /* ── SINGLETON ─────────────────────────────────────────── */

    public static function atual(): static
    {
        return self::$instancia ??= new static();
    }

    /* ── LEITURA ───────────────────────────────────────────── */

    public function input(string $chave, mixed $pad = null): mixed
    {
        return $this->dados[$chave] ?? $pad;
    }

    public function all(): array
    {
        return $this->dados;
    }

    public function somente(array $chaves): array
    {
        return array_intersect_key($this->dados, array_flip($chaves));
    }

    public function exceto(array $chaves): array
    {
        return array_diff_key($this->dados, array_flip($chaves));
    }

    public function tem(string $chave): bool
    {
        return isset($this->dados[$chave]) && $this->dados[$chave] !== '';
    }

    public function inteiro(string $chave, int $pad = 0): int
    {
        return (int) ($this->dados[$chave] ?? $pad);
    }

    public function flutuante(string $chave, float $pad = 0.0): float
    {
        return (float) ($this->dados[$chave] ?? $pad);
    }

    public function boleano(string $chave): bool
    {
        return filter_var($this->dados[$chave] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    /* ── ARQUIVO ───────────────────────────────────────────── */

    public function file(string $campo): ?array
    {
        $f = $this->arquivos[$campo] ?? null;
        if (!$f || $f['error'] !== UPLOAD_ERR_OK) return null;
        return $f;
    }

    public function temArquivo(string $campo): bool
    {
        return isset($this->arquivos[$campo]) && $this->arquivos[$campo]['error'] === UPLOAD_ERR_OK;
    }

    /* ── MÉTODO / URI ──────────────────────────────────────── */

    public function metodo(): string   { return $this->metodo; }
    public function uri(): string      { return $this->uri; }
    public function corpo(): string    { return $this->corpo; }

    public function isGet():    bool { return $this->metodo === 'GET'; }
    public function isPost():   bool { return $this->metodo === 'POST'; }
    public function isPut():    bool { return $this->metodo === 'PUT'; }
    public function isDelete(): bool { return $this->metodo === 'DELETE'; }

    public function isAjax(): bool
    {
        return ($this->headers['x-requested-with'] ?? '') === 'XMLHttpRequest';
    }

    public function isJson(): bool
    {
        return str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json');
    }

    /* ── HEADERS / IP ──────────────────────────────────────── */

    public function header(string $nome, string $pad = ''): string
    {
        return $this->headers[strtolower($nome)] ?? $pad;
    }

    public function ip(): string
    {
        return $_SERVER['HTTP_X_FORWARDED_FOR']
            ?? $_SERVER['HTTP_CLIENT_IP']
            ?? $_SERVER['REMOTE_ADDR']
            ?? '';
    }

    public function userAgent(): string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? '';
    }
}

