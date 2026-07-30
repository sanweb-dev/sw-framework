<?php
/**
 * SW — Controller (base para todos os controllers)
 *
 * Uso (herdar):
 *   class UsuarioController extends Controller {
 *     public function lista(): void {
 *       $this->view('usuarios/lista', ['usuarios' => Usuario::todos()]);
 *     }
 *     public function salvar(): void {
 *       $this->validar(['nome' => 'required|min:2', 'email' => 'required|email']);
 *       // ...
 *       $this->json(['ok' => true, 'mensagem' => 'Salvo!']);
 *     }
 *   }
 */

namespace SW\Core;

use SW\Utils\Validator;

abstract class Controller
{
    protected Request $req;

    public function __construct()
    {
        $this->req = Request::atual();
    }

    /* ── RESPOSTA ──────────────────────────────────────────── */

    protected function view(string $view, array $dados = []): void
    {
        View::renderizar($view, $dados);
    }

    protected function json(mixed $dados, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    protected function redirect(string $url, int $status = 302): never
    {
        http_response_code($status);
        header("Location: {$url}");
        exit;
    }

    protected function back(): never
    {
        $this->redirect($_SERVER['HTTP_REFERER'] ?? '/');
    }

    protected function semConteudo(): never
    {
        http_response_code(204);
        exit;
    }

    /* ── VALIDAÇÃO ─────────────────────────────────────────── */

    /**
     * Valida os dados da request. Se inválido:
     * - Ajax/JSON: responde 422 com JSON de erros
     * - Web: redireciona de volta com flash de erros
     */
    protected function validar(array $regras): array
    {
        $dados  = $this->req->all();
        $erros  = Validator::validar($dados, $regras);

        if (empty($erros)) return $dados;

        if ($this->req->isAjax() || $this->req->isJson()) {
            $this->json(['ok' => false, 'erros' => $erros], 422);
        }

        /* Web: flash e redireciona */
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION['_flash']['erros'] = $erros;
            $_SESSION['_flash']['antigo'] = $dados;
        }
        $this->back();
    }

    /* ── HELPERS ───────────────────────────────────────────── */

    protected function abortar(int $status = 404, string $msg = ''): never
    {
        http_response_code($status);
        if ($this->req->isAjax() || $this->req->isJson()) {
            $this->json(['ok' => false, 'mensagem' => $msg ?: "HTTP {$status}"], $status);
        }
        echo $msg ?: "Erro {$status}";
        exit;
    }

    protected function autenticar(): void
    {
        if (!\SW\Auth\Auth::check()) {
            if ($this->req->isAjax()) $this->json(['ok' => false, 'mensagem' => 'Não autenticado'], 401);
            $this->redirect('/login');
        }
    }

    protected function pode(string $permissao): bool
    {
        return \SW\Auth\RBAC::pode($permissao);
    }

    protected function requerPermissao(string $permissao): void
    {
        if (!$this->pode($permissao)) {
            $this->abortar(403, 'Sem permissão para esta ação');
        }
    }
}

