<?php
/**
 * SW — DB (conexão PDO singleton)
 * Configuração via constantes ou array passado no primeiro acesso.
 *
 * Uso:
 *   DB::conectar(['host'=>'...', 'banco'=>'...', 'user'=>'...', 'pass'=>'...']);
 *   $pdo = DB::pdo();
 *   $rows = DB::query('SELECT * FROM usuarios WHERE ativo = ?', [1]);
 *   $row  = DB::primeiro('SELECT * FROM usuarios WHERE id = ?', [$id]);
 *   $id   = DB::inserir('INSERT INTO usuarios (nome) VALUES (?)', ['João']);
 *   DB::executar('UPDATE usuarios SET ativo = 0 WHERE id = ?', [$id]);
 */

namespace SW\Core;

class DB
{
    private static ?\PDO $pdo = null;
    private static array $cfg = [];

    /* ── CONFIGURAR / CONECTAR ─────────────────────────────── */

    public static function conectar(array $cfg): void
    {
        self::$cfg = array_merge([
            'host'    => 'localhost',
            'banco'   => '',
            'user'    => 'root',
            'pass'    => '',
            'charset' => 'utf8mb4',
            'port'    => 3306,
        ], $cfg);
    }

    public static function pdo(): \PDO
    {
        if (self::$pdo !== null) return self::$pdo;

        $c   = self::$cfg;
        $dsn = "mysql:host={$c['host']};port={$c['port']};dbname={$c['banco']};charset={$c['charset']}";

        try {
            self::$pdo = new \PDO($dsn, $c['user'], $c['pass'], [
                \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (\PDOException $e) {
            throw new \RuntimeException('Falha na conexão com o banco: ' . $e->getMessage());
        }

        return self::$pdo;
    }

    /* ── QUERY HELPERS ─────────────────────────────────────── */

    public static function query(string $sql, array $params = []): array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function primeiro(string $sql, array $params = []): ?array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function inserir(string $sql, array $params = []): string
    {
        self::pdo()->prepare($sql)->execute($params);
        return self::pdo()->lastInsertId();
    }

    public static function executar(string $sql, array $params = []): int
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public static function valor(string $sql, array $params = []): mixed
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    /* ── TRANSAÇÃO ─────────────────────────────────────────── */

    public static function transacao(callable $fn): mixed
    {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $resultado = $fn($pdo);
            $pdo->commit();
            return $resultado;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /* ── UTIL ──────────────────────────────────────────────── */

    /** Escapa identificadores (tabela, coluna) — NÃO usar com valores */
    public static function escaparId(string $id): string
    {
        return '`' . str_replace('`', '``', $id) . '`';
    }
}

