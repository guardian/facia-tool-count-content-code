var express = require('express');
var app = express();
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({
	region: 'eu-west-1'
});
var Promise = require('native-promise-only');

Promise.resolve()
.then(scanDynamo)
.then(parseItems)
.then(startServer)
.then(function (server) {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Example app listening at http://%s:%s', host, port);
})
.catch(console.trace);

function scanDynamo () {
	return new Promise(function (resolve, reject) {
		dynamodb.scan({
			TableName: 'count-internal-content-code'
		}, function (err, data) {
			if (err) {
				reject(err);
			} else {
				resolve(data.Items);
			}
		});
	});
}

function parseItems (items) {
	return items.map(function (item) {
		return {
			date: item.date.S,
			count: JSON.parse(item.json.S)
		};
	})
	.sort(function (a, b) {
		return a.date.localeCompare(b.date);
	});
}

function startServer (items) {
	var fromDynamo = items;
	return new Promise(function (resolve) {
		app.get('/api/json', function (req, res) {
			res.send(fromDynamo);
		});
		app.use(express.static('public'));
		app.use('/vendor/chart', express.static('node_modules/chart.js'));
		app.get('/reload', function (req, res) {
			scanDynamo().then(parseItems)
			.then(function (updates) {
				fromDynamo = updates;
			});
			res.redirect('/');
		});

		var server = app.listen(3000, function () {
			resolve(server);
		});
	});
}
