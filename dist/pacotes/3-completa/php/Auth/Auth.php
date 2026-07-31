<?php
/**
 * SW — Auth (autenticação)
 *
 * Uso:
 *   Auth::login($email, $senha)   → bool
 *   Auth::logout()
 *   Auth::check()                 → bool
 *   Auth::user()                  → array | null
 *   Auth::id()                    → int | null
 *   Auth::nivel()                 → string (ex: 'admin', 'editor', 'user')
 *
 *   Configurar antes de usar:
 *   Auth::configurar([
 *     'modelo'   => Usuario::class,   // Model com $tabela, hashSenha()
 *     'campo'    => 'email',          // campo de login
 *     'senha'    => 'senha',          // campo da senha
 *     'nivel'    => 'nivel',          // campo do nível/role
 *     'ativo'    => 'ativo',          // campo de ativo (null = ignora)
 *     'rota_login' => '/login',
 *   ]);
 */

namespace SW\Auth;

class Auth
{
    private static array $cfg = [
        'modelo'      => null,
        'campo'       => 'email',
        'senha'       => 'senha',
        'nivel'       => 'nivel',
        'ativo'       => 'ativo',
        'rota_login'  => '/login',
        'sessao_chave'=> '_sw_user',
    ];

    private static ?array $usuario = null;

    /* ── CONFIGURAÇÃO ──────────────────────────────────────── */

    public static function configurar(array $cfg): void
    {
        self::$cfg = array_merge(self::$cfg, $cfg);
    }

    /* ── LOGIN ─────────────────────────────────────────────── */

    public static function login(string $login, string $senha): bool
    {
        $modelo = self::$cfg['modelo'];
        if (!$modelo) throw new \RuntimeException('Auth: modelo não configurado.');

        $where = [self::$cfg['campo'] => $login];
        if (self::$cfg['ativo']) $where[self::$cfg['ativo']] = 1;

        /** @var \SW\Core\Model $modelo */
        $usuario = $modelo::primeiro($where);

        if (!$usuario) return false;
        if (!password_verify($senha, $usuario[self::$cfg['senha']])) return false;

        /* Regenera sessão */
        Session::regenerar();

        /* Salva na sessão (sem a senha) */
        $dados = $usuario;
        unset($dados[self::$cfg['senha']]);
        Session::set(self::$cfg['sessao_chave'], $dados);
        self::$usuario = $dados;

        return true;
    }

    /* ── LOGOUT ────────────────────────────────────────────── */

    public static function logout(): void
    {
        Session::del(self::$cfg['sessao_chave']);
        self::$usuario = null;
        Session::regenerar();
    }

    /* ── CHECK / USER ──────────────────────────────────────── */

    public static function check(): bool
    {
        return self::user() !== null;
    }

    public static function user(): ?array
    {
        if (self::$usuario !== null) return self::$usuario;
        self::$usuario = Session::get(self::$cfg['sessao_chave']);
        return self::$usuario;
    }

    public static function id(): int|string|null
    {
        return self::user()['id'] ?? null;
    }

    public static function nivel(): string
    {
        return (string) (self::user()[self::$cfg['nivel']] ?? '');
    }

    /* ── MIDDLEWARE (para Router) ──────────────────────────── */

    public static function middleware(): void
    {
        if (!self::check()) {
            if (!empty($_SERVER['HTTP_X_REQUESTED_WITH'])) {
                http_response_code(401);
                header('Content-Type: application/json');
                echo json_encode(['ok' => false, 'mensagem' => 'Não autenticado']);
                exit;
            }
            header('Location: ' . self::$cfg['rota_login']);
            exit;
        }
    }

    /* ── LEMBRAR-ME (token persistente) ────────────────────── */

    public static function gerarToken(int $usuarioId, int $dias = 30): string
    {
        $token   = bin2hex(random_bytes(32));
        $expira  = date('Y-m-d H:i:s', strtotime("+{$dias} days"));

        \SW\Core\DB::executar(
            'INSERT INTO sessoes_lembrar (usuario_id, token, expira_em) VALUES (?, ?, ?)',
            [$usuarioId, hash('sha256', $token), $expira]
        );

        setcookie('lembrar', $token, time() + $dias * 86400, '/', '', true, true);
        return $token;
    }

    public static function verificarToken(): bool
    {
        $token = $_COOKIE['lembrar'] ?? null;
        if (!$token) return false;

        $hash   = hash('sha256', $token);
        $sessao = \SW\Core\DB::primeiro(
            'SELECT u.* FROM usuarios u JOIN sessoes_lembrar s ON s.usuario_id = u.id
             WHERE s.token = ? AND s.expira_em > NOW() AND u.ativo = 1',
            [$hash]
        );

        if (!$sessao) return false;

        /* Token de uso unico -- apaga o usado e emite outro (evita replay se o
           cookie antigo vazar) */
        \SW\Core\DB::executar('DELETE FROM sessoes_lembrar WHERE token = ?', [$hash]);

        unset($sessao[self::$cfg['senha']]);

        /* Mesma prevencao de fixacao de sessao do login normal */
        Session::regenerar();
        Session::set(self::$cfg['sessao_chave'], $sessao);
        self::$usuario = $sessao;

        self::gerarToken((int) $sessao['id']);

        return true;
    }
}

