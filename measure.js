var FaciaTool = require('aws-s3-facia-tool');
var _ = require('lodash');
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({
	region: 'eu-west-1'
});
var Promise = require('native-promise-only');

var tool = new FaciaTool({
    'bucket': 'aws-frontend-store',
    'env': 'PROD',
    'configKey': 'frontsapi/config/config.json',
    'collectionsPrefix': 'frontsapi/collection',
    'maxParallelRequests': 6
});

console.log('Getting the configuration from ' + tool.options.env);
tool.fetchConfig()
.then(filterUsedCollections)
.then(fetchCollectionContent)
.then(countItems)
.then(storeResult)
.then(summary)
.catch(console.error);

function filterUsedCollections (config) {
	return {
		collections: _(config.json.fronts)
			.pluck('collections')
			.flatten()
			.uniq()
			// .take(30)
			.value(),
		config: config
	};
}

function fetchCollectionContent (model) {
	console.log('Fetching ' + model.collections.length + ' collections');
	return tool.findCollections(model.collections).then(function (collections) {
		model.collections = collections;
		return model;
	});
}

function countItems (model) {
	var count = {
		fronts: [],
		collections: [],
		contentCode: {
			live: 0,
			draft: 0,
			treats: 0,
			supporting: 0
		},
		pageCode: {
			live: 0,
			draft: 0,
			treats: 0,
			supporting: 0
		},
		articles: 0,
		others: 0,
		contentCodeTotal: 0,
		pageCodeTotal: 0
	};

	model.collections.forEach(function (collection) {
		var hasContentCode = false;
		['live', 'draft', 'treats'].forEach(function (target) {
			(collection.raw[target] || []).forEach(function (item) {
				var isArticle = false;
				if (item.id.indexOf('internal-code/content/') === 0) {
					count.contentCode[target] += 1;
					isArticle = true;
					hasContentCode = true;
				} else if (item.id.indexOf('internal-code/page/') === 0) {
					count.pageCode[target] += 1;
					isArticle = true;
				}

				if (isArticle) {
					count.articles += 1;
				} else {
					count.others += 1;
				}

				if (isArticle && item.meta && item.meta.supporting) {
					item.meta.supporting.forEach(function (supporting) {
						if (supporting.id.indexOf('internal-code/content/') === 0) {
							count.contentCode.supporting += 1;
							count.articles += 1;
							hasContentCode = true;
						} else if (supporting.id.indexOf('internal-code/page/') === 0) {
							count.pageCode.supporting += 1;
							count.articles += 1;
						} else {
							count.others += 1;
						}
					});
				}
			});
		});

		if (hasContentCode) {
			count.collections.push(collection.id);
			count.fronts = count.fronts.concat(collection.fronts().map(function (front) {
				return front.id;
			}));
		}
	});

	count.collections = _.uniq(count.collections);
	count.fronts = _.uniq(count.fronts);
	count.contentCodeTotal = count.contentCode.live +
		count.contentCode.draft +
		count.contentCode.treats +
		count.contentCode.supporting;
	count.pageCodeTotal = count.pageCode.live +
		count.pageCode.draft +
		count.pageCode.treats +
		count.contentCode.supporting;

	model.count = count;
	return model;
}

function storeResult (model) {
	console.log('Storing results on DynamoDB');

	var formatted = (function (now) {
		function pad (number) {
			return number < 10 ? '0' + number : number;
		}

		return [
			now.getFullYear(),
			pad(now.getMonth() + 1),
			pad(now.getDate())
		].join('-');
	})(new Date());

	var item = {
		date: {
			S: formatted
		},
		json: {
			S: JSON.stringify(model.count)
		}
	};

	return new Promise(function (resolve, reject) {
		dynamodb.putItem({
			TableName: 'count-internal-content-code',
			Item: item
		}, function (err) {
			if (err) {
				reject(err);
			} else {
				console.log('Results saved correctly');
				resolve(model);
			}
		});
	});
}

function summary (model) {
	var count = model.count;

	console.log([
		'',
		'There are ' + count.contentCodeTotal + ' articles still using internal content code',
		'',
		'internal-content-code',
		'\tlive: ' + count.contentCode.live,
		'\tdraft: ' + count.contentCode.draft,
		'\ttreats: ' + count.contentCode.treats,
		'\tsupporting: ' + count.contentCode.supporting,
		'',
		'internal-page-code',
		'\tlive: ' + count.pageCode.live,
		'\tdraft: ' + count.pageCode.draft,
		'\ttreats: ' + count.pageCode.treats,
		'\tsupporting: ' + count.pageCode.supporting,
		'',
		'Total trails ' + (count.articles + count.others)
			+ ' of which '
			+ count.articles + ' articles '
			+ count.others + ' others'
			,
		'',
		'Internal content code is used in '
			+ count.collections.length + ' collections '
			+ count.fronts.length + ' fronts'
	].join('\n'));
}
