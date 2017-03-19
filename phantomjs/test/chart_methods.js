window.devicePixelRatio = 4
var chartReady = false

var updateChart = function(currentChart){
	chartMax = currentChart.scales[currentChart.chart.config.options.scales.yAxes[0].id].max
	if (chartMax % 10 != 0){
		updatedChartMax = Math.ceil(chartMax/10) * 10
	}
	else{
		updatedChartMax = chartMax + 10
	}
	currentChart.chart.config.options.scales.yAxes[0].ticks.max = updatedChartMax
	currentChart.chart.config.options.scales.yAxes[0].ticks.stepSize = updatedChartMax/5
	currentChart.update()
}
var drawBarValues = function(el) {
	var ctx, minScoreArray, updatedValue;
	ctx = el.chart.ctx;
	ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, 'normal', Chart.defaults.global.defaultFontFamily);
	ctx.fillStyle = el.chart.config.options.defaultFontColor;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'bottom';
	minScoreArray = [];
	updatedValue = 0;
	el.data.datasets.forEach(function(dataset) {
	var i, model, originalValue;
	i = 0;
	if (dataset.label === "Minimum Score") {
		minScoreArray = dataset.data;
	}
	while (i < dataset.data.length) {
		if (dataset.hidden === true && dataset._meta[Object.keys(dataset._meta)[0]].hidden !== false) {
		i++;
		continue;
		}
		model = dataset._meta[Object.keys(dataset._meta)[0]].data[i]._model;
		if (dataset.data[i] !== null) {
		originalValue = dataset.data[i];
		if (dataset.label === "College Range") {
			dataset.data[i] += minScoreArray[i];
		}
		if ((ctx.canvas.id === "DifficultyWiseCompetenceCanvas" || ctx.canvas.percentageValues) || (ctx.canvas.id === "SubjectWiseCompetenceCanvas" && dataset.type === "line")) {
			ctx.fillText(dataset.data[i] + '%', model.x - 1, model.y - 5);
		} else if (dataset.type != 'line' || ctx.canvas.id != 'CollegeCompetitivenessCanvas'){
			ctx.fillText(dataset.data[i], model.x - 1, model.y - 5);
		}
		dataset.data[i] = originalValue;
		}
		i++;
	}
	});
};

var removeLabel = function(chart){
	chart.legend.legendItems.splice(1,1)
	chart.legend.width += 150
}