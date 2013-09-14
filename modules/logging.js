var util = require('util');
var fs = require('fs');

var logging = false;

module.exports = {
	initWorker: function(config) {
		if(config.logging)
			logging = true;
	},
	initMaster: function(config) {

		var logStream = process.stdout;
		var watcher;
		if(config.logging && config.logging.logFile) {
			function openLogFile() {
				logStream = fs.createWriteStream(config.logging.logFile, {'flags': 'a'});
				logStream.on('open', function() {
					watcher = fs.watch(config.logging.logFile, function(action, filename) {
						if(action == 'rename') {
							watcher.close();
							openLogFile();
						}
					});
				});
			}
			openLogFile();
		}

		process.on('msg:log', function(data) {
			var str = JSON.stringify(data) + "\n";
			logStream.write(str);
		});
	},
	priority: 10, // make sure it is run first
	middleware: function(configEntry) {
		if(logging) // middle overhead only when logging is enabled
			return function(req, res, next) {
				var startTime = (new Date().getTime());
				var origEnd = res.end;
				res.end = function() {
				  var logObject = {timestamp: startTime, method: req.method, httpVersion: req.httpVersion, headers: req.headers, url: req.url, statusCode: res.statusCode, responseTime: (new Date().getTime()) - startTime};
				  process.sendMessage('log', logObject);
					origEnd.apply(res);
				};

				next();
			};
	}
};