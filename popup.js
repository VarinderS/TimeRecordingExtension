

Tasks.bind = function() {

	$("a").on("click", function(e) { e.preventDefault(); });

	$("body").on("click", ".time-btn", function() {
		var taskObj = {},
			$this = $(this),
			$taskItem = $this.closest("li");


		if ($taskItem.hasClass("active")) {
			Timer.stop($taskItem);
		} else {
			Timer.start($taskItem);
		}
	});

	$("body").on("click", ".submit-time", function() {
		var $taskItem = $(this).closest("li");
		Tasks.submit($taskItem);
	});

}


function init(tab) {
	Tasks.bind();
	//Tasks.get();
}


document.addEventListener('DOMContentLoaded', init);
