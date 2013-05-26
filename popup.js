
var db = {};
var tasksDb;
db.name = "Workflowmax-TasksDb";
db.version = 39;
db.objStore = "TasksDb";
db.indexes = ["TaskName", "TaskDesc", "JobId", "TaskId", "SavedTime", "ActualMinutes", "EstimatedMinutes", "StartDate", "Running", "Syncd"];

db.open = function() {
	var req = indexedDB.open(db.name, db.version);

	req.onerror = function(e) {
		console.error("openDb:", e.target.errorCode);
	}

	req.onsuccess = function(e) {
		tasksDb = e.target.result;
		db.display();
	}

	req.onupgradeneeded = function(e) {
		
		var tasksDb = e.target.result;

		if (tasksDb.objectStoreNames.contains(db.objStore)) {
			tasksDb.deleteObjectStore(db.objStore);
		}

		var store = tasksDb.createObjectStore(db.objStore, { keyPath:"TaskId" });

		db.indexes.forEach(function(index) {
			store.createIndex(index, index);			
		});

		// var data = Tasks.getData();

		Tasks.getData();

	}
}

db.getObjStore = function(storeName, mode) {
	var tx = tasksDb.transaction(storeName, mode);
	return tx.objectStore(storeName);
}

db.clearObjStore = function(storeName) {
	var store = db.getObjStore(db.objStore, "readwrite");
	var req = store.clear();

	req.onerror = function(e) {
		console.log("clearObjStore:", e.target.errorCode);
	}
	req.onsuccess = function(e) {
		console.log("all cleared");
	}
}

db.display = function(store) {
	var store = db.getObjStore(db.objStore, "readonly");
	var req;
	req = store.count();

	req.onerror = db.handleError;
	req.onsuccess = function(e) {  }

	var i = 0;
	req = store.openCursor();

	req.onerror = db.handleError;

	req.onsuccess = function(e) {

		var cursor = e.target.result;

		if (cursor) {

			req = store.get(cursor.key);

			req.onsuccess = function(e) {
				value = e.target.result;

				Tasks.renderItem(value);
			}

			cursor.continue();
		} else {

		}
	}
}

db.handleError = function(e) {
	console.log("Error: ", e.target.errorCode);
}






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
		if (!$taskItem.hasClass("syncd") && !$taskItem.hasClass("active")) {
			Tasks.submit($taskItem);
		}
	});

}


Tasks.renderItem = function(item) {
	var $markup = $("<li></li>");

	/*
		TaskName: 		taskName, 
		TaskDesc: 		taskDescription, 
		JobId: 			jobId, 
		TaskId: 		id, 
		SavedTime: 		actualMinutes, 
		ActualMinutes: 	actualMinutes, 
		EstimatedMinutes: 		estimatedMinutes,
		StartDate: 		new Date(),
		Syncd: 			"true",
		Running: 		"false"
	*/

	$markup.attr("id", "task-" + item.TaskId);
	$markup.attr("data-taskid", item.TaskId);


	$markup.append("<h3>" + item.TaskName + "</h3>");
	$markup.append("<p>" + item.TaskDesc + "</p>");

	if (item.EstimatedMinutes !="0") {
		var progressBar = [
				"<p class='progress-bar "+ Timer.getProgressState(item.ActualMinutes, item.EstimatedMinutes) +"'>",
					"<span class='progress' style='width:"+ Timer.getProgress(item.ActualMinutes, item.EstimatedMinutes) +"%'></span>",
				"</p>"
			].join("");
		$markup.append(progressBar);
	}


	var timerRow = [
			"<p class='timer-row'>",
				"<span class='time'>"+ Timer.hms(item.ActualMinutes*60) +"</span>",
				"<span class='task-actions'>",
					"<a href='#' class='time-btn icon-play'></a>",
					"<a href='#' class='submit-time icon-checkmark-circle'></a>",
				"</span>",
			"</p>"
		].join("");

	$markup.append(timerRow);

	if (item.Syncd == "true") {
		$markup.addClass("syncd");
	}

	if (item.Running == "true") {
		$markup.removeClass("syncd").addClass("active");
		Timer.start($markup);
	}

	$("#tasks").append($markup);

}

Tasks.getData = function() {
	$.ajax({
		url: "http://api.workflowmax.com/job.api/staff/82807?apiKey="+ API_KEY +"&accountKey="+ ACCOUNT_KEY
	}).done(function(data) {

		var $xml = $(data);
		console.log(data);
		$xml.find("Task").each(function() {
			var $this = $(this);

			if ($this.find("Assigned").length > 0) {
				var taskName 			= $this.children("Name").text(),
					id 					= $this.children("ID").text(),
					taskId 				= "task-" + id,
					jobId 				= $this.closest("Job").children("ID").text(),
					estimatedMinutes 	= $this.children("EstimatedMinutes").text(),
					actualMinutes 		= $this.children("ActualMinutes").text(),
					time 				= 0,
					taskDescription 	= $this.find("Description").text();

				var dbRow = {
					TaskName: 		  taskName, 
					TaskDesc: 		  taskDescription, 
					JobId: 			  jobId, 
					TaskId: 		  id, 
					SavedTime: 		  actualMinutes, 
					ActualMinutes: 	  actualMinutes, 
					EstimatedMinutes: estimatedMinutes,
					StartDate: 		  new Date(),
					Syncd: 			  "true",
					Running: 		  "false"
				}

				var store = db.getObjStore(db.objStore, "readwrite");
				store.add(dbRow);
				Tasks.renderItem(dbRow);
			}
		});

	});
}






function init(tab) {
	db.open();
	Tasks.bind();
	//Tasks.get();
}


document.addEventListener('DOMContentLoaded', init);
