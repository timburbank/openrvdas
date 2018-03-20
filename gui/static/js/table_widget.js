/**********************************************************************
 options are optional options that change the look and feel of the chart.
 you can leave them out.

// sample spec with bare minimum to create working widget
{
    'widget': 'DASTableWidget',
    'fields': [
        {
            'field': 'NBPs330Lat',
        },
    ],
},

// sample spec with all available options set
{
    'name': 'table_wind',
    'widget': 'DASTableWidget',
    'fields': [
        {
            'field': 'NBPPUSWindSpd',
            'label': 'Port Relative Wind Speed',
            'max': false,
        },
        {
            'field': 'NBPSUSWindSpd',
            'label': 'Stbd Relative Wind Speed',
            'max': false,
        },
    ],
    'options': {
        'title': 'Port Relative Wind',
        'title_size': 18,
        'title_color': '#b5b5b7',
        'title_unit': 'degrees',
        'width': 300,
        'height': 300,
        'top': 40,
        'left': 100,
        'text_field_color': '#b5b5b7',
        'text_value_color': 'yellowgreen',
        'text_shadow': '#222',
    }
},

***********************************************************************/
function DASTableWidget(widget_spec, num_of_widget){
    
    try{
        this.spec = widget_spec;
    }
    catch(e){
        console.error(e + '\nNo Widget Spec Defined');
    }
    
    // set unique values from our spec
    this.name = typeof this.spec.name !== 'undefined' ? this.spec.name : 'line_widget_' + num_of_widget;
    this.fields = this.spec.fields;
    console.log('creating table widget: ' + this.name);
    
    // set options from spec
    this.options = typeof this.spec.options !== 'undefined' ? this.spec.options : {};
    this.text_size = typeof this.options.text_size !== 'undefined' ? parseInt(this.options.text_size) : 24;
    this.text_field_color = typeof this.options.text_field_color !== 'undefined' ? this.options.text_field_color : '#b5b5b7';
    this.text_value_color = typeof this.options.text_value_color !== 'undefined' ? this.options.text_value_color : 'yellowgreen';
    this.text_shadow = typeof this.options.text_shadow !== 'undefined' ? this.options.text_shadow : '#222';
        
    this.duration = 1000;
    this.refresh_rate = 1;
    this.field_list = [];

    // since the table widget doesnt get it's field_list definition in the spec, we have to create it here
    // we also set some default values for the fields if they werent set
    for(d = 0; d < this.fields.length; d++){
        this.fields[d].label = typeof this.fields[d].label !== 'undefined' ? this.fields[d].label : '';
        this.fields[d].field = typeof this.fields[d].field !== 'undefined' ? this.fields[d].field : '';
        this.fields[d].unit = typeof this.fields[d].unit !== 'undefined' ? this.fields[d].unit : '';
        this.fields[d].max = typeof this.fields[d].max !== 'undefined' ? this.fields[d].max : 'false';
        this.fields[d].precision = typeof this.fields[d].precision !== 'undefined' ? this.fields[d].precision : 2;
        this.fields[d].value = 0;
        this.field_list.push(this.fields[d].field);
    }
    
    DASWidget.call(this);
}

DASTableWidget.prototype = Object.create(DASWidget.prototype);
DASTableWidget.constructor = DASTableWidget;

// setup the widget specific elements
DASTableWidget.prototype.init = function(){
//    console.log('initializing ' + this.name);
    this.id = d3.select('#' + this.name);

    // create our table
    this.id.select('.panel-body')
        .append('div')
        .classed('table', true)
        .styles({
            'width': 'auto',
            'display': 'table',
            'table-layout': 'fixed',});
    
    this.table = this.id.select('.table');
    
    // create our table rows, create our first table-cell
    // set its class to field
    // apply some style
    this.tr = this.table.selectAll('div')
        .data(this.fields)
        .enter()
        .append('div')
        .attrs({'id': function(d){return d.field;}, })
        .classed('table', true)
        .styles({'display': 'table', })
        .append('div')
        .classed('table-row', true)
        .styles({
            'margin': '0',
            'float': 'none',
        })
        .append('div')
        .styles({'table-layout': 'auto',})
        .classed('table-cell', true)
        .attrs({
            'id': 'field',})
        .styles({
            'float': 'inline-start',
            'position': 'sticky',
            'display': 'table-cell',
            'text-align': 'right',
            'color': this.text_field_color, 
            'background-color': 'transparent',
            'padding': '0em .5em 0em 0em',
            'font-size': this.text_size + 'px',
            'font-weight': 'normal',})
        .text(function(d){ return d.label; });
    
    // select our table rows, add our second table cell
    // set its class to value
    // apply some style
    this.tr = this.table.selectAll('.table-row')  
        .data(this.fields)
        .append('div')
        .classed('table-cell', true)
        .attrs({
            'id': 'value',})
        .styles({
            'display': 'table-cell',
            'position': 'sticky',
            'color': 'tomato',
            'background-color': 'transparent',
            'margin': '0',
            'padding': '0em .3em 0em 0em',
            'font-size': this.text_size + 'px',
            'font-weight': 'bolder',})
        .text(function(d) { return d.field; });
    
    // setup or final table cell
    this.tr = this.table.selectAll('.table-row')
        .data(this.fields)
        .append('div')
        .classed('table-cell', true)
        .attrs({
            'id': 'unit',})
        .styles({
            'display': 'table-cell',
            'position': 'sticky',
            'float': 'inline-end',
            'color': this.text_field_color, 
            'background-color': 'transparent',
            'margin': '0',
            'font-size': this.text_size + 'px',
            'font-weight': 'normal',})
        .text(function(d,i) {
            return d.unit;});
}    

// update the data set
DASTableWidget.prototype.update = function(){
//    console.log('updating ' + this.name);
    for(i=0; i < this.fields.length; i++){
        // did we get an update for this field?
        if (this.fields[i].field in this.field_values){
            // do we only want the max value?
            if (this.fields[i].max === 'true'){
                // is this bigger than our current max? if not, continue on to the next loop iteration
                if (parseFloat(this.field_values[this.fields[i].field]) < this.fields[i].value){
                    continue;
                }
                this.fields[i].value = parseFloat(this.field_values[this.fields[i].field]);
            }
            this.fields[i].value = parseFloat(this.field_values[this.fields[i].field]);
        }
    }
    // should we draw?
    if (this.last_refresh < Date.now() - (this.refresh_rate * 1000)){
        this.draw();
    }
}

// change the screen
DASTableWidget.prototype.draw = function(){
//    console.log('drawing ' + this.name);
    // this is an important variable.
    // d3 allows specifying a key (which can be a function) when we join data to selections
    // in other widgets, this is used to only update changed objects. this can also be used to
    // ensure that we update the correct field, so direction doesnt end up in the speed spot.
    // it's unlikely to happen since our data set order remains the same, but it could conceivably 
    // have it's order changed.
    var field = function(d){ 
        return d.field;
    }

    // so we know when to draw again
    this.last_refresh = Date.now();
    
    // select and replace our data values
    this.table.selectAll('.table-row')
        .data(this.fields, field)
        .select('#value')
        .styles({
            'color': this.text_value_color, 
            'font-size': this.text_size + 'px',
            'font-weight': 'bolder',})
        .text(function(d){ return d.value.toFixed([d.precision]); });
    
}
