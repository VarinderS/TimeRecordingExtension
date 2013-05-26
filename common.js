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
		taskId = $taskItem.attr("id");

	$taskItem.addClass("active");
	$taskItem.find(".time-btn").text("stop");

	$taskItem.attr("data-start", start);

	if ($taskItem.attr("data-tasktime")) {
		tasktime = $taskItem.attr("data-tasktime");
	} else {
		$taskItem.attr("data-tasktime", tasktime);
	}

	Intervals[taskId] = window.setInterval(function() {
		var dif = Number(tasktime) + Math.floor((new Date().getTime() - start.getTime()) / 1000);
		$taskItem.attr("data-tasktime", dif);
		$taskItem.attr("data-actualminutes", Timer.mins(dif));
		$taskItem.find(".time").text(Timer.hms(dif));

		ls.setItem(taskId, dif);

	}, 500);
}

Timer.stop = function($taskItem) {
	var taskId = $taskItem.attr("id");
	window.clearInterval(Intervals[taskId]);

	$taskItem.removeClass("active");
	$taskItem.find(".time-btn").text("start");

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
				var taskName = $this.children("Name").text(),
					id = $this.children("ID").text(),
					taskId = "task-" + id,
					jobId = $this.closest("Job").children("ID").text(),
					actualMinutes = $this.children("ActualMinutes").text(),
					time = 0,
					taskDescription = $this.find("Description").text();


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

				
				$markup.append("<p class='time-row'><span class='time'>" + Timer.hms(time) + "</span><a href='#'' class='time-btn'>start</a></p>");
				$markup.append("<p>" + taskName + "</p>");
				$markup.append("<p>" + taskDescription + "</p>");
				$markup.append("<p><a href='#' class='submit-time'>Submit</a></p>");

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
			console.log("it works");
		}
	});	
}