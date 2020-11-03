
var popup = new mapboxgl.Popup({
    closeButton: false
});
var hoveredStateId = null;
var districtData;
var fileresult;
var dates = [];
var percentile = 0.9;
var percentileThreshold = 300;
var newlyInfectedPercentile = 0;
var maxGrowth = 0;

var layers = [];

var sliderDate;
var timeSliderContainer = null;
var selectedTimeValue = null;
var currentSliderIndex = null;

var trendGradientMode = true;
var timescope = 42;
var trendcolorscale = chroma.scale(['red', 'white', 'lightgreen']).domain([-90,0,90]).mode('lab');

var cbgreen = "#83C775";//"limegreen";//"#94ff29";//"#00ffa6";
var cbyellow = "#FFDE17"; //"#ffffbf";
var cbred = "#8E191C"; //"#fc8d59";

var regred = "#ff3c00";
var regyellow = "#fff200";
var reggreen = "#00ba32";

var cred = "#ff3c00";
var cyellow =  "#fff200";
var cgreen = "#00ba32";


var regredbox = 'rgba(255, 0, 0, 0.3)';
var reggreenbox = 'rgba(0, 255, 0, 0.3)';
var regyellowbox = 'rgba(255, 255, 0, 0.3)';

var cbredbox = 'rgba(142, 25, 28, 0.3)';
var cbgreenbox = 'rgba(131, 199, 117, 0.3)';
var cbyellowbox = 'rgba(255, 222, 23, 0.3)';

var redbox = 'rgba(255, 0, 0, 0.3)';
var greenbox = 'rgba(0, 255, 0, 0.3)';
var yellowbox = 'rgba(255, 255, 0, 0.3)';

function handleColorBlindModeChange(event) {
    event.stopPropagation();
    toggleColorBlind(!COLORBLIND);
    updateMapAndLegend();
}

function toggleColorBlind(cb){
    if(cb) {
        cred = cbred;
        cyellow = cbyellow;
        cgreen = cbgreen;

        redbox = cbredbox;
        greenbox = cbgreenbox;
        yellowbox = cbyellowbox;

    } else {
        cred = regred;
        cyellow = regyellow;
        cgreen = reggreen;

        redbox = regredbox;
        greenbox = reggreenbox;
        yellowbox = regyellowbox;
    }
    COLORBLIND = cb;
    if(USECOOKIES) setCookie("colorblind", cb, 365);
}

function updateMapAndLegend()
{
    calcSeverity(fileresult.features, csv_table);
    map.getSource('infection_rates').setData(fileresult);
    updateLegend();
}

d3.select(window).on('resize', resizeWindow);

