<?php
/**
 * SW — Upload (imagem com resize e thumb via GD)
 *
 * Uso:
 *   $upld = new Upload([
 *     'destino'  => __DIR__ . '/uploads/fotos/',
 *     'maxMB'    => 5,
 *     'mimes'    => ['image/jpeg', 'image/png', 'image/webp'],
 *     'largMax'  => 1920,
 *     'altMax'   => 1080,
 *     'thumb'    => ['larg' => 300, 'alt' => 300, 'pasta' => 'thumbs/'],
 *     'qualidade'=> 85,
 *   ]);
 *
 *   $resultado = $upld->salvar($_FILES['foto']);
 *   // → ['ok'=>true, 'arquivo'=>'uuid.jpg', 'thumb'=>'thumbs/uuid.jpg']
 *
 *   $upld->deletar('uuid.jpg');
 */

namespace SW\Utils;

class Upload
{
    /** Teto absoluto de pixels por lado, independente de largMax/altMax configurados */
    private const LIMITE_DIM_ABSOLUTO = 8000;

    private array $cfg;

    public function __construct(array $cfg = [])
    {
        $this->cfg = array_merge([
            'destino'   => sys_get_temp_dir() . '/uploads/',
            'maxMB'     => 10,
            'mimes'     => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            'largMax'   => 2000,
            'altMax'    => 2000,
            'thumb'     => null,    /* ['larg'=>300,'alt'=>300,'pasta'=>'thumbs/'] */
            'qualidade' => 85,
        ], $cfg);

        @mkdir($this->cfg['destino'], 0755, true);
        if ($this->cfg['thumb']) {
            @mkdir($this->cfg['destino'] . $this->cfg['thumb']['pasta'], 0755, true);
        }
    }

    /* ── SALVAR ────────────────────────────────────────────── */

