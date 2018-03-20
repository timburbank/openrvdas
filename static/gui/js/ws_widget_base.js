/**********************************************************************

   Version of widget_base.js that uses websockets instead of
   XMLHttpRequest - in theory should be a lot more efficient.

   TODO: In theory we could/should have all the widgets on a page
   share the same websocket. For now, each widget has its own. But it
   may not matter.
  
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

   Once a widget has been initialized, it opens a websocket and binds
   the om_message() function to it. When on_message() receives a
   "howdy" message (typically the first thing sent), it responds with
   a comma-separated list of fields it's interested in. It then
   expects subsequent messages to be JSON-encoded dictionaries of the
   form
       { field_name: [field_value, field_timestamp_in_milliseconds],
         ...
       }
       {
         "NBPSUSWindSpd": [17, 1431848598434],
         "NBPSUSWindDir": [347, 1431848498434],
       }

   It parses the response, caching the values and their corresponding
   times, e.g.

       this.field_values['NBPSUSWindSpd'] = 15.6;
       this.field_times['NBPSUSWindSpd'] = 1431848598434;

   Once it's finished parsing and caching the values, it calls the
   widget's update() function. Then it's done until the next websocket
   message arrives. Pretty simple.

   NOTE: since the renderer has access to "this", passing the array in
   is actually superfluous, but we do it for backward
   compatibility. It's probably worth going back through all the
   renderers and changing things so that they're initialized by being
   called with a "true" parameter, and subsequently called without any
   params.

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

///////////////////////////////////////////////////////////////////////////////
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
  
  console.log('Creating widget ' + this);
  this.setup();
  this.init();

  // Try to connect to websocket (DASWidget.prototype.connect(), below)
  this.connect();
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Try to connect to websocket
DASWidget.prototype.connect = async function() {
  while (this.socket_status != 'connected') {
    console.log('Connecting to websocket ' + WEBSOCKET_ADDRESS);
    this.ws = new WebSocket('ws://' + WEBSOCKET_ADDRESS);

    this.socket_status = 'connecting';

    while (this.ws.readyState == 0) {
      console.log('websocket not ready yet');
      await sleep(1000);
    }
    if (this.ws.readyState == 1) {
      this.socket_status = 'connected';
    }
  }
  // Bind functions for the various events we expect: close,
  // error and message
  this.ws.onmessage = this.on_message.bind(this);
  this.ws.onerror = this.on_error.bind(this);
  this.ws.onclose = this.on_close.bind(this);

  // When connection opens, send out the list of fields we'd
  // like to monitor
  console.log("Connected, sending field list '" +  this.field_list + "'");
  this.ws.send(this.field_list);
}

// If connection closes, figure out if we're the ones who closed
// it. If not, try to re-open.
DASWidget.prototype.on_close = function(event) {
  if (self.status == 'self_closed') {
    console.log('Self-closed websocket...');
    return;
  }
  this.socket_status = 'closed';
  console.log('Closed, trying to re-open');
  this.connect();
}

// If we get an error, note it and continue
DASWidget.prototype.on_error = function(error) {
  console.log('Websocket error: ' + error);
  this.socket_status = 'error: ' + error;
} 

// If a message comes in, process it
DASWidget.prototype.on_message = function(event) {
  var dict;
  try{
    dict = JSON.parse(event.data);
  }
  catch (e){
    if (e instanceof SyntaxError){
      console.log(e);
      console.warn(this.name + ' no longer exists.');
    } else{
      console.warn(e);
    }
  }
  //console.debug('handleListenerResponse got response: '
  //              + this.req.responseText);
        
  // Parse out the received values and timestamps
  for (var field in dict) {
    if (dict.hasOwnProperty(field)) {
      var value_ts_list = dict[field];
      // value_ts_list should be [field_value timestamp]
      if (typeof value_ts_list[0] !== 'undefined' &&
          typeof value_ts_list[1] !== 'undefined'){
        this.field_values[field] = value_ts_list[0];          // value
        this.field_times[field] = value_ts_list[1]; // timestamp
      }
      //console.log(this.field_values);
    }
  }
  // Let widgets update using the new data
  this.update();

  // Let server know we're ready for more
  //this.ws.send('ready');
};

// basic setup all widgets require
// creates the container they each live in, setting up the heading and the body
DASWidget.prototype.setup = function(){
  if (this.container !== '.main'){
    d3.select(this.container)
      .append('div')
      .classed(this.class_name, true)
      .attrs({'id': this.name,});
  }else{
    d3.select(this.container)
      .insert('div', '.dasmodal')
      .classed(this.class_name, true)
      .attrs({'id': this.name,});
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
