document.addEventListener('DOMContentLoaded', function() {
    d3.select('#info-overlay-close').on('click', hideInfoBox);

    var modals = document.querySelectorAll('.modal');
    M.Modal.init(modals, {
        onCloseEnd: function() {
            if(USECOOKIES) setCookie('disclaimer', 'showed', 30);
        }});

    var elems = document.querySelectorAll('.tooltipped');
    var instances = M.Tooltip.init(elems, {enterDelay: 100});

    if (TREND_ENABLED) {
        d3.select('#amp_radio').classed('visible', true);
    }

    // uncomment, once we have a disclaimer
    //showDisclaimer();

    // initHlp();
});

function showDisclaimer() {
    // if (getCookie('disclaimer') == "") {
    var elem = document.querySelector('#disclaimer-modal');

    if (WORLD) {
        elem = document.querySelector('#disclaimer-modal-global');
    }
    var modalInstance = M.Modal.getInstance(elem);

    modalInstance.open();
    // }
}

function showTimeline() {
    d3.select('#timelineSlider-container').classed('collapsed', false);
}

function hideTimeLine() {
    d3.select('#timelineSlider-container').classed('collapsed', true);

    setTimeout(function() {
        map.resize();
        // console.log("map resize");
    }, 500);
}

function createColorLegend(unitLabel, start, end, steps, tooltip = null) {
    var colorLegend = d3.select('#color_legend');

    colorLegend.selectAll("*").remove();

    if (unitLabel != null) {
        colorLegend.append('div').text(unitLabel)
            .attr("class", "legend-unit");
    }

    if (tooltip != null) {
        colorLegend.attr('data-tooltip', tooltip);
    } else {
        colorLegend.attr('data-tooltip', unitLabel);
    }

    var labelSteps = (end.value - start.value) / (steps - 1);

    var gradientWidth = 28*steps;
    var gradientHeight = 10;
    var colorGradient = colorLegend.append('div')
        .attr('class', "color-legend-gradient-container")
        .style('width', gradientWidth)
        .style('height', gradientHeight);

    createColorGradient(colorGradient.node(), start, end, 50, gradientWidth, gradientHeight-1);

    for (var i = 0; i < steps; i++) {
        var colorLegendItem = colorLegend.append('div')
            .attr('class', "color-legend-item")

        var displayValue = start.value + labelSteps * i;

        if (labelSteps >= 1) {
            displayValue = Math.floor(displayValue);
        } else {
            displayValue = displayValue.toLocaleString(lang, {maximumFractionDigits: 1});
        }

        colorLegendItem.append('div').text(displayValue)
            .attr("class", "legend-label");
    }

    colorLegend.style("display", "block");
}

function createColorGradient(container, start, end, steps, width, height)
{
    let colorscale = chroma.scale([start.color, end.color]).domain([start.value, end.value]).mode('lab');

    // var colorscale = col;
    var barPadding = -1;
    var w = width,
        h = height;

    var samples = createSamplesFromScale(steps, colorscale);
    colorscale.domain();

    var svg = d3.select(container).append("svg");
    svg.attr("width", width)
        .attr("height", height)
        .attr("class", "color-legend-gradient");
    var g = svg.append("g");

    //Create SVG element
    g.attr("width", w)
        .attr("height", h);

    g.selectAll("rect")
        .data(samples)
        .enter()
        .append("rect")
        .attr("x", function(d, i) {
            return i * (w / samples.length);
        })
        .attr("y", function(d) {
            return 0;
        })
        .attr("width", w / samples.length - barPadding)
        .attr("height", function(d) {
            return h;
        })
        .attr("fill", function(d) {
            return d.toString();
        });
}

function createSamplesFromScale(numSamples, scale)
{
    var samples = [];

    var dom = scale.domain ? scale.domain() : [0,1],
        dmin = Math.min(dom[0], dom[dom.length-1]),
        dmax = Math.max(dom[dom.length-1], dom[0]);

    for (var i=0; i<numSamples; i++)
    {
        samples.push(scale(dmin + i/numSamples * (dmax - dmin)));
    }

    return samples;
}

function createItemColorLegend(unitLabel, colorsAndLabels, tooltip = null) {
    /*****************
     *
     * *********
     * ***** */
    var colorLegend = d3.select('#color_legend');

    colorLegend.selectAll("*").remove();

    if (unitLabel != null) {
        colorLegend.append('div').text(unitLabel)
            .attr("class", "legend-unit");
    }

    if (tooltip != null) {
        colorLegend.attr('data-tooltip', tooltip);
    } else {
        colorLegend.attr('data-tooltip', unitLabel);
    }

    var isMobile = window.innerHeight < 800;
    var clDiv;

    if (isMobile) {
        clDiv = colorLegend.append('div');
    } else {
        clDiv = colorLegend.append('ul');
    }

    colorsAndLabels.forEach((cl) => {
        if (isMobile) {
            //const li = clDiv.insert('');
            clDiv.append('span')
                .attr("class", "color-legend-color mobile")
                .text(cl.label_short)
                .style('background-color', cl.color)
                .style('color', cl.label_short_color);
        } else {
            const li = clDiv.insert('li');
            li.append('span')
                .attr("class", "color-legend-color")
                .text(" ")
                .style('background-color', cl.color);
            li.append('span').text(cl.label).attr("class", "color-legend-label");
        }
    });

    //colorLegend.style("display", "block");
}

function showInfoBox(content) {
    setInfoBoxContent(content);
    d3.select('#info-overlay').style("right", "0px");//.classed('collapsed', false);

    initToolTips();
}

function setInfoBoxContent(content) {
    d3.select('#info-overlay div').html(content);

    initToolTips();
}

function hideInfoBox() {
    // console.log(getDivWidth('#info-overlay'));
    //d3.select('#info-overlay').classed('collapsed', true);
    //d3.select('#info-overlay').style("right", "-" + (getDivWidth('#info-overlay')  + 80)+ "px");
    d3.select('#info-overlay').style("right", "-580px");
}

function getDivWidth (div) {
    var width = d3.select(div)
        // get the width of div element
        .style('width')
        // take of 'px'
        .slice(0, -2);

    // return as an integer
    return Math.round(Number(width));
}

function initToolTips() {
    var oldTooltip = document.querySelectorAll('.material-tooltip');
    oldTooltip.forEach(function(el) {
        el.parentNode.removeChild(el);
    });

    var elems = document.querySelectorAll('.tooltipped');
    M.Tooltip.init(elems, {});
}