function onCurrentDiseaseRateLoaded() {
    if (this.readyState == 4 && this.status == 200) {

        console.log("data loaded...");
        fileresult = JSON.parse(this.responseText);
        // console.log(fileresult);

        toggleColorBlind(COLORBLIND);

        //values are stored as strings in the original data currently
        diseaseCount2Int(fileresult);

        configureSlider(fileresult);
        calcGrowRate(fileresult.features);
        calcNewInfections(fileresult.features);
        calcMaxNewInfections(fileresult.features);
        // calcNewInfectionsTrend(fileresult.features);
        calcSeverity(fileresult.features, csv_table);
        generateFeatureIDs(fileresult);

        //todo: calc & store gradient/trend for current time step only
        if(TREND_ENABLED) calcInfectionTrends(fileresult.features);

        percentileThreshold = calculatePercentile(fileresult);
        newlyInfectedPercentile = calculateNewlyInfectedPercentile(fileresult);

        map.addSource('infection_rates', {
            type: 'geojson',
            data: fileresult
        });

        map.addLayer({
            'id': 'infection_poly',
            'type': 'fill',
            'source': 'infection_rates',
            'layout': {},
            'paint': {
                'fill-color': ['get', 'severity'],
                'fill-opacity': ['case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.8]
            }
        });
        layers.push("infection_poly");

        switchInfectionLayerEncoding("Anzahl (max: 0,9 Quantil)", "newInfections", 0, newlyInfectedPercentile, null, null, "der maximal Wert der Farbscala entspricht dem 0.9 Quantil der Anzahl an Neuinfizierten im Vergleich zum Stand vor 14 Tagen.");
        updateLegend();

        map.addLayer({
            'id': 'district_borders',
            'type': 'line',
            'source': 'infection_rates',
            'layout': {},
            'paint': {
                'line-color': '#242629',
                'line-width': 1
            }
        });
        layers.push("district_borders");


        map.on('mousemove', 'infection_poly', function(e) {
            if (e.features.length > 0) {

                let labeltxt = "";
                labeltxt = "<b>" + e.features[0].properties.name + "</b><br>" + parseFloat(e.features[0].properties.infectionsPerHT).toLocaleString(lang) + dictionary.popup0 + tweeksago_strng;

                popup.setLngLat(e.lngLat)
                    .setHTML(labeltxt + "<br><br>" + "<canvas id=\"myChart\" width=\"400\" height=\"400\"></canvas>")
                    .addTo(map);

                setupChart(e.features[0], "myChart");

                map.getCanvas().style.cursor = 'pointer';

                if (hoveredStateId) {
                    map.setFeatureState(
                        { source: 'infection_rates', id: hoveredStateId },
                        { hover: false }
                    );
                }
                hoveredStateId = e.features[0].id;

                map.setFeatureState(
                    { source: 'infection_rates', id: hoveredStateId },
                    { hover: true }
                );
            }
        });

        map.on('mouseleave', 'infection_poly', function() {
            if (hoveredStateId) {
                map.setFeatureState(
                    { source: 'infection_rates', id: hoveredStateId },
                    { hover: false }
                );
            }
            hoveredStateId = null;
            map.getCanvas().style.cursor = '';
            popup.remove();
        });

        map.on('click', 'infection_poly', function(e) {
            if (e.features.length > 0) {
                showInfoBox(generateInfoBoxContent(e.features[0]));
                setupChart(e.features[0], "myChartInfobx");
                let angle = fileresult.features[e.features[0].id].properties.trend;//e.features[0].properties.trend; //calcTrendGradient(e.features[0],currentSliderIndex);
                updateArrow("trend", angle);
            } else {
                hideInfoBox();
            }
        });

        updateTimelineSlider(Date.parse(dates[dates.length-1]));
        // showTimeline();

        setupRadioButtons();
        // setInfectMenu();

        // switchMapLayer("trendcolor");
    }
}

function setupChart(districtdata, chartID)
{
    let datarray = fileresult.features[districtdata.id].properties.newInfectionsArray;
    var twoweekgrad = [];
    var graphdata = {};

    if(showTrend)
    {
        twoweekgrad = [{x:date_strngArray[currentSliderIndex-14], y:datarray[currentSliderIndex-14]},{x:date_strngArray[currentSliderIndex], y:datarray[currentSliderIndex]}];
        graphdata = {
            labels: date_strngArray,
            datasets: [{
                label: 'Positiv Getestete innerhalb von 14 Tagen',
                borderColor: 'rgb(255, 99, 132)',
                data: datarray
            },
                {
                    label: 'Zwei-Wochen Trend',
                    borderColor: 'rgb(100, 99, 100)',
                    data: twoweekgrad
                }]
        }
    } else {
        graphdata = {
            labels: date_strngArray,
            datasets: [{
                label: dictionary.infobox3,
                borderColor: 'rgb(255, 99, 132)',
                data: datarray
            }]
        }
    }

    /*console.log(datarray);
     console.log(date_strngArray);*/

    var ctx = document.getElementById(chartID).getContext('2d');
    var chart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',

        // The data for our dataset
        data: graphdata,

        // Configuration options go here
        options: {
            animation: false,
            scales: {
                            yAxes: [{
                                ticks: {
                                    beginAtZero: true,
                                    suggestedMax: fileresult.features[districtdata.id].properties.redMaxInhabitants
                                },
                            }]
                        },
            legend: {
                labels: {
                    usePointStyle: true,
                    boxWidth: 4
                }
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        // console.log(tooltipItem);

                        var dmy;
                        var date;
                        if (lang == "de") {
                            dmy = tooltipItem.label.split(". ");
                            date = new Date(dmy[2], dmy[1] - 1, dmy[0]);
                        }
                        else {
                            dmy = tooltipItem.label;
                            // console.log(dmy);
                            date = new Date(dmy);
                        }

                        date.setDate(date.getDate() - 14);
                        // console.log(date);
                        let datestring;
                        if (lang === "en") {
                            datestring = moment(date).format("MMM Do YY");
                        }
                        else {
                            // moment.locale('de'); // returns the new locale, in this case 'de'
                            // var deDate = moment(date);
                            // deDate.locale("de");
                            // console.log(deDate);
                            // datestring = deDate.format("LL");

                            datestring = date.toLocaleString("de", {month: 'long', year: 'numeric', day: 'numeric'})
                        }

                        return dictionary.infobox1 + datestring + ": " + tooltipItem.value;
                    }
                }
            },
            annotation: {
                drawTime: "beforeDatasetsDraw",
                events: ['dblclick'],
                annotations: [{
                    id: 'green-box',
                    type: 'box',
                    yScaleID: 'y-axis-0',
                    yMax: fileresult.features[districtdata.id].properties.greenMaxInhabitants,
                    backgroundColor: greenbox,
                    borderWidth: 0
                },
                {
                    id: 'yellow-box',
                    type: 'box',
                    yScaleID: 'y-axis-0',
                    yMin: fileresult.features[districtdata.id].properties.greenMaxInhabitants,
                    yMax: fileresult.features[districtdata.id].properties.yellowMaxInhabitants,
                    backgroundColor: yellowbox,
                    borderWidth: 0
                },
                {
                    id: 'red-box',
                    type: 'box',
                    yScaleID: 'y-axis-0',
                    yMin: fileresult.features[districtdata.id].properties.yellowMaxInhabitants,
                    backgroundColor: redbox,
                    borderWidth: 0
                },
                {
                    id: 'time-line',
                    type: 'line',
                    mode: 'vertical',
                    scaleID: 'x-axis-0',
                    value: formatDate(selectedTimeValue),
                    borderColor: 'black',
                    borderWidth: 1
                }]
            }
        }
    });
}

