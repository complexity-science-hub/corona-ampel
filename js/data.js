var WORLD = true;
var TREND_ENABLED = false;
var COLORBLIND = false;

var now = moment();
var growth_radio = {};
var absolute = true;
//var growth = true; //infection rate: absolute / growth rate
var fallz_radiostate = "radio_trend"; //init the page on the newly infected radiobutton
var tweeksago_strng = "";
var lastInfoBoxFeature = null;

var districtInfo = [];
var showTrend = false;


function diseaseCount2Int(data) {

    for(let i=0; i<data.features.length; i++)
    {
        data.features[i].properties.Anzahl = parseInt(data.features[i].properties.Anzahl);
    }
}

function getPercentile(data, percentile) {
    var arr = [];
    var date = getLastDate(data);
    data.features.forEach((f) => {
        arr.push(f.properties.disease[date]);
    });
    return calcPercentile(arr, percentile);
}

function getDates(data) {
    var diseaseDates = data.features[0].properties.disease;
    var dateKeys = Object.keys(diseaseDates);
    var dates = dateKeys.map((dk) => {
        return new Date(Date.parse(dk));
    });
    dates = dates.sort((a, b) => {
        return a-b;
    });
    dates = dates.map((d) => {
        return moment(d).format('YYYY-MM-DD');
    });
    return dates;
}

function generateFeatureIDs(data) {

    for(let i=0; i<data.features.length; i++)
    {
        // data.features[i].id = data.features[i].properties.name;
        data.features[i].id = i;
    }
}

let csv_table;
function onTableLoaded(results) {

    csv_table = results.data;
    // let header = csv_table[0];

    csv2GeoJSON(csv_table, district_map);
    if(!WORLD) {
        generateFeatureIDs(district_map);
    }

    //unlock page interactions
    document.body.style["pointer-events"] = "";

    if (WORLD) {
        loadData("https://vis.csh.ac.at/riskpatients/disease_rate_global.json?t="+now, onCurrentDiseaseRateLoaded);
    } else {
        loadData("https://vis.csh.ac.at/riskpatients/disease_rate.json?t=" + now, onCurrentDiseaseRateLoaded);
    }
}


function csv2GeoJSON(tbl, dmap)
{
    let header = tbl[0];
    let nameIndex = 1;

    if (WORLD) {
        return;
    }

    for(let i=1; i<tbl.length; i++)
    {
        let c_row = tbl[i];

        //get matching feature
        let fid = getFeatureID(dmap, c_row[nameIndex]);
        if(fid == undefined) continue;

        //add row props to feature -- start with index 2 (since 0 and 1 are district IDs)
        for(let j=2;j<header.length; j++)
        {
            dmap.features[fid].properties[header[j]] = parseFloat(c_row[j]);
        }
    }

    //calc min/max ranges
    let minMaxDict = {};
    for(let i=2; i<header.length; i++)
    {
        let min = null;
        let max = 0;
        for(j=1; j<tbl.length; j++)
        {
            let cval = parseFloat( tbl[j][i]);
            if(cval > max) max = cval;
            if (min == null) min = cval;
            if(cval < min) min = cval;
        }
        minMaxDict[header[i]] = {};
        minMaxDict[header[i]].min = min;
        minMaxDict[header[i]].max = max;
    }
    dmap.minMaxDict = minMaxDict;
}


function getFeatureID(shapes, id) {
    let found = false;
    for(let j=0; j<shapes.features.length; j++)
    {
        if(shapes.features[j].properties.name == id )
        {
            found = true;
            return j;
        }
    }
    console.warn("did not find: " + id + " in the feature set.")
}


function setupRadioButtons() {
    if (!TREND_ENABLED) {
        return;
    }

    let radio_amp = document.getElementById("radio_amp");
    radio_amp.setAttribute("onChange", "onRadioGrowth(value)");
    radio_amp.setAttribute("checked", "checked");

    let radio_trend = document.getElementById("radio_trend");
    radio_trend.setAttribute("onChange", "onRadioGrowth(value)");
}


function onRadioGrowth(value) {
    fallz_radiostate = value;
    // console.log(fallz_radiostate);

    if(value == "radio_trend") {
        showTrend = true;
        switchMapLayer("trendcolor");
        document.getElementById("radio_amp").setAttribute("checked", "false");
    }
    else if(value == "radio_amp"){
        showTrend = false;
        switchMapLayer("severity");
        document.getElementById("radio_trend").setAttribute("checked", "false");
    }
}


function setupWelcomeMsg(){
    let result;
    if (WORLD) {
        result = "<h5>" + dictionary.welcomeGlobal0 + "</h5>" + dictionary.welcomeGlobal1;
    } else {
        result = "<h5>" + dictionary.welcomeAT0 + "</h5>" + dictionary.welcomeAT1;
    }
    return result;
}