    public function salvar(array $file): array
    {
        /* Validações */
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['ok' => false, 'mensagem' => 'Erro no upload do arquivo.'];
        }
        if ($file['size'] > $this->cfg['maxMB'] * 1024 * 1024) {
            return ['ok' => false, 'mensagem' => "Arquivo excede {$this->cfg['maxMB']}MB."];
        }

        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, $this->cfg['mimes'])) {
            return ['ok' => false, 'mensagem' => 'Tipo de arquivo não permitido.'];
        }

        // Confere as dimensoes ANTES de decodificar com o GD -- uma imagem
        // "bomba" (poucos KB no disco, mas milhares de pixels por lado) estoura
        // a memoria do servidor em imagecreatefromXXX() antes que largMax/altMax
        // consigam ser checados, porque esses so' rodam depois do decode.
        $info = @getimagesize($file['tmp_name']);
        if (!$info || $info[0] > self::LIMITE_DIM_ABSOLUTO || $info[1] > self::LIMITE_DIM_ABSOLUTO) {
            return ['ok' => false, 'mensagem' => 'Imagem inválida ou com dimensões excessivas.'];
        }

        $ext       = $this->_ext($mime);
        $nome      = bin2hex(random_bytes(12)) . '.' . $ext;
        $destino   = rtrim($this->cfg['destino'], '/\\') . '/' . $nome;

        /* Redimensiona e salva */
        $ok = $this->_redimensionar($file['tmp_name'], $destino, $mime);
        if (!$ok) return ['ok' => false, 'mensagem' => 'Falha ao processar imagem.'];

        $resultado = ['ok' => true, 'arquivo' => $nome, 'thumb' => null];

        /* Thumb */
        if ($this->cfg['thumb']) {
            $tc    = $this->cfg['thumb'];
            $tdest = rtrim($this->cfg['destino'], '/\\') . '/' . rtrim($tc['pasta'], '/\\') . '/' . $nome;
            $this->_thumb($destino, $tdest, $tc['larg'], $tc['alt'], $mime);
            $resultado['thumb'] = rtrim($tc['pasta'], '/\\') . '/' . $nome;
        }

        return $resultado;
    }

    /* ── DELETAR ───────────────────────────────────────────── */

    public function deletar(string $nome): void
    {
        // basename() corta qualquer "../" ou caminho absoluto -- sem isso, um
        // nome vindo de fora (ex.: query string de um botao "remover imagem")
        // apagaria qualquer arquivo do servidor, nao so os desta pasta de upload.
        $nome = basename($nome);
        if ($nome === '' || $nome === '.' || $nome === '..') return;

        $base = rtrim($this->cfg['destino'], '/\\') . '/';
        @unlink($base . $nome);
        if ($this->cfg['thumb']) {
            @unlink($base . rtrim($this->cfg['thumb']['pasta'], '/\\') . '/' . $nome);
        }
    }

    /* ── REDIMENSIONAR ─────────────────────────────────────── */

    private function _redimensionar(string $src, string $dst, string $mime): bool
    {
        $img = $this->_carregar($src, $mime);
        if (!$img) return false;

        [$lOrig, $aOrig] = [imagesx($img), imagesy($img)];
        [$lMax, $aMax]   = [$this->cfg['largMax'], $this->cfg['altMax']];

        if ($lOrig <= $lMax && $aOrig <= $aMax) {
            /* Não precisa redimensionar */
            return $this->_salvarImg($img, $dst, $mime);
        }

        /* Calcula proporcional */
        $ratio = min($lMax / $lOrig, $aMax / $aOrig);
        $lNova = (int) round($lOrig * $ratio);
        $aNova = (int) round($aOrig * $ratio);

        $nova = imagecreatetruecolor($lNova, $aNova);
        $this->_preservarAlpha($nova, $mime);
        imagecopyresampled($nova, $img, 0, 0, 0, 0, $lNova, $aNova, $lOrig, $aOrig);

        $ok = $this->_salvarImg($nova, $dst, $mime);
        imagedestroy($img);
        imagedestroy($nova);
        return $ok;
    }

    private function _thumb(string $src, string $dst, int $larg, int $alt, string $mime): bool
    {
        $img = $this->_carregar($src, $mime);
        if (!$img) return false;

        [$lOrig, $aOrig] = [imagesx($img), imagesy($img)];

        /* Corte centralizado (cover) */
        $ratio    = max($larg / $lOrig, $alt / $aOrig);
        $lEsc     = (int) round($lOrig * $ratio);
        $aEsc     = (int) round($aOrig * $ratio);
        $xOff     = (int) round(($lEsc - $larg) / 2 / $ratio);
        $yOff     = (int) round(($aEsc - $alt)  / 2 / $ratio);
        $lSrc     = (int) round($larg / $ratio);
        $aSrc     = (int) round($alt  / $ratio);

        $nova = imagecreatetruecolor($larg, $alt);
        $this->_preservarAlpha($nova, $mime);
        imagecopyresampled($nova, $img, 0, 0, $xOff, $yOff, $larg, $alt, $lSrc, $aSrc);

        $ok = $this->_salvarImg($nova, $dst, $mime);
        imagedestroy($img);
        imagedestroy($nova);
        return $ok;
    }

    /* ── HELPERS GD ────────────────────────────────────────── */

    private function _carregar(string $path, string $mime): mixed
    {
        return match ($mime) {
            'image/jpeg'  => imagecreatefromjpeg($path),
            'image/png'   => imagecreatefrompng($path),
            'image/webp'  => imagecreatefromwebp($path),
            'image/gif'   => imagecreatefromgif($path),
            default       => null,
        };
    }

    private function _salvarImg(mixed $img, string $dst, string $mime): bool
    {
        return match ($mime) {
            'image/jpeg' => imagejpeg($img, $dst, $this->cfg['qualidade']),
            'image/png'  => imagepng($img, $dst, min(9, (int) round((100 - $this->cfg['qualidade']) / 10))),
            'image/webp' => imagewebp($img, $dst, $this->cfg['qualidade']),
            'image/gif'  => imagegif($img, $dst),
            default      => false,
        };
    }

    private function _preservarAlpha(mixed $img, string $mime): void
    {
        if (in_array($mime, ['image/png', 'image/gif', 'image/webp'])) {
            imagealphablending($img, false);
            imagesavealpha($img, true);
        }
    }

    private function _ext(string $mime): string
    {
        return ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$mime] ?? 'jpg';
    }
}

