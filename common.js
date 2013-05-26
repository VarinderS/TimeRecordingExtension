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

	var start = new Date(),
		tasktime = 0,
		taskId = $taskItem.attr("id"),
		estimatedMinutes = $taskItem.attr("data-estimatedMinutes");

	$taskItem.addClass("active");
	$taskItem.find(".time-btn").removeClass("icon-play").addClass("icon-pause");

	$taskItem.attr("data-start", start);

	if ($taskItem.attr("data-tasktime")) {
		tasktime = $taskItem.attr("data-tasktime");
	} else {
		$taskItem.attr("data-tasktime", tasktime);
	}



	Intervals[taskId] = window.setInterval(function() {
		var dif = Number(tasktime) + Math.floor((new Date().getTime() - start.getTime()) / 1000);
		var mins = Timer.mins(dif);
		$taskItem.attr("data-tasktime", dif);
		$taskItem.attr("data-actualminutes", mins);
		$taskItem.find(".time").text(Timer.hms(dif));

		Timer.updateProgress($taskItem, mins, estimatedMinutes);

		ls.setItem(taskId, dif);
	}, 500);
}

Timer.stop = function($taskItem) {
	var taskId = $taskItem.attr("id");
	window.clearInterval(Intervals[taskId]);

	$taskItem.removeClass("active");
	$taskItem.find(".time-btn").addClass("icon-play").removeClass("icon-pause");

	var actualtime = Timer.mins($taskItem.attr("data-tasktime"));
	$taskItem.attr("data-actualtime", actualtime);

	ls.setItem(taskId, $taskItem.attr("data-tasktime"));
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
	return Math.ceil(secs/60);
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

Tasks.get = function() {
	$.ajax({
		url: "http://api.workflowmax.com/job.api/staff/82807?apiKey="+ API_KEY +"&accountKey="+ ACCOUNT_KEY
	}).done(function(data) {
		var $xml = $(data),
			$tasks = $("#tasks");
			

		/*
			<Jobs>
				<Job>
					<ID>J000003</ID>
					<Name>Job for Client 1</Name>
					<Description></Description>
					<Client>
						<ID>2128616</ID>
						<Name>Client 1</Name>
					</Client>
					<ClientOrderNumber></ClientOrderNumber>
					<State>Planned</State>
					<StartDate>2013-05-23T00:00:00</StartDate>
					<DueDate>2013-05-31T00:00:00</DueDate>
					<Contact>
						<ID>1341398</ID>
						<Name>Client 1 Contact Name</Name>
					</Contact>
					<InternalID>2254794</InternalID>
					<Assigned>
						<Staff>
							<ID>82807</ID>
							<Name>Varinder</Name>
						</Staff>
						<Staff>
							<ID>82811</ID>
							<Name>Staff member 1</Name>
						</Staff>
					</Assigned>	
					<Tasks>
						<Task>
							<ID>8159098</ID>
							<Name>Database development - Task Label 1</Name>
							<TaskID>462048</TaskID>
							<EstimatedMinutes>480</EstimatedMinutes>
							<ActualMinutes>0</ActualMinutes>
							<Description>Very useful info for Task: Database development</Description>
							<Completed>false</Completed>
							<Billable>true</Billable>
							<Folder></Folder>
							<Assigned>
								<Staff>
									<ID>82807</ID>
									<Name>Varinder</Name>
								</Staff>
							</Assigned>
						</Task>
					</Tasks>
				</Job>
			</Jobs>
		*/

		$xml.find("Task").each(function() {
			var $this = $(this),
				$markup = $("<li></li>");

			if ($this.find("Assigned").length > 0) {
				var taskName 			= $this.children("Name").text(),
					id 					= $this.children("ID").text(),
					taskId 				= "task-" + id,
					jobId 				= $this.closest("Job").children("ID").text(),
					estimatedMinutes 	= $this.children("EstimatedMinutes").text(),
					actualMinutes 		= $this.children("ActualMinutes").text(),
					time 				= 0,
					taskDescription 	= $this.find("Description").text();


				if (ls.getItem(taskId)) {
					var taskSecs = ls.getItem(taskId),
						taskMinutes = taskSecs/60;

					if (actualMinutes != "0" && actualMinutes > taskMinutes) {
						taskSecs = actualMinutes*60;
						taskMinutes = actualMinutes;
						ls.setItem(taskId, taskSecs);

						$markup.attr("data-actualminutes", actualMinutes);
						$markup.attr("data-tasktime", taskSecs);
					} else {
						$markup.attr("data-actualminutes", taskMinutes);
						$markup.attr("data-tasktime", taskSecs);
					}

					time = taskSecs;

				} else {
					$markup.attr("data-actualminutes", actualMinutes);
					ls.setItem(taskId, actualMinutes*60);

					time = actualMinutes;
				}

				$markup.attr("id", taskId);
				$markup.attr("data-taskId", id);
				$markup.attr("data-jobId", jobId);
				$markup.attr("data-savedTime", actualMinutes);

				/*	
					<h3>Database development - Task Label 1</h3>
					<p>Very useful info for Task: Database development</p>
					<p class="progress-bar perfect">
						<span class="progress"></span>
					</p>
					<p class="timer-row">
						<span class="time">8:03:08</span>
						<span class="task-actions">
							<a href="#" class="time-btn icon-play"></a>
							<a href="#" class="submit-time icon-checkmark-circle"></a>
						</span>
					</p>
				*/
				
				$markup.append("<h3>" + taskName + "</h3>");
				$markup.append("<p>" + taskDescription + "</p>");

				if (estimatedMinutes !="0") {
					$markup.attr("data-estimatedMinutes", estimatedMinutes);
					var progressBar = [
							"<p class='progress-bar "+ Timer.getProgressState(actualMinutes, estimatedMinutes) +"'>",
								"<span class='progress' style='width:"+ Timer.getProgress(actualMinutes, estimatedMinutes) +"%'></span>",
							"</p>"
						].join("");
					$markup.append(progressBar);
				}


				var timerRow = [
						"<p class='timer-row'>",
							"<span class='time'>"+ Timer.hms(time) +"</span>",
							"<span class='task-actions'>",
								"<a href='#' class='time-btn icon-play'></a>",
								"<a href='#' class='submit-time icon-checkmark-circle'></a>",
							"</span>",
						"</p>"
					].join("");

				$markup.append(timerRow);

				$tasks.append($markup);
			}
		});
	});
}


Tasks.submit = function($task) {
	var jobId 	= $task.attr("data-jobid"),
		taskId 	= $task.attr("data-taskid"),
		date 	= new Date(),
		staffId = USER_ID,
		minutes = $task.attr("data-actualminutes") - $task.attr("data-savedTime"),
		note 	= $task.find("textarea").val();

	var dd = date.getDate();
	var mm = date.getMonth()+1; //January is 0!

	var yyyy = date.getFullYear();
	if (dd<10) { dd = '0' + dd } 
	if (mm<10) { mm = '0' + mm } 

	date = yyyy + mm + dd;

	var timeSheetData = [

		"<Timesheet>",
			"<Job>"		+ jobId 	+ "</Job>",
			"<Task>"	+ taskId 	+ "</Task>",
			"<Staff>"	+ staffId  	+ "</Staff>",
			"<Date>"	+ date 		+ "</Date>",
			"<Minutes>"	+ minutes 	+ "</Minutes>",
			"<Note>"	+ note 		+ "</Note>",
		"</Timesheet>"

	].join("");

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
				taskId = $xml.find("Task").children("ID").text(),
				$task = $("#task-" + taskId),
				savedTime = Number($task.attr("data-savedtime")) + Number(minutes);

			$task.attr("data-savedtime", savedTime);
			console.log("it works");
			console.log(xml);
		}
	});	
}