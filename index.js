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
	var fromDynamo = items,
		pageCreated = new Date();

	return new Promise(function (resolve) {
		app.get('/api/json', function (req, res) {
			res.send({
				created: {
					date: formatDate(pageCreated),
					time: formatTime(pageCreated)
				},
				items: fromDynamo
			});
		});
		app.use(express.static('public'));
		app.use('/vendor/chart', express.static('node_modules/chart.js'));
		app.get('/reload', function (req, res) {
			scanDynamo().then(parseItems)
			.then(function (updates) {
				fromDynamo = updates;
				pageCreated = new Date();
			});
			res.redirect('/');
		});

		var server = app.listen(process.env.PORT || 3000, function () {
			resolve(server);
		});
	});
}

function pad (number) {
	return number < 10 ? '0' + number : number;
}

function formatDate (date) {
	return [
		date.getFullYear(),
		pad(date.getMonth() + 1),
		pad(date.getDate())
	].join('-');
}

function formatTime (date) {
	return [
		date.getHours(),
		date.getMinutes()
	].join(':');
}
