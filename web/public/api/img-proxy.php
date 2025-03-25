<?php
/**
 * 图片代理服务
 * 
 * 此脚本用于解决豆瓣等网站的图片跨域和防盗链问题
 * 使用方法: img-proxy.php?url=https://example.com/image.jpg
 */

// 设置错误报告
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 如果是OPTIONS请求（预检请求），直接返回
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 检查是否提供了URL参数
if (!isset($_GET['url']) || empty($_GET['url'])) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Missing URL parameter']);
    exit;
}

// 获取并净化URL
$url = filter_var($_GET['url'], FILTER_SANITIZE_URL);

// 验证URL格式
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid URL format']);
    exit;
}

// 只允许特定域名的图片请求，提高安全性
$allowedDomains = [
    'douban.com',
    'doubanio.com',
    'img9.doubanio.com',
    'img1.doubanio.com',
    'img2.doubanio.com',
    'img3.doubanio.com'
];

$isAllowed = false;
$parsedUrl = parse_url($url);
$host = $parsedUrl['host'] ?? '';

foreach ($allowedDomains as $domain) {
    if (strpos($host, $domain) !== false) {
        $isAllowed = true;
        break;
    }
}

if (!$isAllowed) {
    header('Content-Type: application/json');
    http_response_code(403);
    echo json_encode(['error' => 'Domain not allowed']);
    exit;
}

// 设置超时和其他选项
$options = [
    'http' => [
        'timeout' => 10,
        'follow_location' => true,
        'max_redirects' => 3,
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'header' => [
            'Referer: https://book.douban.com/',
            'Accept: image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8'
        ]
    ],
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false
    ]
];

// 创建上下文
$context = stream_context_create($options);

try {
    // 尝试获取图片内容
    $imageContent = @file_get_contents($url, false, $context);
    
    if ($imageContent === false) {
        throw new Exception('Failed to fetch image: ' . error_get_last()['message']);
    }
    
    // 获取图片MIME类型
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->buffer($imageContent);
    
    // 检查是否为图片
    if (!preg_match('/^image\//', $mimeType)) {
        throw new Exception('Not an image');
    }
    
    // 设置正确的Content-Type
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . strlen($imageContent));
    
    // 设置缓存
    $maxAge = 60 * 60 * 24 * 7; // 7天
    header('Cache-Control: public, max-age=' . $maxAge);
    header('Expires: ' . gmdate('D, d M Y H:i:s', time() + $maxAge) . ' GMT');
    
    // 输出图片内容
    echo $imageContent;
} catch (Exception $e) {
    error_log('Image proxy error: ' . $e->getMessage());
    // 出错时重定向到默认图片
    header('Location: /images/default-book-cover.svg');
    exit;
} 