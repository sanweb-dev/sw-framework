<?php
/**
 * SW — QueryBuilder (fluente)
 *
 * Uso:
 *   $rows = QB::tabela('usuarios')
 *              ->select('id, nome, email')
 *              ->where('ativo', 1)
 *              ->where('nivel', '>', 2)
 *              ->whereIn('status', ['ativo', 'pendente'])
 *              ->orderBy('nome')
 *              ->limite(20)
 *              ->buscar();
 *
 *   $pag  = QB::tabela('produtos')->paginar(15);
 *   // → ['dados'=>[...], 'total'=>100, 'paginas'=>7, 'atual'=>1]
 *
 *   $id   = QB::tabela('logs')->inserir(['msg' => 'ok']);
 *   $n    = QB::tabela('users')->where('id', $id)->atualizar(['ativo' => 0]);
 *   $n    = QB::tabela('logs')->where('id', $id)->deletar();
 */

namespace SW\Core;

class QueryBuilder
{
    private string $tabela  = '';
    private string $select  = '*';
    private array  $wheres  = [];
    private array  $params  = [];
    private string $order   = '';
    private string $group   = '';
    private string $having  = '';
    private ?int   $lim     = null;
    private ?int   $off     = null;
    private array  $joins   = [];

    /* ── FACTORY ───────────────────────────────────────────── */

    public static function tabela(string $tabela): static
    {
        $qb = new static();
        $qb->tabela = $tabela;
        return $qb;
    }

    /* ── CLÁUSULAS ─────────────────────────────────────────── */

    public function select(string $cols): static
    {
        $this->select = $cols;
        return $this;
    }

    public function where(string $col, mixed $opOuVal, mixed $val = null): static
    {
        if ($val === null) {
            $this->wheres[] = "{$col} = ?";
            $this->params[] = $opOuVal;
        } else {
            $op = strtoupper($opOuVal);
            $this->wheres[] = "{$col} {$op} ?";
            $this->params[] = $val;
        }
        return $this;
    }

    public function orWhere(string $col, mixed $opOuVal, mixed $val = null): static
    {
        $cond = $val === null ? "{$col} = ?" : "{$col} {$opOuVal} ?";
        $prm  = $val ?? $opOuVal;

        if (!empty($this->wheres)) {
            $ultimo = array_pop($this->wheres);
            $this->wheres[] = "({$ultimo} OR {$cond})";
        } else {
            $this->wheres[] = $cond;
        }
        $this->params[] = $prm;
        return $this;
    }

    public function whereIn(string $col, array $vals): static
    {
        if (empty($vals)) return $this;
        $ph = implode(',', array_fill(0, count($vals), '?'));
        $this->wheres[] = "{$col} IN ({$ph})";
        $this->params   = array_merge($this->params, array_values($vals));
        return $this;
    }

    public function whereNull(string $col): static
    {
        $this->wheres[] = "{$col} IS NULL";
        return $this;
    }

    public function whereNotNull(string $col): static
    {
        $this->wheres[] = "{$col} IS NOT NULL";
        return $this;
    }

    public function whereLike(string $col, string $val): static
    {
        $this->wheres[] = "{$col} LIKE ?";
        $this->params[] = $val;
        return $this;
    }

    public function join(string $tabela, string $on, string $tipo = 'INNER'): static
    {
        $this->joins[] = "{$tipo} JOIN {$tabela} ON {$on}";
        return $this;
    }

    public function orderBy(string $col, string $dir = 'ASC'): static
    {
        $this->order = "ORDER BY {$col} " . ($dir === 'DESC' ? 'DESC' : 'ASC');
        return $this;
    }

    public function groupBy(string $col): static
    {
        $this->group = "GROUP BY {$col}";
        return $this;
    }

    public function having(string $cond, mixed ...$params): static
    {
        $this->having = "HAVING {$cond}";
        $this->params = array_merge($this->params, $params);
        return $this;
    }

    public function limite(int $n): static { $this->lim = $n; return $this; }
    public function offset(int $n): static { $this->off = $n; return $this; }

    /* ── EXECUÇÃO — LEITURA ────────────────────────────────── */

    public function buscar(): array
    {
        return DB::query($this->_buildSelect(), $this->params);
    }

    public function primeiro(): ?array
    {
        $this->lim = 1;
        return DB::primeiro($this->_buildSelect(), $this->params);
    }

    public function contar(): int
    {
        $where = $this->_where();
        $joins = implode(' ', $this->joins);
        $sql   = "SELECT COUNT(*) FROM `{$this->tabela}` {$joins} {$where}";
        return (int) DB::valor($sql, $this->params);
    }

    public function existe(): bool
    {
        return $this->contar() > 0;
    }

    public function valor(string $col): mixed
    {
        $this->select = $col;
        $this->lim    = 1;
        return DB::valor($this->_buildSelect(), $this->params);
    }

    /* ── PAGINAÇÃO ─────────────────────────────────────────── */

    public function paginar(int $porPagina = 15, ?int $pagina = null): array
    {
        $pagina   = $pagina ?? max(1, (int) ($_GET['pag'] ?? 1));
        $total    = $this->contar();
        $paginas  = max(1, (int) ceil($total / $porPagina));
        $pagina   = min($pagina, $paginas);

        $this->lim = $porPagina;
        $this->off = ($pagina - 1) * $porPagina;

        return [
            'dados'    => $this->buscar(),
            'total'    => $total,
            'paginas'  => $paginas,
            'atual'    => $pagina,
            'porPagina'=> $porPagina,
            'inicio'   => $this->off + 1,
            'fim'      => min($this->off + $porPagina, $total),
        ];
    }

    /* ── EXECUÇÃO — ESCRITA ────────────────────────────────── */

    public function inserir(array $dados): string
    {
        $cols   = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($dados)));
        $phs    = implode(', ', array_fill(0, count($dados), '?'));
        $sql    = "INSERT INTO `{$this->tabela}` ({$cols}) VALUES ({$phs})";
        return DB::inserir($sql, array_values($dados));
    }

    public function atualizar(array $dados): int
    {
        $set   = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($dados)));
        $where = $this->_where();
        $sql   = "UPDATE `{$this->tabela}` SET {$set} {$where}";
        return DB::executar($sql, array_merge(array_values($dados), $this->params));
    }

    public function deletar(): int
    {
        $where = $this->_where();
        $sql   = "DELETE FROM `{$this->tabela}` {$where}";
        return DB::executar($sql, $this->params);
    }

    /* ── BUILDERS INTERNOS ─────────────────────────────────── */

    private function _buildSelect(): string
    {
        $joins = implode(' ', $this->joins);
        $where = $this->_where();
        $limit = $this->lim !== null ? "LIMIT {$this->lim}" : '';
        $off   = $this->off !== null ? "OFFSET {$this->off}" : '';
        return "SELECT {$this->select} FROM `{$this->tabela}` {$joins} {$where} {$this->group} {$this->having} {$this->order} {$limit} {$off}";
    }

    private function _where(): string
    {
        return $this->wheres ? 'WHERE ' . implode(' AND ', $this->wheres) : '';
    }
}

/* Alias curto */
class_alias(QueryBuilder::class, 'SW\Core\QB');

