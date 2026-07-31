<?php
/**
 * SW — Validator
 *
 * Uso:
 *   $erros = Validator::validar($dados, [
 *     'nome'  => 'required|min:2|max:100',
 *     'email' => 'required|email|unique:usuarios',
 *     'senha' => 'required|min:6|confirma:senha_conf',
 *     'idade' => 'nullable|inteiro|min:18|max:120',
 *     'foto'  => 'nullable|arquivo|max_mb:5|mime:jpg,png,webp',
 *   ]);
 *   // $erros → ['campo' => 'mensagem'] ou []
 *
 * Regras:
 *   required, nullable, min:N, max:N, email, url, inteiro, decimal,
 *   cpf, cnpj, tel, cep, data, confirma:campo, unique:tabela[,col][,ignorarId],
 *   arquivo, max_mb:N, mime:ext1,ext2
 */

namespace SW\Utils;

use SW\Core\DB;

class Validator
{
    private static array $msgs = [
        'required'  => 'O campo :campo é obrigatório.',
        'min'       => 'O campo :campo deve ter no mínimo :n caracteres.',
        'max'       => 'O campo :campo deve ter no máximo :n caracteres.',
        'email'     => 'O campo :campo deve ser um e-mail válido.',
        'url'       => 'O campo :campo deve ser uma URL válida.',
        'inteiro'   => 'O campo :campo deve ser um número inteiro.',
        'decimal'   => 'O campo :campo deve ser um número.',
        'cpf'       => 'O campo :campo deve ser um CPF válido.',
        'cnpj'      => 'O campo :campo deve ser um CNPJ válido.',
        'tel'       => 'O campo :campo deve ser um telefone válido.',
        'cep'       => 'O campo :campo deve ser um CEP válido.',
        'data'      => 'O campo :campo deve ser uma data válida.',
        'confirma'  => 'O campo :campo não confere com a confirmação.',
        'unique'    => 'Este :campo já está em uso.',
        'arquivo'   => 'O campo :campo deve ser um arquivo.',
        'max_mb'    => 'O arquivo :campo excede :n MB.',
        'mime'      => 'O arquivo :campo deve ser do tipo: :n.',
    ];

    /* ── VALIDAR ───────────────────────────────────────────── */

    public static function validar(array $dados, array $regras): array
    {
        $erros = [];

        foreach ($regras as $campo => $regraStr) {
            $lista    = explode('|', $regraStr);
            $nullable = in_array('nullable', $lista);
            $valor    = $dados[$campo] ?? null;
            $vazio    = $valor === null || $valor === '';

            /* nullable + vazio → pula */
            if ($nullable && $vazio) continue;

            foreach ($lista as $regra) {
                if ($regra === 'nullable') continue;

                [$nome, $param] = array_pad(explode(':', $regra, 2), 2, null);
                $ok = self::_checar($nome, $valor, $param, $dados, $campo);

                if (!$ok) {
                    $erros[$campo] = self::_msg($nome, $campo, $param);
                    break;   /* um erro por campo */
                }
            }
        }

        return $erros;
    }

    /* ── CHECAGEM ──────────────────────────────────────────── */

    private static function _checar(string $regra, mixed $val, ?string $param, array $dados, string $campo): bool
    {
        return match ($regra) {
            'required' => $val !== null && $val !== '' && $val !== [],
            'min'      => mb_strlen((string) $val) >= (int) $param,
            'max'      => mb_strlen((string) $val) <= (int) $param,
            'email'    => filter_var($val, FILTER_VALIDATE_EMAIL) !== false,
            'url'      => filter_var($val, FILTER_VALIDATE_URL)   !== false,
            'inteiro'  => filter_var($val, FILTER_VALIDATE_INT)   !== false,
            'decimal'  => is_numeric($val),
            'cpf'      => self::_cpf($val),
            'cnpj'     => self::_cnpj($val),
            'tel'      => (bool) preg_match('/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/', $val),
            'cep'      => (bool) preg_match('/^\d{5}-?\d{3}$/', $val),
            'data'     => self::_data($val),
            'confirma' => $val === ($dados[$param] ?? null),
            'unique'   => self::_unique($val, $param, $campo),
            'arquivo'  => isset($_FILES[$campo]) && $_FILES[$campo]['error'] === UPLOAD_ERR_OK,
            'max_mb'   => isset($_FILES[$campo]) && $_FILES[$campo]['size'] <= (int) $param * 1024 * 1024,
            'mime'     => self::_mime($campo, $param),
            default    => true,
        };
    }

