/**********************************************************************
options are optional options that change the look and feel of the chart.
you can leave them out entirely.

Sample specs:
    {
        'widget': 'DASLineWidget',
        'fields': [ // fields can have 1 or more items
            {
                'field': 'NBPPUSWindSpd', // field to be monitored
                'line_color': '#14F6C6',  // color of the line being drawn. can be omitted, and will be randomly selected
            },
            {
                'field': 'NBPSUSWindSpd',
                'line_color': '#2288AB',
            },
        ],
        'options': {
            'time_frame': 60000,          // length of time to be displayed, in milliseconds
            'max_y': '150',               // max y value to plot
            'min_y': '90',                // min y value to plot
            'height': '400',              // height of the widget
            'width' : '800',              // width of the widget
            'left': '400',                // left position, in px
            'top' : '80',                 // top position, in px
            'curve': d3.curveBasis,       // line curve, leave as default or d3.curveBasis unless you know what they are and what you are doing
            'axis_color': 'tomato',       // the color of the x and y axes lines
            'line_thickness': '3',        // the thickness of ALL line elements
            'text_color': '#b5b5b7',      // the color of ALL text elements in the widget
            'text_size': '24',            // the size of ALL text elements on screen
            'tolerance': '.5',            // not implemented yet, but used for data array simplification algorithm
        }
    },

***********************************************************************/
// constructor
function DASLineWidget(widget_spec, num_of_widget){
    try{
        this.spec = widget_spec;
    }
    catch(e){
        console.error(e + '\nNo Widget Spec Defined');
    }

    // set unique values from our spec
    this.name = typeof this.spec.name !== 'undefined' ? this.spec.name : 'line_widget_' + num_of_widget;
    this.fields = this.spec.fields;
    console.log('creating line widget ' + this.name);

    // set options from spec
    this.options = typeof this.spec.options !== 'undefined' ? this.spec.options : {};
    this.max_y = typeof this.options.max_y !== 'undefined' ? parseFloat(this.options.max_y) : null;
    this.min_y = typeof this.options.min_y !== 'undefined' ? parseFloat(this.options.min_y) : null;

    this.height = typeof this.options.height !== 'undefined' ? parseFloat(this.options.height) : 400;
    this.width = typeof this.options.width !== 'undefined' ? parseFloat(this.options.width) : 800;
    this.time_frame = typeof this.options.time_frame !== 'undefined' ? parseFloat(this.options.time_frame) : 86400000;
    this.axis_color = typeof this.options.axis_color !== 'undefined' ? this.options.axis_color.toString() : '#a50f15';
    this.line_thickness = typeof this.options.line_thickness !== 'undefined' ? parseFloat(this.options.line_thickness) : 3;
    this.text_color = typeof this.options.text_color !== 'undefined' ? this.options.text_color.toString() : '#b5b5b7';
    this.tolerance = typeof this.options.tolerance !== 'undefined' ? parseFloat(this.options.tolerance) : 1/2;
    this.text_size = typeof this.options.text_size !== 'undefined' ? parseFloat(this.options.text_size) : 24;
    this.curve = typeof this.options.curve !== 'undefined' ? this.options.curve : d3.curveLinear;

    this.duration = 5000;
    this.duration_test = [];
    this.field_list = [];
    this.time = Date.now() + this.duration;

    var random_color = function(){
        return Math.floor(Math.random() * (255));
    };

    for(var d = 0; d < this.fields.length; d++){
        this.fields[d].field = typeof this.fields[d].field !== 'undefined' ? this.fields[d].field : '';
        this.fields[d].data = [];
        this.fields[d].line_color = typeof this.fields[d].line_color !== 'undefined' ? this.fields[d].line_color.toString() : d3.rgb(random_color(), random_color(), random_color()).toString();
        this.fields[d].last_refresh = Date.now();
        this.fields[d].duration =[Date.now()];
        this.field_list.push(this.fields[d].field + ':' + this.time_frame);
//        this.fields[d].line_selection = d3.select({});
//        this.fields[d].transition = d3.transition()
//            .duration(1000)
//            .ease(d3.easeLinear);
    }
    DASWidget.call(this);
}

DASLineWidget.prototype = Object.create(DASWidget.prototype);
DASLineWidget.constructor = DASLineWidget;

