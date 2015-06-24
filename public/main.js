/* globals Chart, fetch */
// Boolean - Whether to animate the chart
Chart.defaults.global.animation = false;
// Boolean - Whether the scale should start at zero, or an order of magnitude down from the lowest value
Chart.defaults.global.scaleBeginAtZero = true;
// Boolean - whether or not the chart should be responsive and resize when the browser does.
Chart.defaults.global.responsive = true;
// Boolean - whether to maintain the starting aspect ratio or not when responsive, if set to false, will take up entire container
Chart.defaults.global.maintainAspectRatio = false;
// String - Tooltip background colour
Chart.defaults.global.tooltipFillColor = 'rgba(0,0,0,0.6)';
// Number - Pixel radius of the tooltip border
Chart.defaults.global.tooltipCornerRadius = 2;

fetch('/api/json').then(function (resp) {
	return resp.json();
})
.then(function (json) {
	console.log(json)
	var ctx = document.getElementById('trend').getContext('2d');
	var data = generateData(json);
	var lastMeasure = json[json.length - 1].count;
	var options = {
		///Boolean - Whether grid lines are shown across the chart
		scaleShowGridLines: true,
		//String - Colour of the grid lines
		scaleGridLineColor: 'rgba(0,0,0,.05)',
		//Number - Width of the grid lines
		scaleGridLineWidth: 1,
		//Boolean - Whether to show horizontal lines (except X axis)
		scaleShowHorizontalLines: true,
		//Boolean - Whether to show vertical lines (except Y axis)
		scaleShowVerticalLines: true,
		//Boolean - Whether the line is curved between points
		bezierCurve: true,
		//Number - Tension of the bezier curve between points
		bezierCurveTension: 0.3,
		//Boolean - Whether to show a dot for each point
		pointDot: false,
		//Number - Radius of each point dot in pixels
		pointDotRadius: 4,
		//Number - Pixel width of point dot stroke
		pointDotStrokeWidth: 1,
		//Number - amount extra to add to the radius to cater for hit detection outside the drawn point
		pointHitDetectionRadius: 20,
		//Boolean - Whether to show a stroke for datasets
		datasetStroke: true,
		//Number - Pixel width of dataset stroke
		datasetStrokeWidth: 4,
		//Boolean - Whether to fill the dataset with a colour
		datasetFill: false
	};
	new Chart(ctx).Line(data, options);

	document.querySelector('.icc--count_fronts').innerHTML = lastMeasure.fronts.length;
	document.querySelector('.icc--count_collections').innerHTML = lastMeasure.collections.length;
	document.querySelector('.icc--count_live').innerHTML = lastMeasure.contentCode.live;
	document.querySelector('.icc--count_draft').innerHTML = lastMeasure.contentCode.draft;
	document.querySelector('.icc--count_treats').innerHTML = lastMeasure.contentCode.treats;
	document.querySelector('.icc--count_supporting').innerHTML = lastMeasure.contentCode.supporting;
	document.querySelector('.ipc--count_live').innerHTML = lastMeasure.pageCode.live;
	document.querySelector('.ipc--count_draft').innerHTML = lastMeasure.pageCode.draft;
	document.querySelector('.ipc--count_treats').innerHTML = lastMeasure.pageCode.treats;
	document.querySelector('.ipc--count_supporting').innerHTML = lastMeasure.pageCode.supporting;
	document.querySelector('.icc--front-details').innerHTML = lastMeasure.fronts.map(function (front) {
		return '<li>' + front + '</li>';
	}).join('');
});

function generateData (json) {
	var setContentCode = {
			label: 'contentCode',
			strokeColor: '#FF420E',
			pointColor: '#FF420E',
			data: []
		},
		setPageCode = {
			label: 'pageCode',
			strokeColor: '#003B46',
			pointColor: '#003B46',
			data: []
		},
		data = {
			labels: [],
			datasets: [setContentCode, setPageCode]
		};
	json.forEach(function (measure) {
		data.labels.push(measure.date);
		setContentCode.data.push(measure.count.contentCodeTotal);
		setPageCode.data.push(measure.count.pageCodeTotal);
	});
	return data;
}
