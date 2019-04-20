<?php
// $start = microtime(true);

// Set correct headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header("Access-Control-Allow-Headers: X-Requested-With");

function exit_usage()
{
    exit("ERROR: Pass either ?appid=<appid> OR ?page=<page>");
}

function has_prefix($string, $prefix)
{
    return substr($string, 0, strlen($prefix)) == $prefix;
}

function get_url_clean($url)
{
    $parts = parse_url($url);

    // Invalid
    if ($parts === false)
        return $url;

    return $parts["scheme"] . "://" . $parts["host"] . $parts["path"];
}

// Parse arguments
if (empty($_GET))
    exit_usage();

$appid = isset($_GET["appid"]) ? (int)$_GET["appid"] : null;
$page = isset($_GET["page"]) ? $_GET["page"] : null;
if ($appid === null && $page === null)
    exit_usage();

// Construct page from appid
if ($appid !== null)
{
    if ($appid <= 0)
        exit(sprintf("ERROR: appid = %d is not valid", $appid));

    $page = sprintf("https://steamdb.info/app/%d/graphs/", $appid);
}

// Remove any get arguments
$page = get_url_clean($page);

// Does not match our prefix :()
if (!has_prefix($page, "https://steamdb.info/app/"))
    exit(sprintf("ERROR: page = %s is not valid", $page));


//
// Curl
//
$ch = curl_init();
if ($ch === false)
    exit("Can't init curl");

curl_setopt($ch, CURLOPT_COOKIE, "path=/; domain=steamdb.info");
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
// curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
// curl_setopt($ch, CURLOPT_ENCODING,  '');
curl_setopt($ch, CURLOPT_URL, $page);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
curl_close($ch);

// $time_elapsed_secs = microtime(true) - $start;
// echo $time_elapsed_secs;
echo $result;