// initialization method
DASLineWidget.prototype.init = function(){
//    console.log('initializing ' + this.name);
    var self = this;

    // determine yMin, returning the min - 10%, rounded down or 0 (if no value is negative). 
    this.yMin = function(d){
        var min_val = null;
        var max_val = null;
        for (var a = 0; a < d.length; a++){
            var min = d3.min(d[a].data, function(d) { return parseFloat(d.y); }); 
            var max = d3.max(d[a].data, function(d) { return parseFloat(d.y); }); 
            if (min_val === null || min_val < min){
                min_val = min;
            }
            if (max_val === null || max_val > max){
                max_val = max;
            }
        }
        var range = max_val - min_val;
        min_val = min_val - (0.1 * range);

	/*
        if ((min_val >= 0) && ((min_val-min_val*(1/10)) <= 0)){
            min_val = 0;
        }
        else if (min_val < 0){
            min_val = Math.floor(min_val+min_val*(1/10));
        }
        else{
            min_val = Math.floor(min_val-min_val*(1/10));
        }
	*/
        // If they specified min_y, don't exceed it
	if (this.min_y !== null) {
	    min_val = Math.max(min_val, this.min_y);
        }
	return min_val;
    };

    this.yMax = function(d){
        var min_val = null;
        var max_val = null;
        for (var a = 0; a < d.length; a++){
            var min = d3.min(d[a].data, function(d) { return parseFloat(d.y); }); 
            var max = d3.max(d[a].data, function(d) { return parseFloat(d.y); }); 
            if (min_val === null || min_val < min){
                min_val = min;
            }
            if (max_val === null || max_val > max){
                max_val = max;
            }
        }
        var range = max_val - min_val;
        max_val = max_val + (0.1 * range);
	/*
        if ((max_val <= 0) && ((max_val+max_val*(1/10)) >= 0)){
            max_val = 0;
        }
        else if (max_val < 0){
            max_val = Math.ceil(max_val-max_val*(1/10));
        }
        else{
            max_val = Math.ceil(max_val+max_val*(1/10));
        }
	*/
        // If they specified min_y, don't exceed it
	if (this.max_y !== null) {
	    max_val = Math.min(max_val, this.max_y);
        }
	return max_val;
    };

//    this.xScale.domain([this.time - (parseInt(this.time_frame)) + this.duration * 3, this.time - this.duration * 2]);
    this.xScale = d3.scaleTime()
        .domain([this.time - (parseInt(this.time_frame)) + this.duration * 3, this.time - this.duration * 2])
//        .domain([this.time + this.duration, this.time + (this.duration * 2) - this.time_frame])
        .range([0, this.width - (this.margin * 2)]);

    this.yScale = d3.scaleLinear()
        .domain([this.yMin(this.fields), this.yMax(this.fields)])
        .range([this.height - (this.margin * 2),0])
        .clamp(true);

    this.yAxis = d3.axisRight(this.yScale)
        .ticks(4);

    this.xAxis = d3.axisBottom(this.xScale)
        .ticks(4);

    this.svg = this.id.select('.panel-body')
        .append('svg')
        .attrs({
            'height': this.height,
            'width': this.width, })
        .append('g');

    this.svg.append('g')
        .attrs({'transform': 'translate(0,' + (this.height - this.margin) + ')', })
        .classed('x axis', true);
    
    this.svg.append('g')
        .attrs({'transform': 'translate(' + (this.width - this.margin * 2) + ',' + (this.margin) + ')', })
        .classed('y axis', true);

    this.svg.append('defs')
        .append('clipPath')
        // .append('p') // comment out above clipPath and uncomment this to see where the lines are being drawn and removed.
        .attr('id','clip')
        .append('rect')
        .attrs({
            'width': (this.width - (this.margin * 2)),
            'height': (this.height - (this.margin * 2)),
            'transform': 'translate(-1.5, 29)'});
    
    this.g = this.id.selectAll('svg')
        .select('g');

    for(var n = 0; n < this.fields.length; n++){
        this.svg.append('g')
            .attr('clip-path', 'url(#clip)')
            .classed('line_'+n,true)
            .append('path')
            .classed('line', true)
            .styles({
                'stroke-opacity': '1',
                'fill': 'none',
                'stroke-width': this.line_thickness.toString(),
                'stroke': this.fields[n].line_color.toString(), })
            .attr('id', 'line_' + n);
    }
    
    this.line = d3.line()
        .x(function(d) { return self.xScale(d.x); })
        .y(function(d) { return self.yScale(d.y); })
        .curve(this.curve);
};

