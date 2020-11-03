// counter test with https://goodcalculators.com/percentile-calculator/
function calcPercentile(values, percentile) {
    var sortedValues = values.sort((a,b) => { return a-b });
    // console.log("sortedValues: "+JSON.stringify(sortedValues));
    var nbValues = values.length;

    var index = nbValues * percentile;
    // console.log("index = " + index);
    if(index !== Math.floor(index)) {
        // Index is not whole number
        index = Math.ceil(index);
        // console.log("new index = " + index);
        // console.log("sortedValues[index-1] = " + sortedValues[index-1]);
        return sortedValues[index-1];
    } else {
        // Index is whole number
        if(index<nbValues) {
            return 0.5*(sortedValues[index-1] + sortedValues[index]);
        } else {
            return sortedValues[index];
        }
    }
}


function calcGrowRate(features) {

    for (let d = 14; d >= 0; d--) {
        for (let i = 0; i < features.length; i++) {
            let cdis = features[i].properties.disease;
            let time_series = [];
            let max_samples = 7; //number of days used in the lin.reg.

            for (let j = max_samples; j > 0; j--) {
                let t_entry;
                let dateIndex = dates.length - 2 - j - d; //not taking the last index as that represents the current date - which should not be part of the calc
                let infrate = cdis[dates[dateIndex]];
                if (infrate == 0) t_entry = [max_samples - j, infrate];
                else t_entry = [max_samples - j, Math.log(infrate)];
                // let t_entry = [max_samples-j, Math.log(infrate)];
                time_series.push(t_entry);  //avoid log(0)
            }

            let linreg = regression.linear(time_series, {
                order: 2,
                precision: 4,
            });
            let gradient = linreg.equation[0];
            let grow_rate = gradient * 72 / Math.log(2);

            if (isNaN(grow_rate)) {
                console.warn("log of 0 in growthrate calculation...")
                features[i].properties.growth = 0;
            } else if (grow_rate < 0) features[i].properties.growth = 0; // cap at 0 (no negative growth rate
            else features[i].properties.growth = grow_rate;

            if (!features[i].properties.growthArray) {
                features[i].properties.growthArray = [];
            }
            features[i].properties.growthArray.push(features[i].properties.growth);


            maxGrowth = Math.max(maxGrowth, features[i].properties.growth);
        }
    }

}


var tweeksago_strngArray = [];
var tweeksago_strngArrayUS = [];
var date_strngArray = [];

function formatDate(date) {
    let tf = getTimeFormat();
    var formatTime = d3.timeFormat(tf);
    return formatTime(new Date(date));
}

function parseDate(input, format) {
    format = format || 'yyyy-mm-dd'; // default format
    var parts = input.match(/(\d+)/g),
        i = 0, fmt = {};
    // extract date-part indexes from the format
    format.replace(/(yyyy|dd|mm)/g, function(part) { fmt[part] = i++; });

    return new Date(parts[fmt['yyyy']], parts[fmt['mm']]-1, parts[fmt['dd']]);
}