function generateInfoBoxContent(feature) {
    lastInfoBoxFeature = feature;

    var query = feature.properties.name;
    if (feature.properties.name.startsWith("Wien ")) {
        query = "Wien(Stadt)";
    }

    var infectionData = findInfectionDataForDistrictName(query);
    //var infectionCount = infectionData.disease[dates[dates.length-1]];
    var infectionCount = infectionData.infectionCount;

    let icon = "<img src=\"./assets/arrow.png\" alt=\"trend indicator\" id=\"trend\" class=\"tooltipped\" data-tooltip=\"Trend = Steigungswinkel der Zwei-Wochen-Kurve\">";

    var result = "<h5>" + feature.properties.name + "</h5>";

    if (TREND_ENABLED) {
        result = "<h5>" + feature.properties.name + icon + "</h5>";
    }

    if (feature.properties.name.startsWith("Wien ")) {
        result += "<p><b>Anzahl insgesamt positiv Getesteter (gesamt Wien): </b><span class='info-value'>" + infectionCount.toLocaleString(lang) + "</span>" +
            "<b>Anzahl positiv Getesteter (gesamt Wien) seit " + tweeksago_strng + ":</b><span class='info-value'>" + infectionData.newInfections.toLocaleString(lang, {maximumFractionDigits: 1}) + "</span>" +
            "<br><b>Wachstumsrate (gesamt Wien): </b><span class='info-value'>" + infectionData.growth.toLocaleString(lang, {maximumFractionDigits: 1}) + "%</span></p>";
    } else {
        result += "<p><b>" + dictionary.infobox0 + ": </b><span class='info-value'>" + infectionCount.toLocaleString(lang) + "</span>" +
            "<br><b>" + dictionary.infobox1  + tweeksago_strng + ": </b><span class='info-value'>"+ infectionData.newInfections.toLocaleString(lang, {maximumFractionDigits: 1}) + "</span></p>";
    }
    // "<br><b>Wachstumsrate: </b><span class='info-value'>" + infectionData.growth.toLocaleString(undefined, {maximumFractionDigits: 1}) + " %</span></p>";

    if (WORLD) {
        result += "<p><b>" + dictionary.infobox2 + ": </b><span class='info-value'>" + getDistrictInhabsByIso(feature.properties.name).toLocaleString(lang) + "</span></p>" +
            "<br><br>" + "<canvas id=\"myChartInfobx\" width=\"400\" height=\"400\"></canvas>";
    } else {
        var data = findDataForDistrictName(feature.properties.name);
        var vulnerableCount = data["Risiko durch Vorerkrankungen, 65+_abs"];
        var vulnerableCount_rel =  (100*vulnerableCount / data["Gesamtbevölkerung_abs"]).toLocaleString(lang, {maximumFractionDigits: 1}); //data["Risiko durch Vorerkrankungen, Männer 65+_rel"] + data["Risiko durch Vorerkrankungen, Frauen 65+_rel"];
//data["Risiko durch Vorerkrankungen, 65+_rel"];

        result += "<p><b>" + dictionary.infobox4 + " </b><span class='info-value'>" + data.Allgemeinmedizin_abs.toLocaleString(lang) + "</span></p>" +
            "<p><b>" + dictionary.infobox5 + " </b><span class='info-value'>" + data.Allgemeinmedizin_rel.toLocaleString(lang, {maximumFractionDigits: 1}) + "</span></p>" +
            "<p><b>" + dictionary.infobox6 + " </b><span class='info-value'>" + vulnerableCount.toLocaleString(lang) + "</span></p>" +
            "<p><b>" + dictionary.infobox7 + " </b><span class='info-value'>" + vulnerableCount_rel.toLocaleString(lang, {maximumFractionDigits: 1}) + "%</span></p>" +
            "<p><b>" + dictionary.infobox2 + ": </b><span class='info-value'>" + data["Gesamtbevölkerung_abs"].toLocaleString(lang) + "</span></p>" +
            "<br><br>" + "<canvas id=\"myChartInfobx\" width=\"400\" height=\"400\"></canvas>";
    }

    return result;
}

function findInfectionDataForDistrictName(name) {
    for (var i = 0; i < fileresult.features.length; i++) {
        if (fileresult.features[i].properties.name == name) {
            return fileresult.features[i].properties;
        }
    }
}

function findDataForDistrictName(name) {
    if (name == "Wien(Stadt)") {
        var res = null;
        let divider = 0;

        for (var i = 0; i < district_map.features.length; i++) {
            if (district_map.features[i].properties.name.startsWith("Wien ")) {
                if (res == null) {
                    res = Object.assign({}, district_map.features[i].properties);
                }
                    res["Risiko durch Vorerkrankungen, 65+_abs"] += district_map.features[i].properties["Risiko durch Vorerkrankungen, 65+_abs"];
                    res["Gesamtbevölkerung_abs"] += district_map.features[i].properties["Gesamtbevölkerung_abs"];
                    res.Allgemeinmedizin_rel += district_map.features[i].properties.Allgemeinmedizin_rel;
                    res.Allgemeinmedizin_abs += district_map.features[i].properties.Allgemeinmedizin_abs;
            }
        }
        res.Allgemeinmedizin_rel = res.Allgemeinmedizin_rel / 23;
        return res;
    } else {
        for (var i = 0; i < district_map.features.length; i++) {
            if (district_map.features[i].properties.name == name) {
                return district_map.features[i].properties;
            }
        }
    }
}
