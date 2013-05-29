// good stuff
//(function() {

var app = {},
	USER_ID = "82807",
	API_KEY = "14C10292983D48CE86E1AA1FE0F8DDFE",
	ACCOUNT_KEY = "CFCB26B8664D4B28BDBB8F1C3CBF1594",
	intervals = {}, // stores setIntervals for timers
	timer = {}, // methods for timers - start, stop, convert to hms, mins and secs
	tasks = {}; // methods for getting data and syncing.





var indexes = ["taskId", "taskName", "taskDesc", "jobId", "savedMinutes", "savedSeconds", "actualMinutes", "estimatedMinutes", "taskStartDate", "isTaskRunning", "isTaskSyncd"];

var dbIndexes = [];
	indexes.forEach(function(index) {
		dbIndexes.push({ name: index });
	});


var dbConfig = {
	dbVersion: 1,
	storePrefix: "workflowmax-",
	storeName: "tasks",
	keyPath: "taskId",
	autoIncrement: false,
	indexes: dbIndexes,
	onUpgradeNeeded: createTable
};

var db = new IDBStore(dbConfig, getAllDbItems);

function handleDbError(e) {
	console.log("something is stuffed up with the db: ", e);
}

function createTable() {
	var request = $.ajax({
		url: "http://api.workflowmax.com/job.api/staff/82807?apiKey="+ API_KEY +"&accountKey="+ ACCOUNT_KEY
	});

	request.done(function(data) {
		var tasks = $(data).find("Task");

		tasks.each(function() {
			var $this = $(this);
			if ($this.find("Assigned").length > 0) {

				var taskId = $this.children("ID").text();
				var item = {
					taskId 				: $this.children("ID").text(),
					taskName 			: $this.children("Name").text(),
					taskDesc 			: $this.find("Description").text(),
					jobId 				: $this.closest("Job").children("ID").text(),
					savedMinutes 		: $this.children("ActualMinutes").text(),
					actualMinutes 		: $this.children("ActualMinutes").text(),
					estimatedMinutes 	: $this.children("EstimatedMinutes").text(),
					savedSeconds		: timer.minsToSecs($this.children("ActualMinutes").text()),
					taskStartDate 		: "not defined",
					isTaskRunning 		: "no",
					isTaskSyncd 		: "yes"	
				};

				//console.log(item);

				db.put(taskId, item, renderDbRow, handleDbError);

			}
		});
	});
}

function getAllDbItems() {
	db.getAll(renderTable, handleDbError);
}
function renderTable(dataObjs) {
	dataObjs.forEach(function(dataObj) {
		var taskId = dataObj.taskId;
		renderDbRow(taskId, dataObj);
	});
}

function renderDbRow(taskId, dataObj) {

	// ["taskId", "taskName", "taskDesc", "jobId", "savedMinutes", "actualMinutes", "estimatedMinutes", "taskStartDate", "isTaskRunning", "isTaskSyncd"];
	var $markup = $("<li></li>");

	$markup.attr("id", "task-" + taskId);
	$markup.attr("data-taskid", taskId);


	$markup.append("<h3>" + dataObj.taskName + "</h3>");
	$markup.append("<p>" + dataObj.taskDesc + "</p>");

	if (dataObj.estimatedMinutes != "0") {

		var savedSeconds 		= dataObj.savedSeconds,
			estimatedSeconds 	= timer.minsToSecs(dataObj.estimatedMinutes),
			progress 			= timer.getProgress(savedSeconds, estimatedSeconds),
			progressState 		= timer.getProgressState(progress);

		var progressBar = [
				"<p class='progress-bar "+ progressState +"'>",
					"<span class='progress' style='width:"+ progress +"%'></span>",
				"</p>"
			].join("");

		$markup.append(progressBar);
	}


	var timerRow = [
			"<p class='timer-row'>",
				"<span class='time'>"+ timer.hms(dataObj.savedSeconds) +"</span>",
				//"<span class='time'>0h 0m 0s</span>",
				"<span class='task-actions'>",
					"<a href='#' class='time-btn icon-play'></a>",
					"<a href='#' class='submit-time icon-checkmark-circle'></a>",
				"</span>",
			"</p>"
		].join("");

	$markup.append(timerRow);

	if (dataObj.isTaskSyncd == "yes") {
		$markup.addClass("syncd");
	}

	if (dataObj.isTaskRunning == "yes") {
		$markup.removeClass("syncd").addClass("active");
		timer.start($markup);
	}

	$("#tasks").append($markup);
}





