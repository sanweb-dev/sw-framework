<?php
/**
 * SW — CrudController (CRUD herdável)
 * Herdar e definir propriedades. Todos os métodos são sobrescrevíveis.
 *
 * Uso:
 *   class UsuarioController extends CrudController {
 *     protected string $model    = Usuario::class;
 *     protected string $viewDir  = 'usuarios';
 *     protected string $rotaBase = '/usuarios';
 *     protected array  $regras   = [
 *       'nome'  => 'required|min:2',
 *       'email' => 'required|email|unique:usuarios',
 *     ];
 *   }
 *
 *   // Rotas:
 *   Router::get('/usuarios',        'UsuarioController@lista');
 *   Router::get('/usuarios/:id',    'UsuarioController@ver');
 *   Router::get('/usuarios/novo',   'UsuarioController@form');
 *   Router::post('/usuarios',       'UsuarioController@salvar');
 *   Router::get('/usuarios/:id/editar', 'UsuarioController@form');
 *   Router::post('/usuarios/:id',   'UsuarioController@salvar');
 *   Router::post('/usuarios/:id/deletar', 'UsuarioController@deletar');
 *
 *   Para Ajax (API):
 *   Router::get('/api/usuarios',      'Api\UsuarioController@lista');
 *   Router::post('/api/usuarios',     'Api\UsuarioController@salvar');
 *   Router::put('/api/usuarios/:id',  'Api\UsuarioController@salvar');
 *   Router::delete('/api/usuarios/:id', 'Api\UsuarioController@deletar');
 */

namespace SW\Core;

abstract class CrudController extends Controller
{
    protected string $model    = '';       /* ex: Usuario::class */
    protected string $viewDir  = '';       /* ex: 'usuarios' */
    protected string $rotaBase = '';       /* ex: '/usuarios' */
    protected string $pk       = 'id';
    protected array  $regras   = [];
    protected int    $porPagina = 15;
    protected string $orderPad  = '';     /* ex: 'nome ASC' */

    /* ── LISTA ─────────────────────────────────────────────── */

    public function lista(): void
    {
        /** @var Model $model */
        $model   = $this->model;
        $pag     = $model::paginar($this->porPagina, [], $this->orderPad);

        if ($this->req->isAjax()) {
            $this->json(['ok' => true, 'dados' => $pag]);
        }

        $this->view("{$this->viewDir}/lista", [
            'paginacao' => $pag,
            'rotaBase'  => $this->rotaBase,
        ]);
    }

    /* ── VER ───────────────────────────────────────────────── */

    public function ver(int|string $id): void
    {
        $model = $this->model;
        $item  = $model::encontrarOuAbortar($id);

        if ($this->req->isAjax()) $this->json(['ok' => true, 'dado' => $item]);
        $this->view("{$this->viewDir}/ver", ['item' => $item, 'rotaBase' => $this->rotaBase]);
    }

    /* ── FORM (novo / editar) ──────────────────────────────── */

    public function form(?int $id = null): void
    {
        $model = $this->model;
        $item  = $id ? $model::encontrarOuAbortar($id) : null;
        $this->view("{$this->viewDir}/form", [
            'item'     => $item,
            'rotaBase' => $this->rotaBase,
        ]);
    }

    /* ── SALVAR (POST = criar, PUT = atualizar) ────────────── */

    public function salvar(?int $id = null): void
    {
        $this->verificarCsrf();
        $dados = $this->validar($this->_regrasParaId($id));
        $model = $this->model;

        if ($id) {
            $model::atualizar($id, $dados);
            $msg = 'Registro atualizado com sucesso.';
        } else {
            $id  = $model::criar($dados);
            $msg = 'Registro criado com sucesso.';
        }

        if ($this->req->isAjax()) {
            $this->json(['ok' => true, 'mensagem' => $msg, $this->pk => $id]);
        }

        \SW\Auth\Session::flash('ok', $msg);
        $this->redirect($this->rotaBase);
    }

    /* ── DELETAR ───────────────────────────────────────────── */

    public function deletar(int|string $id): void
    {
        $this->verificarCsrf();
        $model = $this->model;
        $model::encontrarOuAbortar($id);
        $model::deletar($id);
        $msg = 'Registro excluído com sucesso.';

        if ($this->req->isAjax()) {
            $this->json(['ok' => true, 'mensagem' => $msg]);
        }

        \SW\Auth\Session::flash('ok', $msg);
        $this->redirect($this->rotaBase);
    }

    /* ── HELPERS ───────────────────────────────────────────── */

    /** Ajusta regras únicas para ignorar o registro atual */
    private function _regrasParaId(?int $id): array
    {
        if (!$id) return $this->regras;

        return array_map(function (string $regra) use ($id) {
            /* unique:tabela → unique:tabela,pk,id */
            return preg_replace('/unique:(\w+)/', "unique:$1,{$this->pk},{$id}", $regra);
        }, $this->regras);
    }
}

