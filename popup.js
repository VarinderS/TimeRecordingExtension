

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

var sampleData =[
	{ 
		TaskName:"Database development - Task Label 1", 
		TaskDesc:"Very useful info for Task: Database development", 
		JobId:"J000003", 
		TaskId:"8159098", 
		SavedTime:"483", 
		ActualMinutes:"483.13", 
		TaskTime:"28988" ,
		StartDate:"",
		Running:false
	},
	{ 
		TaskName:"Web development - Task Label 1", 
		TaskDesc:"Very useful info for Task: Web development", 
		JobId:"J000008", 
		TaskId:"8159099", 
		SavedTime:"483", 
		ActualMinutes:"483.13", 
		TaskTime:"28988" ,
		Running:false
	}
];

var db = {};
var tasksDb;
db.name = "Workflowmax-TasksDb";
db.version = 10;
db.objStore = "TasksDb",
db.indexes = ["TaskName", "TaskDesc", "JobId", "TaskId", "SavedTime", "ActualMinutes", "TaskTime"];

db.open = function() {
	var req = indexedDB.open(db.name, db.version);

	req.onerror = function(e) {
		console.error("openDb:", e.target.errorCode);
	}

	req.onsuccess = function(e) {
		tasksDb = e.target.result;
	}

	req.onupgradeneeded = function(e) {
		var tasksDb = e.target.result;

		if (tasksDb.objectStoreNames.contains(db.objStore)) {
			tasksDb.deleteObjectStore(db.objStore);
		}

		var store = tasksDb.createObjectStore(db.objStore, { keyPath:"TaskId" });

		store.createIndex("TaskName", "TaskName", { unique: false });
		store.createIndex("TaskDesc", "TaskDesc", { unique: false });
		store.createIndex("JobId", "JobId", { unique: false });
		store.createIndex("TaskId", "TaskId", { unique: false });
		store.createIndex("SavedTime", "SavedTime", { unique: false });
		store.createIndex("ActualMinutes", "ActualMinutes", { unique: false });
		store.createIndex("TaskTime", "TaskTime", { unique: false });
		store.createIndex("StartDate", "StartDate", { unique: false });
		store.createIndex("Running", "Running", { unique: false });

		// db.indexes.forEach(function(i) {
		// 	
		// });

		for (var i in sampleData) {
			store.add(sampleData[i]);
		}
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
	req.onsuccess = function(e) { console.log("there are ", e.target.result, " tasks."); }

	var i = 0;
	req = store.openCursor();

	req.onerror = db.handleError;
	req.onsuccess = function(e) {
		var cursor = e.target.result;
		if (cursor) {
			console.log("cursor at:", cursor);
			req = store.get(cursor.key);
			req.onsuccess = function(e) {
				value = e.target.result;

				console.log("value is:", value);
			}

			cursor.continue();
		} else {
			console.log("end reached");
		}
	}
}

db.handleError = function(e) {
	console.log("Error: ", e.target.errorCode);
}


function init(tab) {
	Tasks.bind();
	Tasks.get();
}


document.addEventListener('DOMContentLoaded', init);
