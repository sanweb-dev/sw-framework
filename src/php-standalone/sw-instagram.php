<?php
/**
 * SW Instagram Proxy — v1.0
 * Busca feed público do Instagram via cURL server-side.
 * Cache automático de 1h. Zero token, zero API key.
 *
 * Uso: GET sw-instagram.php?user=sanweb.dev&limit=9
 * Proxy de imagens: GET sw-instagram.php?img=URL_CODIFICADA
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$cacheDir = __DIR__ . '/cache/instagram';
$cacheTtl = 3600; // 1 hora

// Hosts reais de onde o Instagram serve imagem/avatar -- sem essa lista, o
// proxy de imagem vira um SSRF (Server-Side Request Forgery): qualquer URL
// validada por FILTER_VALIDATE_URL passaria, inclusive endereços internos
// (ex.: metadata de nuvem, serviços internos da rede).
const INSTAGRAM_IMG_HOSTS = ['cdninstagram.com', 'fbcdn.net'];

function swInstagramHostPermitido(string $host): bool {
    foreach (INSTAGRAM_IMG_HOSTS as $permitido) {
        if ($host === $permitido || str_ends_with($host, '.' . $permitido)) return true;
    }
    return false;
}

// ── Proxy de imagens (evita hotlink block) ──
if (isset($_GET['img'])) {
    $imgUrl = $_GET['img'];
    $parts  = parse_url($imgUrl);
    $host   = $parts['host'] ?? '';
    if (
        !filter_var($imgUrl, FILTER_VALIDATE_URL)
        || ($parts['scheme'] ?? '') !== 'https'
        || !swInstagramHostPermitido($host)
    ) {
        http_response_code(400);
        exit;
    }
    $ch = curl_init($imgUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false, // redirect poderia escapar pro allowlist de host acima
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER     => ['Accept: image/webp,image/apng,image/*,*/*;q=0.8'],
    ]);
    $img = curl_exec($ch);
    $ct  = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    if (!$img) { http_response_code(502); exit; }
    header('Content-Type: ' . ($ct ?: 'image/jpeg'));
    header('Cache-Control: public, max-age=86400');
    echo $img;
    exit;
}

// ── Feed principal ──
$user  = preg_replace('/[^a-zA-Z0-9._]/', '', $_GET['user'] ?? '');
$limit = min(max(intval($_GET['limit'] ?? 12), 1), 50);

if (!$user) {
    echo json_encode(['error' => 'Parâmetro "user" é obrigatório.']);
    exit;
}

// Cria diretório de cache
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

$cacheFile = $cacheDir . '/' . $user . '.json';

// Retorna cache se válido
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
    $cached = json_decode(file_get_contents($cacheFile), true);
    if ($cached && !empty($cached['posts'])) {
        $cached['cached'] = true;
        $cached['posts']  = array_slice($cached['posts'], 0, $limit);
        echo json_encode($cached, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

// ── Buscar perfil no Instagram ──
$url = "https://www.instagram.com/{$user}/";

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    CURLOPT_HTTPHEADER     => [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: pt-BR,pt;q=0.9,en;q=0.8',
        'Sec-Fetch-Mode: navigate',
        'Sec-Fetch-Site: none',
    ],
    CURLOPT_ENCODING       => '',
    CURLOPT_SSL_VERIFYPEER => true,
]);

$html = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (!$html || $httpCode !== 200) {
    echo json_encode(['error' => "Não foi possível acessar o perfil @{$user}. HTTP {$httpCode}"]);
    exit;
}

// ── Parsear dados ──
$result = parseInstagramHtml($html, $user);

if (!$result || empty($result['posts'])) {
    // Fallback: tentar via API graphql com cookie público
    $result = tryGraphqlFallback($user);
}

if (!$result || empty($result['posts'])) {
    echo json_encode(['error' => "Não foi possível extrair posts de @{$user}. O Instagram pode ter bloqueado o acesso."]);
    exit;
}

// Proxy das imagens pelo nosso servidor
$proxyBase = basename(__FILE__);
foreach ($result['posts'] as &$post) {
    if (!empty($post['image'])) {
        $post['image_original'] = $post['image'];
        $post['image'] = $proxyBase . '?img=' . urlencode($post['image']);
    }
}
unset($post);
if (!empty($result['avatar'])) {
    $result['avatar_original'] = $result['avatar'];
    $result['avatar'] = $proxyBase . '?img=' . urlencode($result['avatar']);
}

$result['fetched'] = time();
$result['cached']  = false;

// Salvar cache
@file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

$result['posts'] = array_slice($result['posts'], 0, $limit);
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// ══════════════════════════════════════════════════════════
// Funções de parsing
// ══════════════════════════════════════════════════════════