var district_map;
function onjsonloaded() {
    if (this.readyState == 4 && this.status == 200) {

        console.log("data loaded...");
        // console.log(this.responseText);
        district_map = JSON.parse(this.responseText);
        if (WORLD) {
            loadCSVData("assets/population_countries.csv?t="+now, onTableLoaded, ",");
        } else {
            loadCSVData("data/district_data.csv?t="+now, onTableLoaded, ",");
        }

        // createdistricttable(district_map)
    }
}

function createdistricttable(dmap) {

    let dtable = [];
    for(let i=0; i<dmap.features.length; i++)
    {
        let currf = dmap.features[i];
        let newrow = [];
        newrow.push(currf.properties.id);
        newrow.push(currf.properties.name);
        dtable.push(newrow);
    }

    let output = Papa.unparse(dtable);
    saveStringAsFile(output, "district_codes_2020.csv");
}


function toggleLayerVisibility(vis_layer) {

    let lay = map.getLayer(vis_layer);

    if(lay == undefined){
        console.warn("layer " + vis_layer + " == UNDEFINED");
        return;
    }

    var visibility = map.getLayoutProperty(vis_layer, 'visibility');

    if (visibility === 'visible') {
        map.setLayoutProperty(vis_layer, 'visibility', 'none');
    } else {
        map.setLayoutProperty(vis_layer, 'visibility', 'visible');
    }
}


