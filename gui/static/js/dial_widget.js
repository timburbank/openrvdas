/**********************************************************************
 options are optional options that change the look and feel of the chart.
 you can leave them out.

// sample spec with bare minimum to create working widget
{
    'widget': 'DASDialWidget',
    'angle': 'NBPPUSWindDir',
},

// sample spec with all available options set
{
    'name': 'dial_wind',
    'title': 'Wind Dial',
    'widget': 'DASDialWidget',
    'angle': 'NBPPUSWindDir',
    'options': {
        'magnitude': 'NBPPUSWindSpd',
        'top': 40,
        'left': 100,
        'title': 'Port Relative Wind',
        'title_size': 18,
        'title_color': '#b5b5b7',
        'title_unit': 'm/s',
        'height': 300,
        'width': 300,
        'tick_size': 24,
        'text_color': '#b5b5b7',
        'text_shadow': '#222',
        'line_color': '#f2b632',
        'line_thickness': 3,
        'circle_color_range': ['green','orange','firebrick','purple','deeppink'],
        'circle_color_domain': [2,12.5,20,30,45],
    }
},

***********************************************************************/
function DASDialWidget(widget_spec, num_of_widget){
    console.log('creating dial widget ' + num_of_widget);

    try{
        this.spec = widget_spec;
    }
    catch(e){
        console.error(e + '\nNo Widget Spec Defined');
    }
    
    // set unique values from our spec
    this.name = typeof this.spec.name !== 'undefined' ? this.spec.name + '_' + num_of_widget : 'dial_widget_' + num_of_widget;
    this.angle_field = this.spec.angle;
    
    // set options from spec
    this.options = typeof this.spec.options !== 'undefined' ? this.spec.options : {};
    this.mag_field = this.options.magnitude;
    this.height = typeof this.options.height !== 'undefined' ? this.options.height : 400;
    this.width = typeof this.options.width !== 'undefined' ? this.options.width : 400;
    this.tick_size = typeof this.options.tick_size !== 'undefined' ? this.options.tick_size : 24;
    this.text_color = typeof this.options.text_color !== 'undefined' ? this.options.text_color : '#b5b5b7';
    this.text_shadow = typeof this.options.text_shadow !== 'undefined' ? this.options.text_shadow : '#222';
    this.line_color = typeof this.options.line_color !== 'undefined' ? this.options.line_color : '#f2b632';
    this.line_thickness = typeof this.options.line_thickness !== 'undefined' ? this.options.line_thickness : 4;
    this.circle_color_range = typeof this.options.circle_color_range !== 'undefined' ? this.options.circle_color_range : ['#b5b5b7'];
    this.circle_color_domain = typeof this.options.circle_color_domain !== 'undefined' ? this.options.circle_color_domain : [0,100];
    this.left = typeof this.options.left !== 'undefined' ? this.options.left : '80';
    this.top = typeof this.options.top !== 'undefined' ? this.options.top : '80';
        
    this.angle = 0;
    this.last_angle = 0;
    this.magnitude = 0;
    this.duration = 1000;
    this.size = (this.width + this.height)/2;
    this.margin = 40;
    this.field_list = [this.angle_field, this.mag_field];
    
    DASWidget.call(this);
}

DASDialWidget.prototype = Object.create(DASWidget.prototype);
DASDialWidget.constructor = DASDialWidget;