tasks.refreshAll = function() {
	db.clear(createTable, handleDbError);
}

tasks.submitAllTimeSheets = function(taskIds) {
	var myKeyRange = db.makeKeyRange({
		lower: 'no',
		excludeLower: false,
		upper: 'no',
		excludeUpper: false
	});	

	db.iterate(onItem, {
		index: "isTaskSyncd",
		keyRange: myKeyRange,
		filterDuplicates: false,
		onEnd: onEndCallback
	});

	function onItem(dataObj) {
		createTimeSheet(dataObj);
	}

	function onEndCallback() {
		console.log("on end called");
	}
	//taskIds.forEach(tasks.submitTimeSheet(taskId));
}

tasks.submitTimeSheet = function(taskId) {
	db.get(taskId, createTimeSheet, handleDbError);
}

function createTimeSheet(dataObj) {
	var jobId		= dataObj.jobId,
		taskId 		= dataObj.taskId,
		userId 		= USER_ID,
		date 		= timer.formatDate(dataObj.taskStartDate),
		minutes 	= Math.round(Number(dataObj.savedMinutes) - Number(dataObj.actualMinutes));

		console.log("syncing minutes:", minutes);

	var timeSheetData = [

		"<Timesheet>",
			"<Job>"		+ jobId 	+ "</Job>",
			"<Task>"	+ taskId	+ "</Task>",
			"<Staff>"	+ userId	+ "</Staff>",
			"<Date>"	+ date		+ "</Date>",
			"<Minutes>"	+ minutes 	+ "</Minutes>",
			"<Note>This Entry was added via chrome extension.</Note>",
		"</Timesheet>"

	].join("");

	sendTimeSheet(timeSheetData);
}

function sendTimeSheet(timeSheetData) {
	$.ajax({ 
		type: "POST",
		url: "https://api.workflowmax.com/time.api/add?apiKey="+ API_KEY +"&accountKey="+ ACCOUNT_KEY,
		data: timeSheetData,
		dataType: "xml",
		cache: false,
		error: function() { console.log("something went wrong"); },
		success: function(xml) {
			var $xml = $(xml),
				minutes = $xml.find("Minutes").text(),
				taskId = $xml.find("Task").children("ID").text();

			if ($xml.find("Status").text() != "ERROR") {
				db.get(taskId, updateTask, handleDbError);

				function updateTask(dataObj) {
					dataObj.isTaskRunning = "no";
					dataObj.isTaskSyncd = "yes";
					dataObj.actualMinutes = Number(dataObj.actualMinutes) + Number(minutes);

					console.log("stuff ", dataObj.actualMinutes, minutes, Number(dataObj.actualMinutes) + Number(minutes));
					db.put(taskId, dataObj, updateDbSuccess, handleDbError);
				}

				function updateDbSuccess(id, dataObj) {
					$("#task-" + id).addClass("syncd");
				}

			} else {
				console.log("something went wrong");
			}
		}
	});
}






timer.formatDate = function(date) {
	var dd = date.getDate(),
		mm = date.getMonth(),
		yyyy = date.getFullYear();

	if (dd < 10) { dd = "0" + dd }
	if (mm < 10) { mm = "0" + mm }

	return yyyy + mm + dd;
}

timer.minsToSecs = function(mins) { return mins*60; }

timer.secsToMins = function(secs) { return Math.round(secs/60); }

timer.updateProgress = function($elem, secondsSpent, secondsEstimated) {
	var width =  timer.getProgress(secondsSpent, secondsEstimated) + "%";
	$elem.css("width", width);
}

timer.getProgress = function(secondsSpent, secondsEstimated) {
	var percentage = (secondsSpent / secondsEstimated) * 100;
	return Math.round( (percentage*100) / 100 );
}

timer.getProgressState = function(progress) {
	if (progress < 25) {
		return "perfect";
	} else if (progress > 24 && progress < 50) {
		return "good";
	} else if (progress > 49 && progress < 75) {
		return "okay";
	} else {
		return "stuffedup";
	}
}

