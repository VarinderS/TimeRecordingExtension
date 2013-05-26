// var BROWSER_ACTION = chrome.browserAction;
// place for initiating database
var ls = localStorage;
var USER_ID = "82807";
var API_KEY = "14C10292983D48CE86E1AA1FE0F8DDFE";
var ACCOUNT_KEY = "CFCB26B8664D4B28BDBB8F1C3CBF1594";
var Intervals = {};
var Timer = {};
var Tasks = {};



Timer.start = function($taskItem) {
	$taskItem.addClass("active");
	$taskItem.find(".time-btn").removeClass("icon-play").addClass("icon-pause");

	var taskId = $taskItem.attr("data-taskid");
	var intervalsTaskId = $taskItem.attr("id");
	var store = db.getObjStore(db.objStore, "readwrite");


	req = store.get(taskId);

	req.onerror = db.handleError;

	req.onsuccess = function(e) {
		var row = req.result;

		row.Running 	= "true";
		row.Syncd 		= "false";
		row.StartDate 	= new Date();

		req = store.put(row);

		req.onerror = db.handleError;
		
		req.onsuccess = function(e) {
			console.log("actual minutes ", row.ActualMinutes*60);
			var start = row.StartDate;
			var tasktime = row.ActualMinutes*60; //secs
			var estimatedMinutes = row.EstimatedMinutes;
			

			Intervals[intervalsTaskId] = window.setInterval(function() {
				var dif = Number(tasktime) + Math.floor((new Date().getTime() - start.getTime()) / 1000);
				$taskItem.find(".time").text(Timer.hms(dif));

				Timer.updateProgress($taskItem, Timer.mins(dif), estimatedMinutes); // could've been better

			}, 500);
		}


	}

}

Timer.stop = function($taskItem) {

	$taskItem.removeClass("active");
	$taskItem.find(".time-btn").removeClass("icon-pause").addClass("icon-play");

	var taskId = $taskItem.attr("data-taskid");
	var intervalsTaskId = $taskItem.attr("id");
	var store = db.getObjStore(db.objStore, "readwrite");

	window.clearInterval(Intervals[intervalsTaskId]);

	req = store.get(taskId);

	req.onerror = db.handleError;

	req.onsuccess = function(e) {
		var row = req.result;

		

		var start = row.StartDate; // should be the one updated by timer.start -otherwise you're stuffed.
		var estimatedMinutes = row.EstimatedMinutes;
		var savedMinutes = row.SavedTime;
		var tasktime = row.ActualMinutes*60; //secs

		var dif = Number(tasktime) + Math.floor((new Date().getTime() - start.getTime()) / 1000);
		var actualMinutes = Timer.mins(dif);

		$taskItem.find(".time").text(Timer.hms(dif));
		Timer.updateProgress($taskItem, actualMinutes, estimatedMinutes); // could've been better


		row.Running = "false";
		if (actualMinutes > row.ActualMinutes) {
			$taskItem.removeClass("syncd");
		}
		row.ActualMinutes = actualMinutes;

		req = store.put(row);

		req.onerror = db.handleError;
		

	}

}


Timer.hms = function(secs) {
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

Timer.mins = function(secs) {
	return Math.round(secs/60);
}

Timer.getProgress = function(timeSpent, timeAllowed) {
	return timeSpent * 100 / timeAllowed;
}

Timer.getProgressState = function(timeSpent, timeAllowed) {
	var percent = Timer.getProgress(timeSpent, timeAllowed);

	if (percent < 25) {
		return "perfect";
	} else if (percent > 24 && percent < 50) {
		return "good";
	} else if (percent > 49 && percent < 75) {
		return "okay";
	} else {
		return "stuffedup";
	}
}

Timer.updateProgress = function($elem, timeSpent, timeAllowed) {

	if (timeAllowed && timeAllowed > 0) {

		var $progress = $elem.find(".progress-bar");
		var progressState = Timer.getProgressState(timeSpent, timeAllowed);
		var width = "width:" + Timer.getProgress(timeSpent, timeAllowed) + "%";

		$progress.removeClass(progressState).addClass(progressState);

		$progress.find(".progress").attr("style", width);
	}
}




Tasks.submit = function($taskItem) {

	var taskId = $taskItem.attr("data-taskid");
	var store = db.getObjStore(db.objStore, "readwrite");


	req = store.get(taskId);

	req.onerror = db.handleError;

	req.onsuccess = function(e) {
		var row = req.result;
		//console.log(row);
		var date = row.StartDate;

		var dd = date.getDate();
		var mm = date.getMonth()+1; //January is 0!

		var yyyy = date.getFullYear();
		if (dd<10) { dd = '0' + dd } 
		if (mm<10) { mm = '0' + mm } 

		date = yyyy + mm + dd;

		console.log(row.ActualMinutes, row.SavedTime);
		var timeSheetData = [

			"<Timesheet>",
				"<Job>"		+ row.JobId 			+ "</Job>",
				"<Task>"	+ row.TaskId 			+ "</Task>",
				"<Staff>"	+ USER_ID  				+ "</Staff>",
				"<Date>"	+ date 					+ "</Date>",
				"<Minutes>"	+ (Number(row.ActualMinutes) - Number(row.SavedTime)) 	+ "</Minutes>",
				"<Note>This Entry was added via chrome extension.</Note>",
			"</Timesheet>"

		].join("");

		console.log(timeSheetData);

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
					var store = db.getObjStore(db.objStore, "readwrite");

					console.log(xml);
					console.log(taskId);
					req = store.get(taskId);

					req.onerror = db.handleError;

					req.onsuccess = function(e) {
						var row = req.result;
						console.log(row);
						row.Syncd = "true";
						row.SavedTime = Number(row.SavedTime) + Number(minutes);

						req = store.put(row);
						req.onerror = db.handleError;
						req.onsuccess = function() {
							$("#task-" + taskId).addClass("syncd");
						}
					}
				} else {
					console.log("something went wrong");
				}
			}
		});


	}




	
}