DASDialWidget.prototype.init = function(){
    console.log('initializing ' + this.name);
    var margin = this.margin;
    var radius = Math.min(this.width, this.height) / 2 - this.margin * .5;
    var size = this.size;
    
    this.colorScale = d3.scaleLinear()
        .domain(this.circle_color_domain)
        .range(this.circle_color_range)
        .clamp(true);
    
    this.strokeScale = d3.scaleLinear()
        .domain([0,40])
        .range([0,60])
        .clamp(true);
    
    this.id = d3.select('#' + this.name);

    this.id.select('.panel-body')
        .append('svg')
        .styles({
            'height': (this.height + this.margin * 2) + 'px',
            'width': (this.width + this.margin * 2) + 'px'})
        .append('g');
    
    this.g = this.id.select('.panel-body')
        .select('svg')
        .select('g');
    
    this.g.append('circle');
    
    this.circle = this.g.select('circle');
    
    this.circle.attrs({
            'cx': this.size/2 + this.margin,
            'cy': this.size/2 + this.margin,
            'r': ((this.size + this.size)/2)/2.2 - this.margin * .5 - this.strokeScale(this.magnitude)*.5,})
        .styles({
            'fill': 'transparent',
            'stroke-width': this.line_thickness,
            'stroke':  (this.magnitude <= 0) ? this.circle_color_range[0] : this.colorScale(this.magnitude),});

    this.ga = this.g.append('g')
        .classed('a axis', true)
        .attrs({'transform': 'rotate(-90)', })
        .selectAll('g')
        .data(d3.range(0,360,90))
        .enter()
        .append('g')
        .attr('transform', function(d) { return 'translate(' + -(size/2 + margin + 10) + ', ' + (size/2 + margin + 5) + ') rotate(' + d + ')'; })

    this.ga.append('text')
        .attrs({
            'x': (radius + 6)})
        .styles({
            'text-anchor': function(d) { 
                if (d === 270){
                    return 'end';
                }
                else if (d === 0){
                    return 'middle';
                }
                else if (d === 180){
                    return 'middle';
                }
                else if (d === 90){
                    return 'middle';
                }
                return 'null';
            },
            'fill': this.text_color,
            'font-size': this.tick_size + 'px',
            'text-shadow': '0 2px ' + this.text_shadow,
            'opacity': 1})
        .attr('transform', function(d) { 
                if (d < 360 && d > 180){
                    return 'rotate(180 ' + (radius) + ',0)';
                }
                else if (d === 0){
                    return 'translate(0,-6) rotate(90 ' + (radius) + ',0)';
                }
                else if (d === 180){
                    return 'translate(0,6) rotate(-90 ' + (radius) + ',0)';
                }
                return null;
            })
        .text(function(d) { return d + '°'; });

    this.g.append('rect');
    this.rect = this.g.select('rect');
    this.rect.attrs({
        'x': this.size/2 + this.margin,
        'y': 0 + this.margin,
        'width': this.line_thickness,
        'height': this.size/2 - this.margin/2,})
        .styles({
            'fill': this.line_color,
            'stroke': '#222',
            'stroke-width': this.line_thickness/3,
            'transform-origin': 'top-left',
        });
}    

DASDialWidget.prototype.update = function(){
//    console.log('updating ' + this.name);
    if (this.mag_field in this.field_values){
        this.magnitude = parseFloat(this.field_values[this.mag_field]);
//        console.log(this.magnitude);
//        this.magnitude += 0.5
    }
    if (this.angle_field in this.field_values){
      this.angle = parseFloat(this.field_values[this.angle_field]);
//        console.log(this.angle);
//        this.angle += 2;
//          this.angle = parseFloat(Math.floor(Math.random() * (359 - 0 + 1) + 1));
    }
    this.theta = this.angle * 2 * Math.PI / 360;

    if (this.last_refresh < Date.now() - (this.refresh_rate * 1000)){
        this.draw();
    }
}

// draw function
// transition both the line and circle accordingly
DASDialWidget.prototype.draw = function(){
//    console.log('drawing ' + this.name);
    var angle = this.angle;
    var last_angle = this.last_angle;
    var offset = (this.size/2 + this.margin)
    this.rect.transition()
        .duration(this.duration)
        .attrTween('transform', tween);
    
    function tween(){
        if ((last_angle > 180 && angle <= 180) && (last_angle - angle > 180)){
            angle += 360;
        }
        else if ((last_angle < 180 && angle >= 180) && (angle - last_angle > 180)){
            angle -= 360;
        }
  
        return d3.interpolateString('rotate(' + last_angle + ', ' + offset + ', ' + offset + ')' , 'rotate(' + angle + ', ' + offset + ', ' + offset + ')');
    }

    this.last_angle = this.angle;
    
    this.circle.transition()
        .duration(this.duration)
        .ease(d3.easeLinear)
        .styles({
            'stroke':  this.colorScale(this.magnitude),
            'stroke-width': ((this.strokeScale(this.magnitude) < this.strokeScale(2)) ? this.strokeScale(2).toString() : this.strokeScale(this.magnitude)).toString(),})
        .attrs({
            'cx': this.size/2 + this.margin,
            'cy': this.size/2 + this.margin,
            'r': (((this.size + this.size)/2)/2.2 - this.margin * .5 - ((this.strokeScale(this.magnitude) < this.strokeScale(3)) ? this.strokeScale(2) : this.strokeScale(this.magnitude)) *.5),});

    this.last_refresh = Date.now();
}

