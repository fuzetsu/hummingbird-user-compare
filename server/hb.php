<?php
header("Access-Control-Allow-Origin: *");
$user_id = rawurlencode($_GET["user_id"]);
$status = "Completed";
if(isset($_GET["status"])) {
	$status = rawurlencode($_GET["status"]);
}
if($status == "all") {
	$data = file_get_contents("https://hummingbird.me/library_entries?user_id=$user_id");
} else {
	$data = file_get_contents("https://hummingbird.me/library_entries?user_id=$user_id&status=$status");
}
?>
<pre>
<?php echo $data ?>
</pre>