/**********************************************************************
 options are optional options that change the look and feel of the chart.
 you can leave them out, but options must not be removed.

Sample specs:
{
    'name': 'windspeed_scatter',
    'title': 'Scatter Wind',
    'widget': 'DASScatterPlot',
    'x': 'time',
    'y': 'NBPPUSWindDir',
    'options': {
        'height': 225,
        'width': 800,
        'y_label': 'Wind Direction in ',
        'y_unit': 'degrees',
        'interpolate': 'linear',
        'label_size': 'h3',
        'tick_size': 'h3',
        'top': 625,
        'left': 120,
        'tolerance': '5',
        'transitions': 'off',
        'update_interval': 10,
        'yMin': 0,
        'yMax': 360,
    }
},


***********************************************************************/
function DASScatterPlot(dict){
    // we need to create our div for the widget to live in
    // we decided to go with bootstrap panels here. we can put the main content in the body,
    // and still have a heading section for editing and titles
    // we could add a footer in the future if we wanted.
    if (d3.select('#' + this.name)[0][0] === null) {
        d3.select('.container-content')
            .append('div')
            .attr('class', 'panel')
            .attr('id', this.name)
            .append('div')
            .attr('class', 'panel-heading');

        d3.select('#' + this.name)
            .append('div')
            .attr('class', 'panel-body');
    }
    
    // if called without data, assume first time through
    // draw widget with default values or passed optional values
    if (DASWidget.dictIsEmpty(dict)) {
        this.line_key = this.spec.y;
        this.time_key = this.spec.x;
        
        // set a few default values
        this.time = 0;
        this.timeFormat = "%j:%H:%M:%S";
        this.margin = 30;
        this.data = [{x:0, y:0}];
        this.startTime = Date.now();
        this.line = 0;
        this.timeFrame = 86400000;
    	this.field_list = [ this.line_key];
        this.simplifyLCV = [{x:Date.now(), y:0}, {x:Date.now(), y:0}];
        this.duration = 1000;
        
        //get or set default values for optional specs
        this.options = typeof this.spec.options !== 'undefined' ? this.spec.options : {};
        this.height = typeof this.options['height'] !== 'undefined' ? this.options['height'] : 400;
        this.width = typeof this.options['width'] !== 'undefined' ? this.options['width'] : 800;
        this.y_label = typeof this.options['y_label'] !== 'undefined' ? this.options['y_label'] : '';
        this.y_unit = typeof this.options['y_unit'] !== 'undefined' ? this.options['y_unit'] : '';
        this.y_scale = typeof this.options['y_scale'] !== 'undefined' ? this.options['y_scale'] : 'undefined';
        this.formula = typeof this.options['formula'] !== 'undefined' ? this.options['formula'] : '';
        this.interpolate = typeof this.options['interpolate'] !== 'undefined' ? this.options['interpolate'] : 'linear';
        this.label_size = typeof this.options['label_size'] !== 'undefined' ? this.options['label_size'] : 'h4';
        this.tick_size = typeof this.options['tick_size'] !== 'undefined' ? this.options['tick_size'] : 'h4';
        this.text_color = typeof this.options['text_color'] !== 'undefined' ? this.options['text_color'] : '#b5b5b7';
        this.text_shadow = typeof this.options['text_shadow'] !== 'undefined' ? this.options['text_shadow'] : '#222';
        this.line_color = typeof this.options['line_color'] !== 'undefined' ? this.options['line_color'] : '#f2b632';
        this.line_thickness = typeof this.options['line_thickness'] !== 'undefined' ? this.options['line_thickness'] : '3';
        this.update_interval = typeof this.options['update_interval'] !== 'undefined' ? this.options['update_interval'] : 10;
        this.tolerance = typeof this.options['tolerance'] !== 'undefined' ? this.options['tolerance'] : this.update_interval;
        this.left = typeof this.options['left'] !== 'undefined' ? this.options['left'] : '10';
        this.top = typeof this.options['top'] !== 'undefined' ? this.options['top'] : '80';
        this.transitions = typeof this.options['transitions'] !== 'undefined' ? this.options['transitions'] : 'off';
        this.yMin = typeof this.options['yMin'] !== 'undefined' ? this.options['yMin'] : '';
        this.yMax = typeof this.options['yMax'] !== 'undefined' ? this.options['yMax'] : '';

        // define our svg and group elements, assigning some style to it, and setting it as a variable we can reference
        var svg = d3.select('#' + this.name)
            .attr('style', 'position: absolute; left:' + this.left + 'px; top:' + this.top + 'px; border:2px solid rgba(0,0,0,0); box-shadow:none;')
            .attr('ondragstart', 'dragStart(event);')
            .select('.panel-body')
            .append('svg')
            .attr('height', this.height)
            .attr('width', this.width)
            .append('g');

        // create a default x scale
        var xScale = d3.scaleTime()
            .domain([Date.now() + (this.update_interval * 1000), Date.now()]) 
//            .domain([Date.now() - 86400000,Date.now()]) 
            .range([this.width - (this.margin * 4),0]);
        
        // create a default y scale
        var yScale = d3.scaleLinear()
            .range([this.height - (this.margin * 1.25),0])
            .domain(this.y_scale !== 'undefined' ? [this.y_scale[0], this.y_scale[this.y_scale.length-1]] : [0,100]);
        
        // define a default y axis
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .tickValues(this.y_scale !== 'undefined' ? this.y_scale : null)
            .tickFormat(d3.format(',.0f'))
            .orient('right')
            .ticks(6);
//            .orient('left');
        
        // define a default x axis
        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
            .ticks(4);
        
        // create and move x axis to its final position
        svg.append('g')
            .attr('class', 'x axis')
//            .attr('transform', 'translate(100,' + (height-(margin*2)) + ')')
            .attr('transform', 'translate('+ (this.margin * .5) + ',' + (this.height - this.margin) + ')')
            .attr('fill', this.text_color)
            .call(xAxis);
       
        // stylize the x axis    
        svg.selectAll('.x.axis')
            .select('path')
            .attr('style', 'stroke:' + this.text_color + ';fill:none;stroke-width:' + this.line_thickness + ';');
        
        // create and move y axis to its final position
        svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate('+ (this.width - this.margin * 3.5) + ',' + (this.margin * .25) + ')')
//            .attr('transform', 'translate(100)')
            .attr('fill', this.text_color)
            .call(yAxis)
            .append('text')
            .select('.panel-body')
            .append('svg')
            .append('g');

        // stylize the y axis
        svg.selectAll('.y.axis')
            .select('path')
            .attr('style', 'stroke:' + this.text_color + '; fill:none; stroke-width:' + this.line_thickness + ';');
        
        // add any labels and label units to the panel heading along with their styles
        d3.select('#' + this.name)
            .select('.panel-heading')
//            .attr('transform', 'rotate(-90)')
//            .attr('dx', -(this.margin * 5))
//            .attr('dy', -(this.height * .5) + (this.margin * 3))
            .attr('class', this.label_size + ' panel-heading ylabel text-right')
            .attr('style', 'padding-right:' + this.margin + 'px; color:' + this.text_color + '; text-shadow:0 2px ' + this.text_shadow + ';')
//            .attr('fill', this.text_color)
//            .attr('style', 'text-shadow:0 2px ' + this.text_shadow + ';')
            .append('p')
            .attr('class', 'text-left')
            .attr('style', 'float: right; margin: 0px;')
            .text(this.y_label + '' + this.y_unit);

        // append a dot for the dots to live in
        svg.append('dot')
            .attr('class', 'dot');
            
        // stylize the axis ticks
        svg.selectAll('.tick')
            .select('text')
            .attr('style', 'text-shadow:0 2px ' + this.text_shadow + ';')
            .attr('class', this.tick_size);
    }
    //////////////////////////////////////////
    // if the dict is not empty, we assume it's the update step
    else {  
        // define any default values we need here

        // Update variables from dict.
        if (this.line_key in dict) {
            this.line = dict[this.line_key];
            this.time = dict[this.time_key];
            // if we are on the first run through, we want to remove the 0 value (needed to keep things happy)
            if (this.time !== this.data[this.data.length-1].x){
                if (this.data[0].x === 0){
                    this.data.shift();
                }
                // add our new data to the data array
                this.data.push({'x':this.time, 'y':parseFloat(this.line)});
            }
        }
        this.update_interval = this.data.length * .1;
        

/*      // allows data to be converted on the fly to other values using formuals
        // this is dangerous because you could inject malicious code here
        // that being said, you can use complex formulas with variables in the spec
        // just have properly formatted javascript
        if (this.formula !== ''){
            console.log('formula: ' + this.formula);
            console.log('test calc: ' + this.dataMap[this.dataMap.length -1].y + this.formula);
            var tmp = this.dataMap[this.dataMap.length -1].y + this.formula
            console.log('eval: ' + eval(tmp.valueOf()));
            this.dataMap[this.dataMap.length-1].y = eval(tmp.valueOf());
        }
*/
        
        // shifts the start time once we've reached our timeframe
        // then shift data points off the front of the data array until we are within our timefram
        if ((this.startTime + this.timeFrame) < this.time){
            this.startTime = this.time - this.timeFrame;
            for(i=0; i < this.data.length;i++){
                if (this.data[i].x + this.timeFrame < this.time){
                    this.data.shift();
                    console.log('shifted data');
                    this.simplifyLCV[0].y -= 1;
                }
                else{
                    break;
                }
            }
        }
        
        // if more than 10 minutes go by before we receive our first chunk of data, shift the start time
        // the idea here is if the winch gets shut off, and turned back on, we want to start over
        // the logic is not correct here, and needs to be fixed.
        if ((this.data[0].x - 600000) > Date.now()){
            this.startTime = this.dataMap[0].x;
            console.log('reset starttime');
        }
        
        // determine yMin, returning the min - 10%, rounded down or 0 (if no value is negative).
        var yMin = function(d,v){
            if (v !== ''){
                return v;
            }
            var tmp = d3.min(d, function(d) {return d.y; });
            if ((tmp >= 0) && ((tmp-tmp*.1) <= 0)){
                return 0;
            }
            else if (tmp < 0){
                return Math.floor(tmp+tmp*.1);
            }
            else{
                return Math.floor(tmp-tmp*.1);
            }
        }

        // determine yMax, returning the max + 10%, rounded up or 0 (if no value is positive).
        var yMax = function(d,v){
            if (v !== ''){
                return v;
            }
            var tmp = d3.max(d, function(d) {return d.y; });
            if ((tmp <= 0) && ((tmp+tmp*.1) >= 0)){
                return 0;
            }
            else if (tmp < 0){
                return Math.ceil(tmp-tmp*.1);
            }
            else{
                return Math.ceil(tmp+tmp*.1);
            }
        }

        // update the x axis scale
        var xScale = d3.scaleTime()
            .domain([Date.now(),this.startTime])
            //.domain([this.startTime, Date.now()])
            .range([this.width - (this.margin * 4),0])
            .clamp(true);

        // update the y axis scale
        var yScale = d3.scaleLinear()
            .range([this.height - (this.margin * 1.25),0])
            .domain(this.y_scale !== 'undefined' ? [this.y_scale[0], this.y_scale[this.y_scale.length-1]] : [yMin(this.data, this.yMin), yMax(this.data, this.yMax)])
            .clamp(true);
        
        // update the y axis
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .tickValues(this.y_scale !== 'undefined' ? this.y_scale : null)
//            .orient('left')
            .orient('right')
            .ticks(6);

        // update the x axis
        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
            .ticks(4);

        // select our svg and group
        var g = d3.select('#' + this.name)
            .select('svg')
            .select('g');

        // data simplification and drawing step
        // we determine the frequency of this by the update_interval (and multiply by 1000 to take seconds to ms)
        if (this.simplifyLCV[0].x < Date.now() - (this.update_interval * 1000)){
            // set position 0 of the simplifyLCV array's x and y position so we know what our delta data is.
            // this gives us the opportunity to have additional simplification in the future with more than on delta data.
            // we set time (x) and array position (y)
            this.simplifyLCV[0].x = this.data[this.data.length -1].x
            this.simplifyLCV[0].y = this.simplifyLCV[0].y;

            var datatemp = [{}];
            var num_reduce = this.data.length - this.simplifyLCV[0].y;
            var margin = this.margin;
            
            datatemp.pop();
            
            // move all new data from the data array into a temp array, removing it from data.
            for(i=0; i < num_reduce; i++){
                datatemp.push({'x':this.data[this.data.length -1].x, 'y':this.data[this.data.length -1].y});
                this.data.pop();
            }

            // reverse the temp array
            datatemp.reverse();

            // simplify the temp array using simplify.js (Douglas-Peucker algorithm)
            datatemp = simplify(datatemp, this.tolerance);

            // push all the simplified data back into the main data array
            for (i=0; i < datatemp.length; i++){
                this.data.push({'x': datatemp[i].x, 'y': datatemp[i].y});
            }

            // set our simplifyLCV array to the new array lengths so we know where to start from
            this.simplifyLCV[0].x = this.simplifyLCV[0].x;
            this.simplifyLCV[0].y = this.data.length -1;
            
//            console.log(this.name + ' - data length: ' + this.data.length);
            // since you dont need to plot 20000+ points, we do an additional simplification every 100 points.
            // this has the effect of making the data more averaged further back through time
            if (this.data.length > this.simplifyLCV[1].y + 100) {
                this.simplifyLCV[1].x = this.data[this.data.length -1].x
                console.log('hit major reduction\ndata length: ' + this.data.length);
                this.data = simplify(this.data, (Math.log(this.data.length) + this.tolerance));
                this.simplifyLCV[1].y = this.data.length -1;
                console.log('data length: ' + this.data.length + '\nnext major reduction: ' + (this.simplifyLCV[1].y + 100));
            }


            // drawing step
            // determine if transition are 'on' or 'off'
            // if they are off, remove the old dots, pop the new ones in.
            if (this.transitions !== 'on'){
                g.selectAll('.dot').remove();
                var dot = g.selectAll('.dot')
                    .data(this.data, function(d){
                        if (typeof d !== 'undefined'){
                            return d.x;
                        }
                    })
                    .enter()
                    .append('circle')
                    .attr('class', 'dot')
                    .attr('r', 2)
                    .attr('cy', function(d){ return yScale(d.y) + (margin * .25);})
                    .attr('cx', function(d){ return xScale(d.x) + (margin * .5);})
                    .attr('style', 'fill:' + this.line_color + ';');
            }

            // if transitions are on, lets add and remove dots nice and smoothly. shiny!
            else{

                // select only the dots that need to be moved
                var dot = g.selectAll('.dot')
                    .data(this.data, function(d) {
                        if (typeof d !== 'undefined'){
                            return d.x;
                        }
                    });
                
                // move the dots
                dot.transition()
                    .duration(this.duration)
                    .attr('cy', function(d){ return yScale(d.y) + (margin * .25); })
                    .attr('cx', function(d){ return xScale(d.x) + (margin * .5); });
                
                // add the new dots, fading them in
                dot.enter()
                    .append('circle')
                    .attr('class', 'dot')
                    .attr('r', 2)
                    .attr('cy', function(d){ return yScale(d.y) + (margin * .25); })
                    .attr('cx', function(d){ return xScale(d.x) + (margin * .5);})
                    .attr('style', 'fill-opacity: 0; fill:' + this.line_color + ';')
                    .transition(this.duration)
                    .style('fill-opacity', 1);

                // cleanup
                dot.exit()
                    .transition()
                    .duration(this.duration)
                    .style('fill-opacity', 0)
                    .remove();
            }

            // regardless of transistions being on or off, we smoothly update the x and y axis
            // this helps the end user perceive a smoother update at a very small computational cost
            g.selectAll('.y.axis')
                .transition()
                .duration(this.duration)
                .call(yAxis);

            g.selectAll('.x.axis')
                .transition()
                .duration(this.duration)
                .call(xAxis);
        }
        
        // finally, we want to ensure that the ticks on both axes have the appropriate colors and sizes.
        g.selectAll('.tick')
            .select('text')
            .attr('style', 'text-shadow:0 2px ' + this.text_shadow + ';')
            .attr('class', this.tick_size);
    }
}