/*
function DASDialWidget(dict){
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
        //get or set default values for optional specs
        this.options = typeof this.spec.options !== 'undefined' ? this.spec.options : {};
        this.height = typeof this.options['height'] !== 'undefined' ? this.options['height'] : 400;
        this.width = typeof this.options['width'] !== 'undefined' ? this.options['width'] : 400;
        this.y_label = typeof this.options['y_label'] !== 'undefined' ? this.options['y_label'] : '';
        this.y_unit = typeof this.options['y_unit'] !== 'undefined' ? this.options['y_unit'] : '';
        this.formula = typeof this.options['formula'] !== 'undefined' ? this.options['formula'] : '';
        this.interpolate = typeof this.options['interpolate'] !== 'undefined' ? this.options['interpolate'] : 'linear';
        this.label_size = typeof this.options['label_size'] !== 'undefined' ? this.options['label_size'] : 18;
        this.tick_size = typeof this.options['tick_size'] !== 'undefined' ? this.options['tick_size'] : 24;
        this.text_color = typeof this.options['text_color'] !== 'undefined' ? this.options['text_color'] : '#b5b5b7';
        this.text_shadow = typeof this.options['text_shadow'] !== 'undefined' ? this.options['text_shadow'] : '#222';
        this.line_color = typeof this.options['line_color'] !== 'undefined' ? this.options['line_color'] : '#f2b632';
        this.line_thickness = typeof this.options['line_thickness'] !== 'undefined' ? this.options['line_thickness'] : '3';
        this.tolerance = typeof this.options['tolerance'] !== 'undefined' ? this.options['tolerance'] : '2';
        this.update_interval = typeof this.options['update_interval'] !== 'undefined' ? this.options['update_interval'] : 2;
        this.left = typeof this.options['left'] !== 'undefined' ? this.options['left'] : '10';
        this.top = typeof this.options['top'] !== 'undefined' ? this.options['top'] : '80';
        this.transitions = typeof this.options['transitions'] !== 'undefined' ? this.options['transitions'] : 'off';
        
        this.mag_field = this.spec.magnitude;
        this.angle_field = this.spec.angle;
    	this.field_list = [this.angle_field, this.mag_field];
        
        // set a few default values
        this.angle = 0;
        this.magnitude = 0;
        this.edited = true;
        this.duration = 1000;
        this.size = (this.width + this.height)/2;
        this.margin = 40;
        var margin = this.margin;

        var id = d3.select('#' + this.name);
        var size = this.size;

        id.style({
                'position': 'absolute', 
                'left': (this.left - this.margin) + 'px', 
                'top': (this.top - this.margin) + 'px', 
                'border': '2px solid rgba(0,0,0,0)',
                'box-shadow': 'none',
                'width': (this.width + this.margin * 2) + 'px'})
            .attr('ondragstart', 'dragStart(event);')
            .select('.panel-body')
            .attr({
                'top': this.top + 'px',
                'left': this.left + 'px',
//                'transform': 'translate(0,'+ (-this.margin) + ');'
            })
            .style({
                'height': (this.height + this.margin * 2) + 'px',
                'width': (this.width + this.margin * 2) + 'px'})
            .append('svg')
            .style({
                'height': (this.height + this.margin * 2) + 'px',
                'width': (this.width + this.margin * 2) + 'px'})
            .append('g');
        
        var g = id.select('.panel-body')
            .select('svg')
            .select('g');
        
        g.append('circle');
        g.append('line');
        
        var circle = g.select('circle');
        var line = g.select('line');
        
        id.select('.panel-heading')
            .classed({
                'ylabel': true,
                'text-right': true})
            .style({
                'padding-right': this.margin + 'px', 
                'color': this.text_color,
                'font-size': this.label_size + 'px',
                'text-shadow': '0 2px ' + this.text_shadow,
                'height': (this.label_size + 10) + 'px' })
            .append('p')
            .classed('text-left', true)
            .style({
                'float': 'right', 
                'margin': '0px'})
            .text(this.y_label + '' + this.y_unit);

        circle.attr({
                'cx': this.size/2 + this.margin,
                'cy': this.size/2 + this.margin,
                'r': ((this.size + this.size)/2)/2.2 - this.margin * .5,})
            .style({
                'fill': 'transparent',
                'stroke-width': this.line_thickness,
                'stroke': this.text_color,});

        var radius = Math.min(this.width, this.height) / 2 - this.margin * .5;
        var ga = g.append('g')
            .classed('a axis', true)
            .attr('transform', 'rotate(-90)')
            .selectAll('g')
            .data(d3.range(0,360,90))
            .enter()
            .append('g')
            .attr('transform', function(d) { return 'translate(' + -(size/2 + margin + 10) + ', ' + (size/2 + margin + 5) + ') rotate(' + d + ')'; })

        ga.append('text')
            .attr({
                'x': (radius + 6)})
            .style({
                'text-anchor': function(d) { 
                    if (d === 270){
                        return 'end';
                    }
                    else if (d === 0){
                        return 'middle';
                    }
                    else if (d === 180){
                        return 'middle';
                    }
                    else if (d === 90){
                        return 'middle';
                    }
                    return 'null';
                },
                'fill': this.text_color,
                'font-size': this.tick_size + 'px',
                'text-shadow': '0 2px ' + this.text_shadow,
                'opacity': 1})
            .attr('transform', function(d) { 
                    if (d < 360 && d > 180){
                        return 'rotate(180 ' + (radius) + ',0)';
                    }
                    else if (d === 0){
                        return 'translate(0,-6) rotate(90 ' + (radius) + ',0)';
                    }
                    else if (d === 180){
                        return 'translate(0,6) rotate(-90 ' + (radius) + ',0)';
                    }
                    return null;
                })
            .text(function(d) { return d + '°'; })
        
        line.attr({
                'x1': this.size/2 + this.margin,
                'y1': this.size/2 + this.margin,
                'x2': this.size/2 + this.margin,
                'y2': 0 + this.margin})
            .style({
                'stroke': this.line_color,
                'stroke-width': this.line_thickness});
    }

    // get some data and do some cool widget animations!
    ///////////////////////////////////////////////////
    
    // update our variables from the dictionary
    if (this.mag_field in dict){
        this.magnitude = parseFloat(dict[this.mag_field]);   
    }
    if (this.angle_field in dict){
        this.angle = parseFloat(dict[this.angle_field]);
    }

    if (this.formula !== ''){
        console.log('formula: ' + this.formula);
        eval(this.formula);
    }


    var theta = this.angle * 2 * Math.PI / 360;

    var colorScale = d3.scaleLinear()
        .domain([0.50])
        .range([1,255])
        .clamp(true);
    
    var strokeScale = d3.scaleLinear()
        .domain([0,30])
        .range([1,50])
        .clamp(true);

    var circle = d3.select('#' + this.name)
        .select('.panel-body')
        .select('svg')
        .select('g')
        .select('circle');

    var line = d3.select('#' + this.name)
        .select('.panel-body')
        .select('svg')
        .select('g')
        .select('line');

    line.transition()
        .duration(this.duration)
        .attr({
                'x1': this.size/2 + this.margin,
                'y1': this.size/2 + this.margin,
                'x2': this.size/2 + this.size/2 * Math.sin(theta) + this.margin,
                'y2': this.size/2 - this.size/2 * Math.cos(theta) + this.margin});

    if (this.edited === true){
        circle.transition()
            .duration(this.duration/3)
            .attr({
                'cx': this.size/2 + this.margin,
                'cy': this.size/2 + this.margin,
                'r': ((this.size + this.size)/2)/2.2 - this.margin * .5,})
            .style({
                'fill': 'transparent',
                'stroke-width': this.line_thickness,
                'stroke': this.text_color,});
        line.transition()
            .duration(this.duration/3)
            .style({
                'stroke': this.line_color,
                'stroke-width': this.line_thickness});
        this.edited = false;
    }
}
*/