// data update method
DASLineWidget.prototype.update = function(){
    // go through each field and check for updates
    for(var i = 0; i < this.fields.length; i++){
        // console.log(this.fields[i].data.length);
        // did we get an update for this field?
	var field = this.fields[i].field;
	var f_len = this.fields[i].data.length;
        if (field in this.field_values){
            if ((f_len !== 0) &&
		(this.field_times[field] === this.fields[i].data[f_len-1].x) && 
		(this.field_values[field] === this.fields[i].data[f_len-1].y)){
             // console.log('1: ' + this.field_times[this.fields[i].field] + '\n2: ' + this.fields[i].data[this.fields[i].data.length - 1].x + '\ndata1: ' + this.field_values[this.fields[i].field] + '\ndata2: ' + this.fields[i].data[this.fields[i].data.length - 1].y);
                continue;
            }
	    var field_values = this.field_values[field];
	    var field_times = this.field_times[field];

	    // Have we been given a single value or a list? If a single value
	    // throw it into a list to simplify code below
	    if (field_values.constructor !== [].constructor) {
		field_values = [field_values];
		field_times = [field_times];
            }
	    // Iterate, pushing values and timestamps onto field data list
            var num_values = field_values.length;
            var num_times = field_times.length;
            if (num_values !== field_times.length) {
		console.error('Mismatched field_values and field_times list ' +
			      'lengths: ' + num_values + ' !== ' + num_times);
	    }
  	    console.log('pushing ' + num_values + ' values into widget');
	    for (var j = 0; j < num_values; j++) {
		var field_value = parseFloat(field_values[j]);
		var field_time = parseInt(field_times[j]);
		this.fields[i].data.push({'x': field_time, 'y': field_value});
		this.time = field_time;
		this.fields[i].duration.push(Date.now());
		if (this.fields[i].duration.length >= 2){
                    this.duration_test.push(this.fields[i].duration[1] - this.fields[i].duration[0]);
                    this.fields[i].duration.shift();
		}
	    }
            // console.log('time: ' + this.time);
        }
    }
    
    this.duration = parseInt(d3.max(this.duration_test));
        if (this.duration_test.length > 9){
            this.duration_test.shift();
    }
    
    this.draw();
};

// draw method
DASLineWidget.prototype.draw = function(){
//    console.log('draw');
    for (var t = 0; t < this.fields.length; t++){
        if (this.fields[t].data.length < 3){
            continue;
        }
        
        if ((this.fields[t].last_refresh + this.duration * (5/10)) > this.fields[t].data[this.fields[t].data.length -1].x){
            this.fields[t].last_refresh = this.fields[t].data[this.fields[t].data.length -1].x;
            continue;
        }

        this.xScale.domain([this.time - (parseInt(this.time_frame)) + this.duration * 3, this.time - this.duration * 2]);
        this.yScale.domain([this.yMin(this.fields), this.yMax(this.fields)]);
        this.xAxis = d3.axisBottom(this.xScale)
            .ticks(4);

        var x = this.xScale.range()[1]/((parseInt(this.time_frame) - this.duration * 5)/this.duration);
        
        this.fields[t].line_selection = d3.select('#' + this.name)
            .select('.panel-body')
            .select('svg')
            .select('g')
            .select('.line_' + t)
            .select('#line_' + t);

        this.fields[t].line_selection.datum(this.fields[t].data);
        
        this.fields[t].line_selection.interrupt()
            .transition()
            .duration(this.duration)
            .ease(d3.easeLinear)
            .attr('transform', 'translate(' + (-x) + ',' + this.margin + ')');

        this.fields[t].last_refresh = this.fields[t].data[this.fields[t].data.length -1].x;
        
        if ((this.fields[t].data[0].x) < (this.time - parseInt(this.time_frame))){
            this.fields[t].data.shift();
        }
        
        this.fields[t].line_selection.attr('d', this.line)
            .attr('transform', 'translate(0,' + this.margin + ')');
    }
    
//    this.xScale.domain([this.time - (parseInt(this.time_frame)) + this.duration * 3, this.time - this.duration * 2]);
//    this.yScale.domain([this.yMin(this.fields), this.yMax(this.fields)]);
//    this.xAxis = d3.axisBottom(this.xScale)
//        .ticks(4);

    this.g.select('.x.axis')
        .transition()
        .duration(this.duration)
        .ease(d3.easeLinear)
        .call(this.xAxis);

    this.g.select('.y.axis')
        .transition()
        .duration(this.duration)
        .ease(d3.easeLinear)
        .call(this.yAxis);

    this.g.selectAll('.tick')
        .select('text')
        .styles({
            'text-shadow': '0 2px #222',
            'fill': this.text_color,
            'font-size': this.text_size + 'px',
        });

    this.g.selectAll('.axis')
        .selectAll('line')
        .styles({
            'stroke': this.axis_color,
            'fill': 'none',
            'stroke-width': this.line_thickness,
            'stroke-opacity': 1,
        });

    this.g.selectAll('.axis')
        .selectAll('path')
        .styles({
            'stroke': this.axis_color,
            'fill': 'none',
            'stroke-width': this.line_thickness,
        });
};
