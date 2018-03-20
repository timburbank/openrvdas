/**********************************************************************
//TODO: UPDATE ME!!!


   Draft form of JS widgets to display various charts. Apologies to
   future generations who have to deal with this code...
  
   API
   ===

   The DASWidget API has been kept as minimal as possible for
   flexibility: the widget constructor takes an associative array (a
   widget_spec) with just two required fields:
  
     name: a string that identifies the <div id='name'> on the target
           page where the widget will get rendered.
     widget: the name of the function that will be invoked to render
          the widget.
  
   The widget rendering code (see, e.g. the definition for
   DASDialWidget in dial_widget.js) has a few more requirements. It
   will first be called with an empty associative array as its only
   parameter, as a signal to initialize itself. To do so, it will have
   access to the widget base class as "this", and the widget_spec as
   "this.spec".

   As part of its initialization, it must make available an array of
   DASField values (e.g. NBPSUSWindDir) it requests in the method
   variable this.field_list, e.g.

      this.field_list = 'NBPPUSWindDir,NBPPUSWindSpd'.split(',');

   On subsequent invocations, it will called with an associative array
   containing (possibly a subset) of the requested DASFields:

    {
       DASRecordName1: value1,
       DASRecordName2: value2,
        ...
    }

   (In practice, the array will be a reference to the enclosing
   DASWidget's array this.field_values. There is also
   this.field_times, which records the timestamp of the most recent
   received value for that field.)

   The widget should search the DOM for <div id='name'> and render all
   its results inside that div.

   CONTROL FLOW
   ============

   Once a widget has been initialized, it calls its getData()
   method. For each field in this.field_list, getData looks up the
   time of its last update in this.field_times and prepends it onto
   the field name, then concatenates all requested fields into a
   string, which it posts as the content of an asynchronous
   XMLHTTPRequest to the server's /listen url:

       1431848498434:NBPSUSWindSpd,1431848498434:NBPSUSWindDir

   When a response is received, it calls the instance's
   handleResponse() method. The response will be a JSON-encoded
   associative array containing all fields that have changed more
   recently than the passed timestamps (If no fields have changed,
   /listen will block and wait until at least one has before
   returning.)

       { "NBPSUSWindSpd": "1431848598434:15.6",
         "NBPSUSWindDir": "1431848498434:347",
         "time": 1431848498434
       }

   It parses the response, caching the values and their corresponding
   times, e.g.

       this.field_values['NBPSUSWindSpd'] = '15.6';
       this.field_times['NBPSUSWindSpd'] = 1431848598434;

   It then calls the widget's renderer with the aggregated cache of
   values:

       this.widget(this.field_values);

   NOTE: since the renderer has access to "this", passing the array in
   is actually superfluous, but we do it for backward
   compatibility. It's probably worth going back through all the
   renderers and changing things so that they're initialized by being
   called with a "true" parameter, and subsequently called without any
   params.

   Once the call to the renderer returns, handleResponse calls
   getData() to start the cycle again. Thus is the circle unbroken.

   NOTE: If computation starts to become tight, the current
   architecture could be rewritten to have a class method that makes a
   single XMLHTTPRequest call for all fields on behalf of all widgets,
   then only re-renders those which have at least one updated field.

   Whew.

   USE:
   ====

   Pretty simple.

   Creation:
       var my_widget = new DASWidget(my_widget_spec);

   Deletion - we need to figure out how to tie into an object's
   destructor so this will get called automatically, but for now, need
   to remove a no-longer-needed widget from the request map with:

      my_widget.remove()

*********************************************************************/

var DASWidget = function() {
    this.running = true;
    this.edited = false;
    this.field_values = {};
    this.field_times = {};
    this.container = typeof this.spec.container !== 'undefined' ? this.spec.container : '.container-content';
    this.class_name = typeof this.spec.class_name !== 'undefined' ? this.spec.class_name : 'panel widget';
    this.refresh_rate = typeof this.refresh_rate !== 'undefined' ? this.refresh_rate : typeof this.options.refresh_rate !== 'undefined' ? this.options.refresh_rate : 1;
    this.title = typeof this.options.title !== 'undefined' ? this.options.title : '';
    this.title_size = typeof this.options.title_size !== 'undefined' ? this.options.title_size : 18;
    this.title_color = typeof this.options.title_color !== 'undefined' ? this.options.title_color : '#b5b5b7';
    this.title_unit = typeof this.options.title_unit !== 'undefined' ? this.options.title_unit : '';
    this.left = typeof this.options.left !== 'undefined' ? this.options.left : '80';
    this.top = typeof this.options.top !== 'undefined' ? this.options.top : '80';
    this.margin = 30;
    this.last_refresh = Date.now();
    
    console.log(this);
    
    this.setup();
    this.init();
    this.getData();
};