timer.hms = function(secs) {
	//secs = secs % 86400; // fix 24:00:00 overlay
	var time = [0, 0, secs], i;
	for (i = 2; i > 0; i--) {
		time[i - 1] = Math.floor(time[i] / 60);
		time[i] = time[i] % 60;
		if (time[i] < 10) {
		time[i] = '0' + time[i];
		}
	}
	return time.join(':');
}

timer.start = function($taskItem) {
	$taskItem.addClass("active").removeClass("syncd");
	$taskItem.find(".time-btn").removeClass("icon-play").addClass("icon-pause");

	var taskId 			= $taskItem.attr("data-taskid"),
		intervalsId 	= "task-" + taskId,
		$timerContainer = $taskItem.find(".time");

	db.get(taskId, updateTask, handleDbError);

	function updateTask(dataObj) {
		var taskStartDate = new Date();

		dataObj.isTaskSyncd = "no";

		if (dataObj.isTaskRunning == "yes") {
			taskStartDate = dataObj.taskStartDate;
		} else {
			dataObj.isTaskRunning = "yes";
			dataObj.taskStartDate = taskStartDate;
		}

		db.put(taskId, dataObj, startTimer, handleDbError);
	}

	function startTimer(id, dataObj) {

		var $taskItem 			= $("#task-" + id),
			$timerContainer		= $taskItem.find(".time"),
			$progressBar 		= $taskItem.find(".progress-bar"),
			$progress 			= $taskItem.find(".progress"),
			intervalsId 		= "task-" + id,
			startDate 			= dataObj.taskStartDate,
			savedSeconds 		= dataObj.savedSeconds, //secs
			estimatedSeconds 	= timer.minsToSecs(dataObj.estimatedMinutes);

		intervals[intervalsId] = window.setInterval(function() {
			var dif = Number(savedSeconds) + Math.floor((new Date().getTime() - startDate.getTime()) / 1000),
				progressPercent = timer.getProgress(dif, estimatedSeconds),
				progressState = timer.getProgressState(progressPercent),
				progressWidth = Math.round(progressPercent) + "%";

			$timerContainer.text(timer.hms(dif));

			$progress.css("width", progressWidth);
			$progressBar.addClass(progressState);

		}, 500);
	}
}

timer.stop = function($taskItem) {
	$taskItem.removeClass("active");
	$taskItem.find(".time-btn").removeClass("icon-pause").addClass("icon-play");

	var taskId = $taskItem.attr("data-taskid");
	
	db.get(taskId, updateTask, handleDbError);

	function updateTask(dataObj) {
		var dif = Number(dataObj.savedSeconds) + Math.floor((new Date().getTime() - dataObj.taskStartDate.getTime()) / 1000);

		dataObj.savedSeconds = dif;
		dataObj.savedMinutes = timer.secsToMins(dif);
		dataObj.isTaskRunning = "no";

		db.put(taskId, dataObj, stopTimer, handleDbError);

		//window.clearInterval(Intervals[intervalsTaskId]);
	}

	function stopTimer(id, dataObj) {
		var intervalsId = "task-" + id;
		window.clearInterval(intervals[intervalsId]);
	}
}






app.bind = function() {
	console.log("called");

	$("body").on("click", "a", function(e) { e.preventDefault(); });

	$("body").on("click", ".time-btn", function() {
		var $this = $(this),
			$taskItem = $this.closest("li");


		if ($taskItem.hasClass("active")) {
			timer.stop($taskItem);
		} else {
			timer.start($taskItem);
		}
	});

	$("body").on("click", ".submit-time", function() {
		var $taskItem = $(this).closest("li"),
			taskId = $taskItem.attr("data-taskid");
		if (!$taskItem.hasClass("syncd") && !$taskItem.hasClass("active")) {
			//Tasks.submit($taskItem);
			tasks.submitTimeSheet(taskId);
		}
	});

	$("body").on("click", ".save-all", function() {
		tasks.submitAllTimeSheets();
	});

	$("body").on("click", ".refresh", function() {
		$("#tasks").children().remove();
		tasks.refreshAll();
	});
}

app.start = function() {
	app.bind();
}
$(window).on("load", app.start());

//})();