function calcNewInfections(features) {
    //for (let j = 14; j >= 0; j--) {
    for (let j = timescope; j >= 0; j--) {
        //let today = dates[dates.length - 2 - j]; //actually yesterday since today's count is not yet complete
        let today = dates[dates.length - 1 - j]; //actually yesterday since today's count is not yet complete
        //let tweeksago = dates[dates.length - 16 - j];
        let tweeksago = dates[dates.length - 15 - j];

        date_strngArray.push(formatDate(today));

        let dObj = new Date(tweeksago);
        tweeksago_strngArray.push(dObj.toLocaleString("de-AT", {month: 'long', year: 'numeric', day: 'numeric'}));//dObj.getDay() + ". " + dObj.getMonth() + ". " + dObj.getFullYear();
        tweeksago_strngArrayUS.push(dObj.toLocaleString("en-US", {month: 'long', year: 'numeric', day: 'numeric'}));//dObj.getDay() + ". " + dObj.getMonth() + ". " + dObj.getFullYear();

        tweeksago_strng = dObj.toLocaleString("de-AT", {month: 'long', year: 'numeric', day: 'numeric'});//dObj.getDay() + ". " + dObj.getMonth() + ". " + dObj.getFullYear();
        // console.log("diff betwwen " + today + " and " + tweeksago + ":");

        for (let i = 0; i < features.length; i++) {
            let current_val = features[i].properties.disease[today];
            let old_val = features[i].properties.disease[tweeksago];
            let new_infections = current_val - old_val;

            /*if (features[i].properties.name == "Murtal") {
                //console.log(features[i]);
                console.log(j + ": " + old_val + " ... " + current_val + " = " + new_infections);
            }*/

            new_infections = new_infections < 0 ? 0 : new_infections;
            // console.log(new_infections);
            if (!features[i].properties.newInfectionsArray) {
                features[i].properties.newInfectionsArray = [];
                features[i].properties.trendarray = [];
                features[i].properties.trendcolorarray = [];

            }
            features[i].properties.newInfectionsArray.push(new_infections); //warning: this cannot be retrieved from the features property on hover since mapbox turns in into a string
            features[i].properties.newInfections = new_infections;

            // //calculate infection rate trend
            // let today_past = dates[dates.length - 15 - j]; //actually yesterday since today's count is not yet complete
            // let tweeksago_past = dates[dates.length - 29 - j];
            // console.log(tweeksago_past);
            // let current_val_past = features[i].properties.disease[today_past];
            // let old_val_past = features[i].properties.disease[tweeksago_past];
            // console.log(old_val_past)
            // let new_infections_past = current_val_past - old_val_past;
            // let angle = calcTrendGradientForPair(new_infections_past, new_infections);
            // features[i].properties.trendarray.push(angle);
        }
    }
}

function calcMaxNewInfections(features) {

    for(let i=0; i<features.length; i++)
    {
        features[i].properties.maxNew = Math.max(...features[i].properties.newInfectionsArray);

        let gesamtBevoelkerung = getBevoelkerung(features[i]);
        features[i].properties.greenMaxInhabitants = gesamtBevoelkerung * 0.0001;  //gelb bei mehr als ein 10.000
        features[i].properties.yellowMaxInhabitants = gesamtBevoelkerung * 0.001; //rot bei mehr als ein tausendstel
        features[i].properties.redMaxInhabitants = Math.max(features[i].properties.maxNew, Math.ceil(gesamtBevoelkerung * 0.0011));
        // console.log(features[i].properties.name, features[i].properties.redMaxInhabitants);
    }
}

//for each feature, for each time-step: calc slope/gradient
function calcInfectionTrends(features) {

    features.forEach((feature) => {

        for(let i=14; i<sliderDate.length-1; i++)
        {
            let slopeangle = calcTrendGradient(feature, i);
            feature.properties.trendarray.push(slopeangle);
            let col = trendcolorscale(slopeangle).hex();
            feature.properties.trendcolorarray.push(col);
        }
    });

}

function calcNewInfectionsTrend(features) {

    for (let j = timescope; j >= 0; j--) {
        let today = dates[dates.length - 1 - j]; //actually yesterday since today's count is not yet complete
        let tweeksago = dates[dates.length - 15 - j];

        for (let i = 0; i < features.length; i++) {
            let current_val = features[i].properties.disease[today];
            let old_val = features[i].properties.disease[tweeksago];
            let new_infections = current_val - old_val;

            /*if (features[i].properties.name == "Murtal") {
                //console.log(features[i]);
                console.log(j + ": " + old_val + " ... " + current_val + " = " + new_infections);
            }*/

            new_infections = new_infections < 0 ? 0 : new_infections;
            // console.log(new_infections);
            if (!features[i].properties.newInfectionsArrayTrend) {
                features[i].properties.newInfectionsArrayTrend = [];
                // features[i].properties.trendarray = [];
            }
            features[i].properties.newInfectionsArrayTrend.push(new_infections); //warning: this cannot be retrieved from the features property on hover since mapbox turns in into a string
        }
    }
}

function calcTrendGradientForPair(oldA, nowB)
{
    let current_val = 1+ nowB;
    let old_val = 1+ oldA;
    let slope = current_val/old_val - 1; //b-a

    let theta = Math.atan2(slope, 1); // range (-PI, PI]
    theta *= -180 / Math.PI;
    return theta;
}

