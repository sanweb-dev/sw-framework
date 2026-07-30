<?php
/**
 * SW — Model (ORM estático, herdar por entidade)
 *
 * Uso:
 *   class Usuario extends Model {
 *     protected static string $tabela  = 'usuarios';
 *     protected static string $pk      = 'id';
 *     protected static array  $fillable = ['nome','email','senha','nivel'];
 *   }
 *
 *   Usuario::todos()
 *   Usuario::encontrar(5)
 *   Usuario::criar(['nome' => 'João', 'email' => 'j@j.com'])
 *   Usuario::atualizar(5, ['nome' => 'João Novo'])
 *   Usuario::deletar(5)
 *   Usuario::query()->where('ativo', 1)->orderBy('nome')->buscar()
 *   Usuario::primeiro(['email' => 'j@j.com'])
 *   Usuario::existe(['email' => 'j@j.com'])
 *   Usuario::contar(['ativo' => 1])
 */

namespace SW\Core;

abstract class Model
{
    protected static string $tabela   = '';
    protected static string $pk       = 'id';
    protected static array  $fillable = [];
    protected static array  $ocultos  = ['senha', 'token'];   /* nunca retornados em toArray() */
    protected static bool   $timestamps = true;

    /* ── QUERY BUILDER ─────────────────────────────────────── */

    public static function query(): QueryBuilder
    {
        return QueryBuilder::tabela(static::$tabela);
    }

    /* ── LEITURA ───────────────────────────────────────────── */

    public static function todos(string $order = ''): array
    {
        $qb = static::query();
        if ($order) $qb->orderBy(...explode(' ', $order, 2));
        return $qb->buscar();
    }

    public static function encontrar(int|string $id): ?array
    {
        return static::query()->where(static::$pk, $id)->primeiro();
    }

    public static function encontrarOuAbortar(int|string $id): array
    {
        $row = static::encontrar($id);
        if (!$row) {
            http_response_code(404);
            exit(json_encode(['ok' => false, 'mensagem' => 'Registro não encontrado']));
        }
        return $row;
    }

    public static function primeiro(array $where = []): ?array
    {
        $qb = static::query();
        foreach ($where as $col => $val) $qb->where($col, $val);
        return $qb->primeiro();
    }

    public static function buscar(array $where = [], string $order = ''): array
    {
        $qb = static::query();
        foreach ($where as $col => $val) $qb->where($col, $val);
        if ($order) $qb->orderBy(...explode(' ', $order, 2));
        return $qb->buscar();
    }

    public static function contar(array $where = []): int
    {
        $qb = static::query();
        foreach ($where as $col => $val) $qb->where($col, $val);
        return $qb->contar();
    }

    public static function existe(array $where): bool
    {
        return static::contar($where) > 0;
    }

    public static function paginar(int $pp = 15, array $where = [], string $order = ''): array
    {
        $qb = static::query();
        foreach ($where as $col => $val) $qb->where($col, $val);
        if ($order) $qb->orderBy(...explode(' ', $order, 2));
        return $qb->paginar($pp);
    }

    /* ── ESCRITA ───────────────────────────────────────────── */

    public static function criar(array $dados): string
    {
        $dados = static::_filtrar($dados);
        if (static::$timestamps) {
            $dados['criado_em']    = date('Y-m-d H:i:s');
            $dados['atualizado_em'] = date('Y-m-d H:i:s');
        }
        return static::query()->inserir($dados);
    }

    public static function atualizar(int|string $id, array $dados): int
    {
        $dados = static::_filtrar($dados);
        if (static::$timestamps) $dados['atualizado_em'] = date('Y-m-d H:i:s');
        return static::query()->where(static::$pk, $id)->atualizar($dados);
    }

    public static function salvarOuCriar(array $where, array $dados): string
    {
        $existente = static::primeiro($where);
        if ($existente) {
            static::atualizar($existente[static::$pk], $dados);
            return $existente[static::$pk];
        }
        return static::criar(array_merge($where, $dados));
    }

    public static function deletar(int|string $id): int
    {
        return static::query()->where(static::$pk, $id)->deletar();
    }

    /* ── HELPERS ───────────────────────────────────────────── */

    private static function _filtrar(array $dados): array
    {
        if (empty(static::$fillable)) return $dados;
        return array_intersect_key($dados, array_flip(static::$fillable));
    }

    /** Remove campos sensíveis de um array de resultado */
    public static function ocultar(array $row): array
    {
        return array_diff_key($row, array_flip(static::$ocultos));
    }

    /** Hash de senha usando password_hash */
    public static function hashSenha(string $senha): string
    {
        return password_hash($senha, PASSWORD_BCRYPT);
    }

    public static function verificarSenha(string $senha, string $hash): bool
    {
        return password_verify($senha, $hash);
    }
}