    /* ── HELPERS ───────────────────────────────────────────── */

    private static function _unique(mixed $val, ?string $param, string $campo): bool
    {
        [$tabela, $col, $ignorarId] = array_pad(explode(',', $param ?? '', 3), 3, null);
        // Sem coluna explicita (ex.: "unique:usuarios"), a checagem e' sobre o
        // proprio campo sendo validado (ex.: "email"), nunca sobre a PK -- usar
        // 'id' aqui faria a comparacao ser sempre falsa (string contra inteiro)
        // e a regra "unique" nunca acusaria duplicidade.
        $col ??= $campo;

        $sql    = "SELECT COUNT(*) FROM `{$tabela}` WHERE `{$col}` = ?";
        $params = [$val];

        if ($ignorarId) {
            $sql      .= " AND id != ?";
            $params[]  = $ignorarId;
        }

        return (int) DB::valor($sql, $params) === 0;
    }

    private static function _data(mixed $val): bool
    {
        try {
            new \DateTime((string) $val);
            return true;
        } catch (\Exception) {
            return false;
        }
    }

    /** Mapa extensao → mime real esperado, usado pra conferir o conteudo de verdade */
    private static array $mimesPorExt = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
        'gif' => 'image/gif',  'webp' => 'image/webp',  'pdf' => 'application/pdf',
        'svg' => 'image/svg+xml',
    ];

    private static function _mime(string $campo, ?string $param): bool
    {
        if (!isset($_FILES[$campo]) || !$param) return true;
        $exts    = array_map('trim', explode(',', strtolower($param)));
        $arquivo = $_FILES[$campo]['name'];
        $ext     = strtolower(pathinfo($arquivo, PATHINFO_EXTENSION));
        if (!in_array($ext, $exts)) return false;

        // A extensao do nome enviado pelo navegador e' so o que o cliente
        // afirma -- confere o conteudo real do arquivo (magic bytes via
        // fileinfo) sempre que souber o mime esperado pra essa extensao.
        $tmp = $_FILES[$campo]['tmp_name'] ?? '';
        if ($tmp !== '' && is_uploaded_file($tmp) && isset(self::$mimesPorExt[$ext])) {
            $mimeReal = @mime_content_type($tmp);
            if ($mimeReal !== self::$mimesPorExt[$ext]) return false;
        }

        return true;
    }

    private static function _cpf(mixed $val): bool
    {
        $v = preg_replace('/\D/', '', (string) $val);
        if (strlen($v) !== 11 || preg_match('/^(\d)\1{10}$/', $v)) return false;
        for ($t = 9; $t < 11; $t++) {
            $d = 0;
            for ($c = 0; $c < $t; $c++) $d += $v[$c] * ($t + 1 - $c);
            $d = ((10 * $d) % 11) % 10;
            if ($v[$c] != $d) return false;
        }
        return true;
    }

    private static function _cnpj(mixed $val): bool
    {
        $v = preg_replace('/\D/', '', (string) $val);
        if (strlen($v) !== 14 || preg_match('/^(\d)\1{13}$/', $v)) return false;
        $calc = function(string $v, int $t): int {
            $d = 0; $pos = $t - 7;
            for ($i = $t; $i >= 1; $i--) {
                $d += $v[$t - $i] * $pos--;
                if ($pos < 2) $pos = 9;
            }
            return $d < 2 ? 0 : 11 - $d;
        };
        return $v[12] == $calc($v, 12) && $v[13] == $calc($v, 13);
    }

    /* ── MENSAGEM ──────────────────────────────────────────── */

    private static function _msg(string $regra, string $campo, ?string $param): string
    {
        $msg = self::$msgs[$regra] ?? "Valor inválido para :campo.";
        return str_replace([':campo', ':n'], [ucfirst(str_replace('_', ' ', $campo)), $param ?? ''], $msg);
    }

    /** Personaliza mensagens */
    public static function msgs(array $msgs): void
    {
        self::$msgs = array_merge(self::$msgs, $msgs);
    }
}

