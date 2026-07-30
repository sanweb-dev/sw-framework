<?php
/**
 * SW — App (bootstrap da aplicação)
 *
 * Uso em public/index.php:
 *   require '../vendor/autoload.php'; // ou require manual
 *   require '../src/php/Core/App.php';
 *
 *   App::iniciar([
 *     'db' => ['host'=>'localhost','banco'=>'meu_db','user'=>'root','pass'=>''],
 *     'views'     => __DIR__ . '/../views',
 *     'timezone'  => 'America/Sao_Paulo',
 *     'debug'     => true,
 *     'sessao'    => true,
 *   ]);
 *
 *   require '../routes/web.php';
 *   Router::despachar();
 */

namespace SW\Core;

class App
{
    private static bool $iniciado = false;

    public static function iniciar(array $cfg = []): void
    {
        if (self::$iniciado) return;
        self::$iniciado = true;

        /* Timezone */
        date_default_timezone_set($cfg['timezone'] ?? 'America/Sao_Paulo');

        /* Debug */
        $debug = $cfg['debug'] ?? false;
        ini_set('display_errors', $debug ? '1' : '0');
        error_reporting($debug ? E_ALL : 0);

        /* Handler de erros */
        set_exception_handler([self::class, '_excecao']);

        /* Sessão */
        if ($cfg['sessao'] ?? true) {
            if (session_status() === PHP_SESSION_NONE) {
                ini_set('session.cookie_httponly', '1');
                ini_set('session.use_strict_mode', '1');
                session_start();
            }
        }

        /* Banco de dados */
        if (!empty($cfg['db'])) {
            DB::conectar($cfg['db']);
        }

        /* Views */
        if (!empty($cfg['views'])) {
            View::setPath($cfg['views']);
        }

        /* Headers de segurança */
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: strict-origin-when-cross-origin');

        /* CORS (se configurado) */
        if (!empty($cfg['cors'])) {
            self::_cors($cfg['cors']);
        }
    }

    /* ── HANDLER DE EXCEÇÕES ───────────────────────────────── */

    public static function _excecao(\Throwable $e): void
    {
        $ajax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']);
        http_response_code(500);

        if ($ajax) {
            header('Content-Type: application/json');
            echo json_encode([
                'ok'       => false,
                'mensagem' => 'Erro interno do servidor',
                'erro'     => ini_get('display_errors') ? $e->getMessage() : null,
            ]);
            return;
        }

        if (ini_get('display_errors')) {
            echo '<pre style="background:#1a1a2e;color:#e07b6a;padding:2rem;border-radius:8px;margin:2rem">';
            echo '<b>' . get_class($e) . '</b>: ' . htmlspecialchars($e->getMessage()) . "\n\n";
            echo htmlspecialchars($e->getTraceAsString());
            echo '</pre>';
        } else {
            echo '<h1>500 — Erro interno do servidor</h1>';
        }
    }

    /* ── CORS ──────────────────────────────────────────────── */

    private static function _cors(array $cfg): void
    {
        $origem = $cfg['origens'] ?? '*';
        header("Access-Control-Allow-Origin: {$origem}");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    /* ── AUTOLOAD SIMPLES (sem composer) ───────────────────── */

    /**
     * Registra autoload PSR-4 para o namespace SW e App.
     * Usar quando não houver composer.
     */
    public static function autoload(array $mapa = []): void
    {
        $padrao = [
            'SW\\'  => __DIR__ . '/../',
            'App\\'    => __DIR__ . '/../../../../app/',
        ];
        $mapa = array_merge($padrao, $mapa);

        spl_autoload_register(function (string $classe) use ($mapa) {
            foreach ($mapa as $prefixo => $dir) {
                if (!str_starts_with($classe, $prefixo)) continue;
                $rel  = str_replace('\\', '/', substr($classe, strlen($prefixo)));
                $arq  = rtrim($dir, '/') . '/' . $rel . '.php';
                if (file_exists($arq)) { require $arq; return; }
            }
        });
    }
}