function getBevoelkerung(feature) {

    let iso = feature.properties.iso;
    if (WORLD) {
        iso = feature.properties.name;
    }
    var gesamtBevoelkerung = getDistrictInhabsByIso(iso);
    return gesamtBevoelkerung;
}

function calcSeverity(features, districtData) {
    features.forEach((feature) => {
        const newInfections = feature.properties.newInfections;
        let gesamtBevoelkerung = getBevoelkerung(feature);

        //GRÜN = 0 bis 0,99 positiv getesteten Fälle pro 10.000
        // GELB = 1 bis 9,99
        // ROT = 10+
        const infectionsPerHT = (newInfections / gesamtBevoelkerung) * 10000;
        //feature.properties.citicenRatio = newInfections / gesamtBevoelkerung; //todo incorporate in dashboard

        feature.properties.infectionsPerHT = infectionsPerHT.toFixed(1);
        if(infectionsPerHT >= 10) {
            feature.properties.severity = cred; //"red";
        } else if(infectionsPerHT >= 1) {
            feature.properties.severity = cyellow; //"yellow";
        }
        else {
            feature.properties.severity = cgreen; //"green";
        }
    });
}

function getDistrictInhabsByIso(iso) {

    const district = csv_table.find((district) => { return district[0] === iso; });
    var gesamtBevoelkerung = 0;
    if(district) {
        if (WORLD) {
            gesamtBevoelkerung = parseInt(district[4].replace(/,/g,""));
        } else {
            gesamtBevoelkerung = district[50];
        }
    } else {
        if (!WORLD) {
            // Handle vienna
            for (let i = 901; i <= 923; i++) {
                gesamtBevoelkerung += Number.parseInt((csv_table.find((district) => {
                    return district[0] === "" + i;
                }))[50]);
            }
        }
    }

    return gesamtBevoelkerung;
}

function calcTrendGradient(currFeat, timestep)
{
    // console.log(timestep);
    let dataprops = fileresult.features[currFeat.id].properties;
    // let today = dates[dates.length - 1]; //actually yesterday since today's count is not yet complete
    // let tweeksago = dates[dates.length - 15 ];

    //accessing 28+14 days into the past to compare the -28th with the -42nd day (part in brackets is between 0 and -28)
    let current_val = dataprops.newInfectionsArray[dataprops.newInfectionsArray.length - 1 + (timestep - (dataprops.newInfectionsArray.length-1))];
    let old_val = dataprops.newInfectionsArray[dataprops.newInfectionsArray.length - 15 + (timestep - (dataprops.newInfectionsArray.length-1))];
    // let new_infections = current_val/old_val - 1; //b-a

    let iso = dataprops.iso;

    if (WORLD) {
        iso = dataprops.name;
    }

    let gesamtBevoelkerung = getDistrictInhabsByIso(iso);
    let oldInfectionsPerHT = (old_val / gesamtBevoelkerung) * 10000;
    let newInfectionsPerHT = (current_val / gesamtBevoelkerung) * 10000;

    let m = (newInfectionsPerHT - oldInfectionsPerHT) ;/// 14; //b-a

    // let theta = Math.atan2(new_infections, 1); //range (-PI, PI]
    let theta = Math.atan(m); //range (-PI, PI]
    theta *= -180 / Math.PI;

    // console.log(theta);
    return theta;
}

function calcSlopeDegree(y1, y2, timesteps) {
    let m = (y2 - y1) / timesteps;

    let theta = Math.atan(m); //range (-PI, PI]
    theta *= -180 / Math.PI;

    return theta;
}



function updateArrow(id, angle) {
    if (!TREND_ENABLED) {
        return;
    }

    let arrow = document.getElementById(id);
    // console.log(angle + "°");

    if(isNaN(angle)){
        arrow.setAttribute("class", "hidden");
    } else {
        arrow.setAttribute("class", "");
    }
    // angle = angle * -1;
    if(arrow != null) {
        // arrow.style.transform = "translateX(-35px)" + "rotate("+ (angle % 360) +"deg)" + "translateX(35px)";
        arrow.style.transform = "rotate("+ (angle % 360) +"deg)";
        // arrow.style.transform = "translateX(35px)";

    }
}














