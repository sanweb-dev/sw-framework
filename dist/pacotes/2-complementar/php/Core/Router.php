<?php
/**
 * SW — Router
 *
 * Uso:
 *   Router::get('/',                 'HomeController@index');
 *   Router::get('/usuarios',         'UsuarioController@lista');
 *   Router::get('/usuarios/:id',     'UsuarioController@ver');
 *   Router::post('/usuarios',        'UsuarioController@salvar');
 *   Router::put('/usuarios/:id',     'UsuarioController@atualizar');
 *   Router::delete('/usuarios/:id',  'UsuarioController@deletar');
 *
 *   Router::grupo('/api', function() {
 *     Router::get('/usuarios', 'Api\UsuarioController@lista');
 *   }, ['auth']);   // middlewares opcionais
 *
 *   Router::middleware('auth', function() { ... });
 *   Router::despachar();
 */

namespace SW\Core;

class Router
{
    private static array  $rotas       = [];
    private static array  $middlewares = [];
    private static string $prefixo     = '';
    private static array  $mwGrupo     = [];
    private static string $namespace   = 'App\\Controllers\\';

    /* ── DEFINIÇÃO DE ROTAS ────────────────────────────────── */

    public static function get(string $uri, string|callable $handler, array $mw = []): void
    {
        static::_add('GET', $uri, $handler, $mw);
    }

    public static function post(string $uri, string|callable $handler, array $mw = []): void
    {
        static::_add('POST', $uri, $handler, $mw);
    }

    public static function put(string $uri, string|callable $handler, array $mw = []): void
    {
        static::_add('PUT', $uri, $handler, $mw);
    }

    public static function delete(string $uri, string|callable $handler, array $mw = []): void
    {
        static::_add('DELETE', $uri, $handler, $mw);
    }

    public static function any(string $uri, string|callable $handler, array $mw = []): void
    {
        foreach (['GET','POST','PUT','DELETE','PATCH'] as $m) {
            static::_add($m, $uri, $handler, $mw);
        }
    }

    private static function _add(string $metodo, string $uri, string|callable $handler, array $mw): void
    {
        static::$rotas[] = [
            'metodo'  => $metodo,
            'uri'     => static::$prefixo . $uri,
            'handler' => $handler,
            'mw'      => array_merge(static::$mwGrupo, $mw),
        ];
    }

    /* ── GRUPO ─────────────────────────────────────────────── */

    public static function grupo(string $prefixo, callable $fn, array $mw = []): void
    {
        $prefixoAnt = static::$prefixo;
        $mwAnt      = static::$mwGrupo;

        static::$prefixo  = $prefixoAnt . $prefixo;
        static::$mwGrupo  = array_merge($mwAnt, $mw);

        $fn();

        static::$prefixo = $prefixoAnt;
        static::$mwGrupo = $mwAnt;
    }

    /* ── MIDDLEWARE ────────────────────────────────────────── */

    public static function middleware(string $nome, callable $fn): void
    {
        static::$middlewares[$nome] = $fn;
    }

    public static function setNamespace(string $ns): void
    {
        static::$namespace = rtrim($ns, '\\') . '\\';
    }

    /* ── DESPACHAR ─────────────────────────────────────────── */

    public static function despachar(): void
    {
        $metodo = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? $_POST['_method'] ?? $_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $uri    = '/' . trim($uri, '/') ?: '/';

        foreach (static::$rotas as $rota) {
            $params = [];
            if ($rota['metodo'] !== $metodo) continue;
            if (!static::_match($rota['uri'], $uri, $params)) continue;

            /* Executa middlewares */
            foreach ($rota['mw'] as $mwNome) {
                $mwFn = static::$middlewares[$mwNome] ?? null;
                if ($mwFn) $mwFn();
            }

            /* Executa handler */
            static::_executar($rota['handler'], $params);
            return;
        }

        /* 404 */
        http_response_code(404);
        if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
            header('Content-Type: application/json');
            echo json_encode(['ok' => false, 'mensagem' => 'Rota não encontrada']);
        } else {
            echo '<h1>404 — Página não encontrada</h1>';
        }
    }

    /* ── MATCH URI ─────────────────────────────────────────── */

    private static function _match(string $padrao, string $uri, array &$params): bool
    {
        $padrao = preg_replace('/:([a-z_]+)/', '(?P<$1>[^/]+)', $padrao);
        $padrao = '#^' . $padrao . '$#';

        if (!preg_match($padrao, $uri, $m)) return false;

        $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
        return true;
    }

    /* ── EXECUTAR ──────────────────────────────────────────── */

    private static function _executar(string|callable $handler, array $params): void
    {
        if (is_callable($handler)) {
            $handler(...array_values($params));
            return;
        }

        [$classe, $metodo] = explode('@', $handler);
        $classe = str_contains($classe, '\\') ? $classe : static::$namespace . $classe;

        if (!class_exists($classe)) {
            throw new \RuntimeException("Controller não encontrado: {$classe}");
        }

        $ctrl = new $classe();
        if (!method_exists($ctrl, $metodo)) {
            throw new \RuntimeException("Método {$metodo} não existe em {$classe}");
        }

        $ctrl->$metodo(...array_values($params));
    }
}