DASWidget.prototype.getData = function() {
    // console.log('getData');
    if (this.running == 'false' || this.field_list.length === 0) {
    	return;
    }
    // If we're running and have actual fields to request...
    var form_data = new FormData();
    for (var i = 0; i < this.field_list.length; i++) {
        var field = this.field_list[i];
        var ts = typeof this.field_times[field] !== 'undefined' ? this.field_times[field] : 0;
        // console.log(this.name + ' Requesting field: ' + field + ' ts: ' + ts);

        form_data.append(field, ts);
    }
    this.req = new XMLHttpRequest();
    this.req.open("POST", "/display/listen");
    this.req.onreadystatechange = this.handleListenerResponse.bind(this);
    this.req.send(form_data);
};

DASWidget.prototype.handleListenerResponse = function(){
    var dict;
    if (this.running !== false){
        if (this.req.readyState !== 4) {
            return;  // these are not the droids you're looking for
        }
        if (this.req.status !== 200) {
            // console.warn('Status ' + this.req.status + ' received: ' + this.req.status);
        }
        try{
            dict = JSON.parse(this.req.responseText);
        }
        catch (e){
            if (e instanceof SyntaxError){
                console.log(e);
                console.warn(this.name + ' no longer exists.');
            }
            else{
                console.warn(e);
            }
        }
        // console.debug('handleListenerResponse got response: ' + this.req.responseText);
        
        // Parse out the timestamps
        for (var field in dict) {
            if (dict.hasOwnProperty(field)) {
                var value_ts_list = dict[field];
                // console.log(this.name + '\'s field ' + field + ' timestamp: ' + value_ts_list[1]);

                // Cache our values
                if (typeof value_ts_list[0] !== 'undefined'){
                    this.field_values[field] = value_ts_list[0];  // value
                }
            
                if (typeof value_ts_list[1] !== 'undefined'){
                    this.field_times[field] = parseInt(value_ts_list[1]); // timestamp
                }
                //console.log(this.field_values);
            }
        }
        // console.debug('handleListenerResponse passing: ' + JSON.stringify(this.field_values));
        // Go back and get more data
        this.update();
        this.getData();
    }
};


// basic setup all widgets require
// creates the container they each live in, setting up the heading and the body
DASWidget.prototype.setup = function(){
    if (this.container !== '.main'){
        d3.select(this.container)
            .append('div')
            .classed(this.class_name, true)
            .attrs({
                'id': this.name,});
    }else{
        d3.select(this.container)
            .insert('div', '.dasmodal')
            .classed(this.class_name, true)
            .attrs({
                'id': this.name,});
    }
    d3.select('#' + this.name)
        .styles({
            'position': 'absolute',
            'left': this.left + 'px',
            'top': this.top + 'px',
            'border': '2px solid rgba(0,0,0,0)',
            'box-shadow': 'none',
            'background-color': 'transparent',
         })
        .append('div')
        .classed('panel-heading', true)
        .styles({
            'height': (this.title_size) + 'px',
            'padding': '0em .25em 0em 0em',
            'color': this.title_color,
            'font-size': this.title_size + 'px',
            'text-shadow': '0 2px ' + this.text_shadow,})
        .append('p')
        .classed('text-left', true)
        .styles({
            'float': 'left',
            'margin': '0px', })
        .text(this.title + ' ' + this.title_unit);
    
    this.id = d3.select('#' + this.name);

    this.id.append('div')
        .classed('panel-body', true);
};

DASWidget.prototype.update = function(field_values){
    console.log('update');
};

DASWidget.prototype.draw = function(){
    console.log('draw');
};

DASWidget.prototype.remove = function(){
    console.log('Deleting widget ' + this.name);
    this.running = false;
    this.req.abort();

    // Remove from DOM
    d3.selectAll('#' + this.name)
        .transition()
        .style('opacity', 0)
        .remove();    
};