function hideLayer(vis_layer) {
    map.setLayoutProperty(vis_layer, 'visibility', 'none');
}
function showLayer(vis_layer) {
    map.setLayoutProperty(vis_layer, 'visibility', 'visible');
}

function hideAllLayers(layers) {

    for(let i=0; i<layers.length; i++)
    {
        hideLayer(layers[i]);
    }
}

function encodeDistrictDataLayer(unitLabel, prop_name, min, max, mincol, maxcol, tooltip) {
    map.setPaintProperty('d_map_nodata', 'fill-color',  ['interpolate-lab',
        ['linear'],
        ['get', prop_name],
        min,
        mincol,
        max,
        maxcol]);

    createColorLegend(unitLabel,{value: min, color: mincol}, {value: max, color: maxcol}, 5, tooltip);
}

function switchInfectionLayerEncoding(unitLabel, prop_name, min, max, mincol, maxcol, tooltip = null) {
    createColorLegend(unitLabel, {value: min, color: '#fffdfc'}, {value: max, color: '#f55a42'}, 5, tooltip);
}

function configureSlider(data) {
    dates = getDates(data);
    timescope = dates.length - 15;
    // dates.forEach((d, i) => {
    //     console.log(i+", "+d);
    // });

    //sliderDate = d3.range( Math.max(0, dates.length - 15), dates.length).map(function (d) {
    sliderDate = d3.range( Math.max(0, dates.length - (timescope+1)), dates.length).map(function (d) {
       return Date.parse(dates[d]);
    });

    createTimeSlider();
}

function createTimeSlider() {
    var sliderWidthDecrease = 420;

    var container = d3.select('#timelineSlider-container');
    if (window.innerWidth < 800) {
        sliderWidthDecrease = 30;
        container.classed('more-margin', true);
    } else {
        container.classed('more-margin', false);
    }

    if (selectedTimeValue == null) {
        selectedTimeValue = sliderDate[sliderDate.length - 1];
    }

    //Calculate tick dates based on window size!
    var tickValues = sliderDate;
    var sliderWidth = window.innerWidth - sliderWidthDecrease - 100;
    var dateSpace = 62;
    var nbDates = Math.floor(sliderWidth / dateSpace);    
    if(nbDates<sliderDate.length) {
        var modValue = Math.ceil(sliderDate.length / nbDates);
        tickValues = tickValues.filter((v, i) => { return i===0 || 
                                                          i === sliderDate.length-1 ||
                                                          (i % modValue===0 && sliderDate.length-modValue>i);});
    }

    let tf = getTimeFormat();

    var timeSlider = d3
        .sliderBottom()
        .min(d3.min(sliderDate))
        .max(d3.max(sliderDate))
        .width(sliderWidth)
        //.tickFormat(d3.format('.2'))
        .ticks(10)
        .tickFormat(d3.timeFormat(tf))
        .tickValues(tickValues)
        .step(1000 * 60 * 60 * 24)
        .default(selectedTimeValue)
        .on('onchange', val => {
            updateTimelineSlider(val);
        });


    container.selectAll("*").remove();
    timeSliderContainer = container.append('svg')
        .attr('width', window.innerWidth - sliderWidthDecrease)
        .attr('height', 37)

    var gTimeSlider = timeSliderContainer.append('g')
        .attr('transform', 'translate(30,6)');

    gTimeSlider.call(timeSlider);

    //gTimeSlider.select('g.axis g text').attr('transform', 'translate(0,0)');
    gTimeSlider.selectAll('g.axis g text').attr('dy', '0.0em');
    gTimeSlider.selectAll('g.slider g text').attr('dy', '0.0em');
}

