<?php
function getDefault($array, $key, $default) {
    return isset($array[$key]) ? $array[$key] : $default;
}

header("Access-Control-Allow-Origin: *");

$api_root = "https://hummingbird.me/";

$user_id = rawurlencode($_GET["user_id"]);

$type = getDefault($_GET, "type", "anime");

$status = rawurlencode(getDefault($_GET, "status", "Completed"));

$api_path = "library_entries";
if($type == "manga") {
	$api_path = "manga_library_entries";
}

if($status == "all") {
	$data = file_get_contents("$api_root$api_path?user_id=$user_id");
} else {
	$data = file_get_contents("$api_root$apit_path?user_id=$user_id&status=$status");
}
?>
<pre>
<?php echo $data ?>
</pre>