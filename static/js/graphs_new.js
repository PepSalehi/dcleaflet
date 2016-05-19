queue()
    .defer(d3.csv, "./static/csv/bank_w_hist.csv")
    .defer(d3.json, "./static/geojson/tfl_stations_2.json")
    .defer(d3.csv, "./static/csv/obs_hist_med_2.csv")
    .await(makeGraphs);










function makeGraphs(error, demandJson, statesJson, histJson) {


	//Clean demandJson data
	var demand = demandJson;
	var historicData = histJson;
	var dateFormat = d3.time.format("%y-%b-%d");
	var timeFormat = d3.time.format("%H:%M");

	// var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
	demand.forEach(function(d) {
		// debugger;
		// d["day"] = dateFormat.parse(d["day"]);
		d["total"] = +d["total"];
		d["arr_time"] = +d["arr_time"];
		d["exit_time"] = +d["exit_time"];
		d["arr_time_binned"] = +d["arr_time_binned"];
		d.hist_total = parseFloat(d.hist_total) ;
		// d.hist_total = +d.hist_total;
		d.travelTime = +(d["exit_time"] - d["arr_time"]);

		var today = new Date(2015, 12, 25);
		var hrs = 5;
		d.Date = new Date(today.getTime() + hrs*60*60*1000 + d.arr_time_binned*15*60*1000)
		
		// debugger;
	});

	var hrs = 5;
	var start = 0;
	historicData.forEach(function(d) {
		

		d["observed"] = +d["observed"] 
		d["hist"] = +d["hist"]
		d["median"] = +d["median"]
		var today = new Date(2015, 12, 25);
		
		d.Date = new Date(today.getTime() + hrs*60*60*1000 + start*15*60*1000)
		start += 1;
		

	});
	//Create a Crossfilter instance
	var ndx = crossfilter(demand);

	var histNdx = crossfilter(historicData);

	
	var destinationDim = ndx.dimension(function(d) { return d["destination"]  });
	var arrivalTimeDim = ndx.dimension(function(d) { return d["Date"]; });
	var totalDim  = ndx.dimension(function(d) { return d["total"]; });
	var stateDim = ndx.dimension(function(d){ return d["destination"]});
	var travelTimeDim = ndx.dimension(function(d){return d["travelTime"];});

	

	var DestinationGroupCount = destinationDim.group().reduceCount(function(d){
		return d.destination;
	});



	var arrivalPer15min = arrivalTimeDim.group().reduceSum(function(d){
		return d.total;
	});
	
	
	var histarrivalTimeDim = histNdx.dimension(function(d) { return d["Date"]; });
	var histArrivalPer15min = histarrivalTimeDim.group().reduceSum(function(d){
		return d.hist;
	})
	var obsArrivalPer15min = histarrivalTimeDim.group().reduceSum(function(d){
		return d.observed;
	})
	var medtArrivalPer15min = histarrivalTimeDim.group().reduceSum(function(d){
		return d.median;
	})


	var totalDemandByStation = stateDim.group().reduceSum(function(d) {
		return d["total"];
	});
	//http://stackoverflow.com/questions/29438515/uniformly-spaced-histogram-bins-with-dc-js
	var binwidth = 10;
	var travelTimeGroup = travelTimeDim.group().reduceCount(function(d){
		return   Math.floor(d["travelTime"]/binwidth);
	});
	var all = ndx.groupAll();
	var totalDemand = ndx.groupAll().reduceSum(function(d) {return d["total"];});
	var totalHistoricalDemand = ndx.groupAll().reduceSum(function(d) {return d["hist_total"];});
	var max_state = totalDemandByStation.top(1)[0].value; // what is this?



	//Define values (to be used in charts)
	var minDate = arrivalTimeDim.bottom(1)[0]["Date"];
	var maxDate = arrivalTimeDim.top(1)[0]["Date"];
	var minHistDate = histarrivalTimeDim.bottom(1)[0]["Date"];
	var maxHistDate = histarrivalTimeDim.top(1)[0]["Date"];
	var maxTravelTime = travelTimeDim.top(1)[0]["travelTime"];
	var minTravelTime = travelTimeDim.bottom(1)[0]["travelTime"];
	var maxDemand = totalDim.top(1)[0]["total"];

    //Charts
	var timeChart = dc.lineChart("#time-chart");
	var travelTimeChart = dc.barChart("#resource-type-row-chart");
	var destinationChart = dc.barChart("#poverty-level-row-chart");
	var groupname = "Choropleth"; 
	var usChart = dc_leaflet.choroplethChart("#us-chart");
	// var usChart = dc.leafletChoroplethChart("#us-chart");


	var totalDemandND = dc.numberDisplay("#total-donations-nd");

	width = 800
	height = 300

	usChart.width(1000)
	    .height(450)
	    .dimension(stateDim)
	    .group(totalDemandByStation)
	    .center([ 51.4963, -0.143 ])
	    .zoom(11)
	    .geojson(statesJson)
	    .colors(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"])
	    .colorDomain([0, max_state])
	    .colors(['#fff7ec','#fee8c8','#fdd49e','#fdbb84','#fc8d59','#ef6548','#d7301f','#b30000','#7f0000'])
	    .colorAccessor(function(d,i) {
	          return d.value;
	      })
	    .featureKeyAccessor(function(feature) {
	          return feature.properties.name;
	      })
	    .renderPopup(true)
	    .popup(function(d,feature) {
	          return feature.properties.name+" : "+d.value;
	      })
	    .legend(dc_leaflet.legend().position('bottomright'));

	    //https://github.com/dc-js/dc.js/issues/419
	    usChart.on("preRender", function(chart) {
	        chart.colorDomain(d3.extent(chart.data(), chart.valueAccessor()));
	    })
	    usChart.on("preRedraw", function(chart) {
	        chart.colorDomain(d3.extent(chart.data(), chart.valueAccessor()));
	    })

		// usChart.on("preRender", function(chart) {
  //           chart.colorDomain(d3.extent(chart.data(), chart.valueAccessor()));
  //       })
  //       usChart.on("preRedraw", function(chart) {
  //           chart.colorDomain(d3.extent(chart.data(), chart.valueAccessor()));
  //       })


	timeChart
		.width(width-200)
		.height(height)
		.margins({top: 10, right: 50, bottom: 30, left: 30})
		.dimension(arrivalTimeDim)
		.group(arrivalPer15min, "Observed")

		.transitionDuration(500)
		.renderArea(true)
		// .elasticX(true)
		.elasticY(true)
		// .x(d3.scale.linear().domain([minDate, maxDate+.5]))
		.x(d3.time.scale().domain([minDate, maxDate]))
		.xUnits(d3.time.min)
	    .renderHorizontalGridLines(true)
		// .legend(dc.legend().x(60).y(10).itemHeight(13).gap(5))
		.xAxisLabel("Time")
		.yAxis().ticks(4);
		// .xAxis().ticks(5);


	var time1 = dc.lineChart("#second_time_chart")
				.dimension(histarrivalTimeDim)
				.group(histArrivalPer15min, "Historical")
				.x(d3.time.scale().domain([minHistDate, maxHistDate]))
				.xUnits(d3.time.hour)
				.y(d3.scale.linear().domain([0, maxDemand]))
				.colors('green')
				// .renderHorizontalGridLines(true);
	var time2 = dc.lineChart("#second_time_chart")
				.dimension(histarrivalTimeDim)
				.group(medtArrivalPer15min, "Median Day")
				// .x(d3.scale.linear().domain([minDate, maxDate]))
				.x(d3.time.scale().domain([minHistDate, maxHistDate]))
				.xUnits(d3.time.hour)
				.y(d3.scale.linear().domain([0, maxDemand]))
				.colors('red')
				// .renderHorizontalGridLines(true);
	var time3 = dc.lineChart("#second_time_chart")
				.dimension(histarrivalTimeDim)
				.group(obsArrivalPer15min, "Observed")
				.colors('blue')
				// .x(d3.scale.linear().domain([minDate, maxDate]))
				.x(d3.time.scale().domain([minHistDate, maxHistDate]))
				.xUnits(d3.time.hour)
				.y(d3.scale.linear().domain([0, maxDemand]))

	var histOverview = dc.compositeChart("#second_time_chart");
		histOverview
		.width(350)
		.height(300)
		.margins({top: 10, right: 50, bottom: 30, left: 50})
		.transitionDuration(500)
		.dimension(histarrivalTimeDim)
		.brushOn(false)
		.elasticY(true)
		// .x(d3.scale.linear().domain([minDate, maxDate]))
		.x(d3.time.scale().domain([minDate, maxDate]))
		.xUnits(d3.time.hour)
		.y(d3.scale.linear().domain([0, maxDemand]))
		.legend(dc.legend().x(60).y(10).itemHeight(13).gap(5))
		.compose([
			time1,
			time2,
			time3

			])
		.xAxisLabel("Time")
		.yAxis().ticks(6);
	histOverview.xAxis().tickFormat(d3.time.format("%H:%M"))
	histOverview.xAxis().ticks(4);

	totalDemandND
		.width(300)
		.height(300)
		.formatNumber(d3.format(".0f"))
		.valueAccessor(function(d){return d; })
		.group(totalDemand)


 	travelTimeChart
	 	.width(450)
		.height(300)
		.dimension(travelTimeDim)
        .group(travelTimeGroup)
		.margins({top: 10, right: 10, bottom: 30, left: 30})
        // .gap(10)
        // .x(d3.scale.ordinal().domain(["Bank", "victoria"]))
        .x(d3.scale.linear().domain([minTravelTime, maxTravelTime+1]))
    	.y(d3.scale.linear().domain([0, 800]))
		.elasticY(true)
		.elasticX(false)
		.centerBar(false)
		.ordinalColors(["red"])
		.xAxisLabel("Minutes")
		.xAxis().tickFormat();

	destinationChart
		.width(1180)
		.height(230)
		.margins({top: 10, right: 10, bottom: 20, left: 30})
        .dimension(destinationDim)
        .group(DestinationGroupCount)
        // .stack(historicalDestination)
        // .x(d3.scale.ordinal().domain([ "Victoria", "Vauxhall", "Stratford", "Whitechapel", "Woodford"]))
        .x(d3.scale.ordinal())
    	.y(d3.scale.linear().domain([0, 15]))
		.elasticY(true)
		.elasticX(false)
		.centerBar(false)
		.xUnits(dc.units.ordinal)
		.xAxisLabel("Stations")
        .xAxis().tickFormat(function(v) { return ""; });


	


	console.log(statesJson)


	// canary wharf with the most long (delayed) travel times
    dc.renderAll();
    // return{choro:usChart}

};