function calculatePercentile(data) {
    var lastDate = dates[dates.length-2];
    var arr = [];
    fileresult.features.forEach((f) => {
        arr.push(f.properties.disease[lastDate]);
    });
    // console.log("arr: " + JSON.stringify(arr));
    return calcPercentile(arr, percentile);
}

function calculateNewlyInfectedPercentile(data) {
    var arr = [];
    fileresult.features.forEach((f) => {
        arr.push(f.properties.newInfections);
    });
    // console.log("arr: " + JSON.stringify(arr));
    return calcPercentile(arr, percentile);
}

function updateTimelineSlider(value) {
    selectedTimeValue = value;
    //value = sliderDate.indexOf(value);
    value = sliderDate.indexOf(value);
    currentSliderIndex = value;
    // console.log(currentSliderIndex)

    fileresult.features.forEach((f)=> {
        f.properties.trend = f.properties.trendarray[value-15];
        f.properties.trendcolor = f.properties.trendcolorarray[value-15];

        f.properties.newInfections = f.properties.newInfectionsArray[value];
        f.properties.growth = f.properties.growthArray[value];
        //f.properties.infectionCount = f.properties.disease[dates[dates.length-1 - (14 - value)]];
        f.properties.infectionCount = f.properties.disease[dates[dates.length-1 - (timescope - value)]];
    });

    calcSeverity(fileresult.features, csv_table);

    tweeksago_strng = lang === "de" ? tweeksago_strngArray[value] : tweeksago_strngArrayUS[value];
    map.getSource('infection_rates').setData(fileresult);

    updateLegend();
    if (lastInfoBoxFeature != null) {
        // console.log(lastInfoBoxFeature)
        setInfoBoxContent(generateInfoBoxContent(lastInfoBoxFeature));
        setupChart(lastInfoBoxFeature, "myChartInfobx");
        let angle = fileresult.features[lastInfoBoxFeature.id].properties.trend; //calcTrendGradient(lastInfoBoxFeature, currentSliderIndex);
        updateArrow("trend", angle);
    }
}
//date.toLocaleString("de-AT", {month: 'long', year: 'numeric', day: 'numeric'})
function updateLegend() {
    createItemColorLegend(dictionary.legendTitle0 +  tweeksago_strng  + dictionary.legendTitle1, [
        { color: cgreen, label: dictionary.legendEntry0, label_short: "< 1", label_short_color: "white" },
        { color: cyellow, label: dictionary.legendEntry1, label_short: "< 10", label_short_color: "black" },
        { color: cred, label: dictionary.legendEntry2, label_short: ">= 10", label_short_color: "white"}]);
}

function resizeWindow() {
    if (timeSliderContainer != null) {
        createTimeSlider();
    }

    if (window.innerWidth < 1000) {
        d3.select('#info-overlay').classed('mobile', true);
    } else {
        d3.select('#info-overlay').classed('mobile', false);
    }

    updateLegend();
}

function debug() {
    for(let i=0; i<fileresult.features.length; i++){
        if(fileresult.features[i].properties.name == "Rust(Stadt)")
            console.log(fileresult.features[i].properties);
        // else console.log("nada");
    }
}

// function switchMapLayer(unitLabel, prop_name, min, max, mincol, maxcol, tooltip) {

function switchMapLayer(prop_name) {
    // maxcol = '#42f560';
    // mincol = '#f55a42';
    // let min = -90;
    // let max = 90;

        map.setPaintProperty('infection_poly','fill-color', ['get', prop_name]);

    // map.setPaintProperty('infection_poly', 'fill-color',  ['interpolate-lab',
        // ['linear'],
        // ['get', "trend"],
        // min,
        // mincol,
        // max,
        // maxcol]);

    // createColorLegend(unitLabel,{value: min, color: mincol}, {value: max, color: maxcol}, 5, tooltip);
}

function getTimeFormat() {
    let tf = "%m/%d/%Y";
    if(lang == "de") tf = '%d. %m. %Y';
    else tf = "%m/%d/%Y";

    return tf;
}