function parseInstagramHtml($html, $user) {
    $data = null;

    // Método 1: window._sharedData (legado, pode estar ausente)
    if (preg_match('/window\._sharedData\s*=\s*({.+?});<\/script>/s', $html, $m)) {
        $json = json_decode($m[1], true);
        $userData = $json['entry_data']['ProfilePage'][0]['graphql']['user'] ?? null;
        if ($userData) {
            return extractFromGraphql($userData, $user);
        }
    }

    // Método 2: __additionalData (variante moderna)
    if (preg_match('/window\.__additionalDataLoaded\s*\(\s*[\'"].*?[\'"]\s*,\s*({.+?})\s*\)\s*;/s', $html, $m)) {
        $json = json_decode($m[1], true);
        $userData = $json['graphql']['user'] ?? $json['user'] ?? null;
        if ($userData) {
            return extractFromGraphql($userData, $user);
        }
    }

    // Método 3: script type="application/json" com xdt_api__v1__feed
    if (preg_match_all('/<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/s', $html, $matches)) {
        foreach ($matches[1] as $jsonStr) {
            $json = json_decode($jsonStr, true);
            if (!$json) continue;

            // Buscar recursivamente por dados de usuário
            $userData = findUserData($json, $user);
            if ($userData) return $userData;
        }
    }

    // Método 4: buscar qualquer JSON grande no HTML
    if (preg_match_all('/({(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*"edge_owner_to_timeline_media"(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})/s', $html, $m)) {
        foreach ($m[1] as $jsonStr) {
            $json = json_decode($jsonStr, true);
            if ($json && isset($json['edge_owner_to_timeline_media'])) {
                return extractFromGraphql($json, $user);
            }
        }
    }

    return null;
}

function findUserData($data, $user, $depth = 0) {
    if ($depth > 8 || !is_array($data)) return null;

    // Procura edge_owner_to_timeline_media em qualquer nível
    if (isset($data['edge_owner_to_timeline_media']['edges'])) {
        return extractFromGraphql($data, $user);
    }

    // Procura posts em formato da API v1
    if (isset($data['items']) && is_array($data['items'])) {
        $firstItem = $data['items'][0] ?? null;
        if ($firstItem && (isset($firstItem['code']) || isset($firstItem['pk']))) {
            return extractFromApiV1($data, $user);
        }
    }

    foreach ($data as $val) {
        if (is_array($val)) {
            $result = findUserData($val, $user, $depth + 1);
            if ($result) return $result;
        }
    }

    return null;
}

function extractFromGraphql($userData, $user) {
    $posts = [];
    $edges = $userData['edge_owner_to_timeline_media']['edges'] ?? [];

    foreach ($edges as $edge) {
        $node = $edge['node'] ?? $edge;
        $caption = $node['edge_media_to_caption']['edges'][0]['node']['text'] ?? '';
        $posts[] = [
            'url'       => 'https://www.instagram.com/p/' . ($node['shortcode'] ?? ''),
            'image'     => $node['display_url'] ?? $node['thumbnail_src'] ?? '',
            'caption'   => $caption,
            'likes'     => $node['edge_liked_by']['count'] ?? $node['edge_media_preview_like']['count'] ?? 0,
            'comments'  => $node['edge_media_to_comment']['count'] ?? 0,
            'is_video'  => $node['is_video'] ?? false,
            'timestamp' => $node['taken_at_timestamp'] ?? 0,
        ];
    }

    return [
        'user'      => $userData['username'] ?? $user,
        'name'      => $userData['full_name'] ?? '',
        'avatar'    => $userData['profile_pic_url_hd'] ?? $userData['profile_pic_url'] ?? '',
        'followers' => $userData['edge_followed_by']['count'] ?? 0,
        'posts'     => $posts,
    ];
}

function extractFromApiV1($data, $user) {
    $posts = [];
    $items = $data['items'] ?? [];

    foreach ($items as $item) {
        $img = $item['image_versions2']['candidates'][0]['url']
            ?? $item['carousel_media'][0]['image_versions2']['candidates'][0]['url']
            ?? '';
        $posts[] = [
            'url'       => 'https://www.instagram.com/p/' . ($item['code'] ?? ''),
            'image'     => $img,
            'caption'   => $item['caption']['text'] ?? '',
            'likes'     => $item['like_count'] ?? 0,
            'comments'  => $item['comment_count'] ?? 0,
            'is_video'  => ($item['media_type'] ?? 1) === 2,
            'timestamp' => $item['taken_at'] ?? 0,
        ];
    }

    $owner = $items[0]['user'] ?? [];
    return [
        'user'      => $owner['username'] ?? $user,
        'name'      => $owner['full_name'] ?? '',
        'avatar'    => $owner['profile_pic_url'] ?? '',
        'followers' => 0,
        'posts'     => $posts,
    ];
}

function tryGraphqlFallback($user) {
    // Tenta endpoint alternativo
    $url = "https://www.instagram.com/api/v1/users/web_profile_info/?username=" . urlencode($user);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        CURLOPT_HTTPHEADER     => [
            'Accept: */*',
            'X-IG-App-ID: 936619743392459',
            'X-Requested-With: XMLHttpRequest',
        ],
    ]);

    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200 || !$body) return null;

    $json = json_decode($body, true);
    $userData = $json['data']['user'] ?? null;
    if (!$userData) return null;

    return extractFromGraphql($userData, $user);
}
