/*
 * newLineWidget.js
 * by Valerie Warner
 *
 * The core RV DAS Display for RVIB NBP and ASRV LMG, and possibly the USAP.
 *
 * This is a placeholder for what will be the readme later
 *
 * TODO: change fields[i].whatever to use importOptions() not ternary
 * TODO: implement auto line data resolution
 *       should also redraw new line smoothly. fade in new line, and fade out old line at the same rate at the same time
 * TODO: implement funcionality to work with websockets
 */

 /*jshint esversion: 6 */

(function(){
  // globals
  // ***************************************************************************
  let tempArray = window.crypto.getRandomValues(new Uint32Array(1));
  let randomWidgetName = tempArray[0];
  let ws;
  let message = [];
  let retry_interval = 3000;
  let retry_websocket_connection;
  let _this;
  
  // constructor
  this.LineWidget = function(){
    // default values
    // ***************************************************************************
    var defaults = {
      widget: 'line',
      running: false,
      edited: 'false',
      field_values: {},
      field_times: {},
      field_list: [],
      fields: [],
      container: '.container-content',
      class_name: 'panel widget',
      refresh_rate: 1000,
      title: '',
      title_size: 18,
      title_color: '#b5b5b7',
      title_unit: '',
      height: 400,
      width: 800,
      top: 80,
      left: 80,
      margin: 30,
      time_frame: 1200000,
      last_refresh: Date.now(),
      duration: 5000,
      duration_max: [],
      axis_color: '#a50f15',
      text_color: '#b5b5b7',
      text_size: 24,
      line_thickness: 3,
      tolerance: 0.5,
      time: Date.now(), // should be time + duration
      last_time: Date.now(), // should be time + duration
      //random_color: function(){ return Math.floor(Math.random() * (255)); },
      x_scale: 'time',
      y_scale: 'linear',
      x_axis_side: 'bottom',
      y_axis_side: 'right',
      backfill_sec: 30, // number of seconds of data to backfill in, if any.
    };

    // use supplied arguments, or set to defaults
    try {
      if (arguments[0].hasOwnProperty('widget') && arguments[0].widget !== 'undefined'){
        // this allows us to set the contents of widget dynamically to the passed in widget.
        for (let property in defaults){
          if (defaults.hasOwnProperty(property)){
            defaults[property] = defaults[property];
          }
          defaults.name = arguments[0].widget + '_widget_' + randomWidgetName;
          this.options = importOptions(defaults, arguments[0]);
          _this = this.options;
        }
      }
      else{
        console.log('defaults');
        this.options = defaults;
        _this = this.options;
      }
    }
    catch (e){
      if (e instanceof TypeError) {
        this.options = defaults;
        _this = this.options;
        console.log('defaults');
      }
    }
  };

  // public functions
  // ***************************************************************************
  
  /*
  this.LineWidget.prototype.initialize = function(){
    console.log(this.options);
    initParams.call(this);
    _this.running = true;
    getData.call(this);
  };
  */

/*
    var message = [];
    for (var i = 0; i < fields.length; i++) {
      message.push([fields[i], num_secs]);
    }
    console.log("Initialization message: " + JSON.stringify(message));
    return message;
*/
  this.LineWidget.prototype.initalize = function(){
    console.log(this.options);
    console.log(random_color());
    initParams.call(this);
  };

  this.LineWidget.prototype.websocket_setup = function(){
    console.log('setting up ws\n');    
    console.log('field length: ' + _this.fields.length);

    for (let i = 0; i < _this.fields.length; i++){
      message.push([_this.fields[i].field, _this.backfill_sec]);
    }
    console.log("Initialization message: " + JSON.stringify(message));
    connect_websocket.call(this, message);
  };

  this.LineWidget.prototype.data = function(){
    for (let i = 0; i < _this.fields.length; i++){
      console.log(_this.fields[i].data);
    }
    console.log(_this.data);
  };

  this.LineWidget.prototype.start = function(){
    _this.running = true;
    getData.call(this);
  };

  this.LineWidget.prototype.stop = function(){
    _this.running = false;
  };

  // private functions
  // ***************************************************************************
  function connect_websocket(message) {
    console.log("Trying to reconnect to websocket_server");
    ws = new WebSocket(websocket_address);

    ws.onopen = function() {
      // We've succeeded in opening - don't try anymore
      console.log("Connected - clearing retry interval");
      clearTimeout(retry_websocket_connection);
      // Web Socket is connected, send data using send()
      ws.send(JSON.stringify(message));
      console.log("Sent initial message: " +
                   JSON.stringify(message));
    };

    ws.onclose = function() { 
      // websocket is closed.
      console.log("Connection is closed...");
      // Set up an alarm to sleep, then try re-opening websocket
      console.log("Setting timer to reconnect");
      retry_websocket_connection = setTimeout(connect_websocket,
                                              retry_interval);
    };

    ws.onmessage = function (received_message) {
      console.log("message: " + received_message.data);
      process_message(JSON.parse(received_message.data));
    };

    window.onbeforeunload = function(event) {
      console.log("Closing websocket");
      ws.close();
    };
  }

  function process_message(new_message){
    let received_message = new_message;
    let keys = Object.keys(received_message);

    /*if (_this.fields[0].duration.length >= 9){
      _this.duration = 0; 
      console.log('reset dur: ' + _this.duration);
    }*/

    for (let i = 0; i < _this.fields.length; i++){
      //console.log('\n   field: ' + _this.fields[i].field);
      if (received_message.hasOwnProperty(_this.fields[i].field)){
        _this.last_time = _this.time;
        _this.time = Date.now();
        //_this.fields[i].duration.push(Date.now());
        //console.log(received_message[_this.fields[i].field][0]);
        //console.log('\n   received: ' + _this.fields[i].field);
        
        //console.log('data points: ' + received_message[_this.fields[i].field].length);
        for (let j = 0; j < received_message[_this.fields[i].field].length; j++){
          // [j][0] is time
          // [j][1] is data
          console.log('       time: ' + received_message[_this.fields[i].field][j][0] * 1000);
          //console.log('       data: ' + received_message[_this.fields[i].field][j][1]);
          _this.fields[i].data.push({'x': parseFloat(received_message[_this.fields[i].field][j][0] * 1000), 
                                     'y': parseFloat(received_message[_this.fields[i].field][j][1])});
          //_this.time = _this.fields[i].data[_this.fields[i].data.length -1].x;
          //_this.fields[i].duration.push(_this.time);
        }

        if (_this.fields[i].data.length < 2){
          console.log(_this.fields[i].field + ' has less than two points. Continuing until it has more.');
          continue;
        }

        _this.duration = (_this.fields[i].data[_this.fields[i].data.length - 1].x - _this.fields[i].data[_this.fields[i].data.length -2].x);
        //_this.duration = Math.ceil(_this.time - _this.fields[i].data[_this.fields[i].data.length -2].x - (Date.now()  _this.time));
        /*while (_this.fields[i].duration.length > 9){
          for (let k = 0; k < 3; k+=2){
            if (Math.abs(_this.fields[i].duration[k+1] - _this.fields[i].duration[k]) > _this.duration){
              _this.duration = Math.abs(Math.ceil(_this.fields[i].duration[k+1] - _this.fields[i].duration[k]));
            }
          }*/
          //_this.duration = parseInt(Math.ceil(_this.fields[i].duration[1])) - parseInt(Math.floor(_this.fields[i].duration[0]));
          //_this.duration = _this.fields[i].duration[1] - _this.fields[i].duration[0];
          _this.fields[i].duration.shift();
        //}
      }
      draw.call(this);
    }
    /*
    for (let i = 0; i < _this.fields.length; i++){
      if (_this.fields[i].field in _this.field_values){
        if ((_this.fields[i].data.length !== 0) && (_this.field_times[_this.fields[i].field] === _this.fields[i].data[_this.fields[i].data.length -1].x) && (_this.field_values[_this.fields[i].field] === _this.fields[i].data[_this.fields[i].data.length -1].y)){
          console.debug('continue');
          continue;
        }
        _this.fields[i].data.push({'x': parseInt(_this.field_times[_this.fields[i].field]), 'y': parseFloat(_this.field_values[_this.fields[i].field])});
        _this.time = parseFloat(_this.field_times[_this.fields[i].field]);
        _this.fields[i].duration.push(Date.now());
        while (_this.fields[i].duration.length > 1){
          _this.duration = _this.fields[i].duration[1] - _this.fields[i].duration[0];
          _this.fields[i].duration.shift();
        }
      }
    }
    */
  }

  function getData(){
    console.log('getData');
    // check to make sure that we are running and have fields
    if (_this.running === false){
      console.log('not running');
      return;
    }
    else if (_this.field_list.length === 0){
      console.log('no fields');
      return;
    }

    // if we're running and have fields to request
    let form_data = new FormData();
    for (let i = 0; i < _this.field_list.length; i++){
      let field = _this.field_list[i];
      let ts = typeof _this.field_times[field] !== 'undefined' ? _this.field_times[field] : 0;
      // console.log(_this.name + ' requesting field: ' + field + ' ts: ' + ts);

      form_data.append(field, ts);
    }
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/display/listen');
    xhr.onreadystatechange = (function(){
      let dict;
      if (xhr.readyState !== 4){
        return;
      }
      if (xhr.status !== 200){
        // console.warn('Status ' + xhr.status + ' received: ' + xhr.status);
      }
      try{
        dict = JSON.parse(xhr.responseText);
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

      // console.debug('recevied response: ' + xhr.responseText);
      for (let field in dict){
        if (dict.hasOwnProperty(field) && field !== 'time'){
          let value_ts_list = dict[field];
          // console.debug('_this.name + '\'s field ' + field + ' timestamp: ' + value_ts_list[1]);
          // cache our values
          if (typeof value_ts_list[0] !== 'undefined'){
            _this.field_values[field] = value_ts_list[0]; // value
          }
          if (typeof value_ts_list[1] !== 'undefined'){
            _this.field_times[field] = parseInt(value_ts_list[1]); //timestamp
          }
          //console.debug(_this.name + '    field: ' + field + '    value: ' + value_ts_list[0]);
        }
      }
      update.call(this);
    }).bind(this);
    xhr.send(form_data);
  }

  // updates the widget data array
  // TODO: update the data array structure so that this is less complicated
  function update(){
    //console.debug('update');
    for (let i = 0; i < _this.fields.length; i++){
      //console.debug('this.fields[' + i + '] = ' + _this.fields[i].field);
      if (_this.fields[i].field in _this.field_values){
        if ((_this.fields[i].data.length !== 0) && (_this.field_times[_this.fields[i].field] === _this.fields[i].data[_this.fields[i].data.length -1].x) && (_this.field_values[_this.fields[i].field] === _this.fields[i].data[_this.fields[i].data.length -1].y)){
          console.debug('continue');
          continue;
        }
        _this.fields[i].data.push({'x': parseInt(_this.field_times[_this.fields[i].field]), 'y': parseFloat(_this.field_values[_this.fields[i].field])});
        _this.time = parseFloat(_this.field_times[_this.fields[i].field]);
        //_this.time = parseFloat(_this.field_times[_this.fields[i].field]);
        //console.debug('this.time = ' + _this.time);
        /*_this.fields[i].duration.push(_this.time);
        if (_this.fields[i].duration.length > 1){
          _this.duration_max.push(_this.fields[i].duration[1] - _this.fields[i].duration[0]);
          _this.fields[i].duration.shift();
        }*/
        _this.fields[i].duration.push(Date.now());
        while (_this.fields[i].duration.length > 1){
          _this.duration = parseInt(Math.ceil(_this.fields[i].duration[1])) - parseInt(Math.floor(_this.fields[i].duration[0]));
          _this.fields[i].duration.shift();
          console.log('duration shift');
        }
      }
    }
    //_this.duration = parseInt(d3.max(_this.duration_max));
    //_this.duration = 1000;
    //console.log(_this.duration);
    /*_this.duration = parseInt(d3.max(_this.duration_max));
    if (_this.duration_max.length > 9){
      _this.duration_max.shift();
    }
    */
    //console.debug('duration: ' + _this.duration);
    getData.call(this);
    draw.call(this);
  }

  function draw(){
    // select our widget
    let id = d3.select('#' + _this.name);

    let g = id.selectAll('svg')
      .select('g');

    for (let i = 0; i < _this.fields.length; i++){
      if (_this.fields[i].data.length < 2){
        console.log('continue');
        continue;
      }
      //console.log('  data length: ' + _this.fields[i].data.length);
      console.log('real duration: ' + (_this.last_time - _this.time));
      console.log('data duration: ' + (_this.fields[i].data[_this.fields[i].data.length - 1].x - _this.fields[i].data[_this.fields[i].data.length -2].x));
      /*if ((_this.fields[i].last_refresh + _this.duration * (1/2)) > _this.fields[i].data[_this.fields[i].data.length - 1].x){
        _this.fields[i].last_refresh = _this.fields[i].data[_this.fields[i].data.length -1].x;
        continue;
      }*/

      let x = (_this.xScale.range()[0] - _this.xScale(_this.fields[i].data[_this.fields[i].data.length -1].x));
      //let x = -(_this.xScale(_this.fields[i].data[_this.fields[i].data.length-1].x) -_this.xScale.range()[0]);
      console.log('x: '+ x);
      //console.log(_this.fields[i].data[_this.fields[i].data.length -1].x - _this.fields[i].data[_this.fields[i].data.length-2].x);
      //let x = _this.xScale.range()[1] / ((parseInt(_this.time_frame) - _this.duration * 5) / _this.duration);
      _this.fields[i].line_selection = d3.select('#' + _this.name)
            .select('.panel-body')
            .select('svg')
            .select('g')
            .select('.line_' + i)
            .select('#line_' + i);

      _this.fields[i].line_selection.datum(_this.fields[i].data);

      console.log(typeof _this.duration + ': ' + _this.duration);
      _this.fields[i].line_selection.interrupt()
            .transition()
            //.duration(1000)
            .duration(_this.duration)
            //.duration(parseInt(Math.ceil(_this.fields[i].duration[1])) - parseInt(Math.floor(_this.fields[i].duration[0])))
            .ease(d3.easeLinear)
            //.attr('transform', 'translate(' + -(_this.xScale(data[data.length-1].x) -_this.xScale.range()[0]) + ',' + _this.margin + ')');
            .attr('transform', 'translate(' + x + ',' + _this.margin + ')');

//      _this.fields[i].last_refresh = _this.fields[i].data[_this.fields[i].data.length -1].x;

/*      if ((_this.fields[i].data[0].x < (_this.time - parseInt(_this.time_frame)))){
        console.log('shifted ' + _this.fields[i].data[0].x);
        _this.fields[i].data.shift();
      }
*/
      // have the last two pints gone off the chart? if so shift the array by one
      // also, make sure we keep at least a few points around.
      while ((_this.fields[i].data.length > 2) && (_this.xScale(_this.fields[i].data[2].x) < 0)){
        console.log('shift');
        _this.fields[i].data.shift();
      }

      _this.fields[i].line_selection.attr('d', _this.fields[i].line)
            .attr('transform', 'translate(0,' + _this.margin + ')');


      //((800/3)+(800/3)*.2)
      //((_this.width / _this.line_thickness) / (_this.width / _this.line_thickness *0.2))
      //((_this.time_frame / _this.duration) / 1000);

      // should we simplify?
      if (_this.fields[i].simplify === false){
        // determine the simplification rate
        // basically, set it to 5 or if the (timeframe / duration) / (width / line thickness) + 20%) if it's greater
        let simplify_rate = (Math.floor(_this.time_frame / _this.duration / ((_this.width / _this.line_thickness) + (_this.width / _this.line_thickness) * 0.2)) > 4 )
        ? Math.floor(_this.time_frame / _this.duration / ((_this.width / _this.line_thickness) + (_this.width / _this.line_thickness) * 0.2))
        : 4;
        // is it time to simplify?
        if (_this.fields[i].last_simplification + simplify_rate < _this.fields[i].data.length){
          //console.log('simplify\ndata_length: ' + _this.fields[i].data.length);
          // determine what is already been simplified and what is not
          let already_simple = _this.fields[i].data.slice(0, _this.fields[i].last_simplification);
          let not_simple = _this.fields[i].data.slice(_this.fields[i].last_simplification, _this.fields[i].data.length - 1);
          // take the already simplified data, simplify the unsimplified, and merge the arrays
          //
          // the dataSimplification routine requires a 2d array, and a tolerance.
          // the algorithm will take the first and the last point of an array and draw a straight line between them.
          // it then finds the furthest point from that segment, and draws a line segment to it from the first point.
          // if any point along that line segment is within the tolerance, it removes it.
          // it then uses  that point the first point, and does the sequence over again until no more points remove
          Array.prototype.push.apply(already_simple, dataSimplification(not_simple, 2));
          //Array.prototype.push.apply(already_simple, dataSimplification(not_simple, _this.line_thickness));
          // set the fields data to the simplified data
          _this.fields[i].data = already_simple;
          // remember where we simplified to
          _this.fields[i].last_simplification = already_simple.length;
        }
        //console.debug('tolerance: ' + tolerance + '\nsimplify_rate: ' + simplify_rate);

      }
      //console.log(_this.fields[i].data[0].x);

      /*
      // should we simplify the data?
      // think of this as auto adjusting the plot's resolution
      if (_this.fields[i].simplify === true){
        // how often should i run?
        _this.fields[i].simplification_rate = Math.floor((_this.time_frame/(_this.width/_this.line_thickness))/_this.duration);

        // console.log(_this.name + ' simplification rate: ' + _this.fields[i].simplification_rate);
        // max number of points that can be displayed (a function of the width and size of the points) plus 20%,
        var max_points = Math.ceil((_this.width / _this.line_thickness) + ((_this.width / _this.line_thickness) * 0.2));

        // predict whether we will surpass the max number of points, and if we do, simplify!
        if (max_points < (_this.time_frame / _this.duration)){
          // set a tolerance
          // think of the tolerance as the percent of whole you would like after (not exactly, but a good thought)
          // for example, a tolerance of .3 will probably give you 3 points out of 10 (but not always).
          //_this.fields[i].tolerance = (_this.time_frame / _this.duration) / 1000;
          _this.fields[i].tolerance = (_this.height*_this.width) / (_this.time_frame / 1000);
          console.log(_this.fields[i].tolerance);

          // is it time to simplify?
          if ((_this.fields[i].last_simplification + _this.fields[i].simplification_rate) < _this.fields[i].data.length){
            var already_simple = _this.fields[i].data.slice(0, _this.fields[i].last_simplification);
            var not_simple = _this.fields[i].data.slice(_this.fields[i].last_simplification, _this.fields[i].data.length - 1);

            // console.log(_this.name + ' tolerance: ' + _this.fields[i].tolerance);

            // merge the two arrays
            Array.prototype.push.apply(already_simple, dataSimplification(not_simple, _this.fields[i].tolerance));

            // set our data array with the newly simplified data and set our last simplification variable
            _this.fields[i].data = already_simple;
            _this.fields[i].last_simplification = already_simple.length -1;
          }
        }
      }*/
      // console.log(_this.name + ' data length: ' + _this.fields[i].data.length);
      // console.log(' ');
    }
    switch (_this.x_scale){
    case 'time':
      //_this.xScale.domain([_this.time - (parseInt(_this.time_frame)) + _this.duration * 3, _this.time - _this.duration * 2]);
      _this.xScale.domain([_this.time, _this.time + (_this.duration * 2) - _this.time_frame]);
      //_this.xScale.domain([_this.time - _this.time_frame, _this.time]);
      break;
    case 'linear':
      break;
    }

    switch (_this.y_scale){
    case 'time':
      break;
    case 'linear':
      _this.yScale.domain([yMin(_this.fields), yMax(_this.fields)]);
      break;
    }

    switch(_this.y_axis_side){
    case 'left':
      _this.yAxis = d3.axisLeft(_this.yScale)
      .ticks(4);
      break;
    case 'right':
      _this.yAxis = d3.axisRight(_this.yScale)
      .ticks(4);
      break;
    }

    switch(_this.x_axis_side){
    case 'top':
      _this.xAxis = d3.axisTop(_this.xScale)
      .ticks(4);
      break;
    case 'bottom':
      _this.xAxis = d3.axisBottom(_this.xScale)
      .ticks(4);
      break;
    }

    g.select('.x.axis')
    .transition()
    .duration(_this.duration)
    .ease(d3.easeLinear)
    .call(_this.xAxis);

    g.select('.y.axis')
    .transition()
    .duration(_this.duration)
    .ease(d3.easeLinear)
    .call(_this.yAxis);

    g.selectAll('.tick')
    .select('text')
    .styles({
      'text-shadow': '0 2px #222',
      'fill': _this.text_color,
      'font-size': _this.text_size + 'px',
    });

    g.selectAll('.axis')
    .selectAll('line')
    .styles({
      'stroke': _this.axis_color,
      'fill': 'none',
      'stroke-width': _this.line_thickness,
      'stroke-opacity': 1,
    });

    g.selectAll('.axis')
    .selectAll('path')
    .styles({
      'stroke': _this.axis_color,
      'fill': 'none',
      'stroke-width': _this.line_thickness,
    });
  }

  // sets up the core container structure for the widget
  function initParams(){
    _this = this.options;
    //setup our fields
    if (_this.fields.length !== 0){
      for (let i = 0; i < _this.fields.length; i++){
        if (typeof _this.fields[i].field !== 'undefined'){
          _this.field_list.push(_this.fields[i].field);
          _this.fields[i].data = [];
          _this.fields[i].last_refresh = Date.now();
          _this.fields[i].duration = [Date.now()];
        }
      }
    }

    // if options.container is set to anything other than main, it's probably in a modal
    // if it's a modal, we insert it so that it
    if (_this.container !== '.main'){
      d3.select(_this.container)
        .append('div')
        .classed(_this.class_name, true)
        .attrs({
          'id': _this.name,});
    }else{
      d3.select(_this.container)
        .insert('div', '.dasmodal')
        .classed(_this.class_name, true)
        .attrs({
          'id': _this.name,});
    }

    // select the div with id that matches wiget, apply styles, and add remaining core widget structure
    d3.select('#' + _this.name)
      .styles({
        'position': 'absolute',
        'left': _this.left + 'px',
        'top': _this.top + 'px',
        'border': '2px solid rgba(0,0,0,0)',
        'box-shadow': 'none',
        'background-color': 'transparent',
      })
      .append('div')
      .classed('panel-heading', true)
      .styles({
        'height': (_this.title_size) + 'px',
        'padding': '0em .25em 0em 0em',
        'color': _this.title_color,
        'font-size': _this.title_size + 'px',
        'text-shadow': '0 2px ' + _this.text_shadow,})
      .append('p')
      .classed('text-left', true)
      .styles({
        'float': 'left',
        'margin': '0px', })
      .text(_this.title + ' ' + _this.title_unit);

    for (let j = 0; j < _this.fields.length; j++){
      _this.fields[j].line_color = typeof _this.fields[j].line_color !== 'undefined' ? _this.fields[j].line_color.toString() : random_color().toString();
      _this.fields[j].simplify_rate = Math.floor((parseInt(_this.time_frame) / 1000) / (parseFloat(_this.width) / parseFloat(_this.line_thickness)));
      _this.fields[j].simplify = typeof _this.fields[j].simplify !== 'undefined' ? _this.fields[j].simplify : true;
      _this.fields[j].tolerance = 0;
      _this.fields[j].last_simplification = 0;
      _this.fields[j].curve = d3.curveLinear;
    }

    switch(_this.x_scale){
    case 'time':
      _this.xScale = d3.scaleTime()
      .domain([_this.time, _this.time + (_this.duration * 2) - _this.time_frame]);
      //.domain([_this.time - (parseInt(_this.time_frame)) + _this.duration * 3, _this.time - _this.duration * 2]);
      break;
    case 'linear':
      _this.xScale = d3.scaleLinear()
      .domain([]);
      break;
    }
    _this.xScale.range([_this.width - (_this.margin * 2),0]);
    //_this.xScale.range([0, _this.width - (_this.margin * 2)]);

    switch(_this.y_scale){
    case 'time':
      _this.yScale = d3.scaleTime()
      .domain([])
      .clamp(true);
      break;
    case 'linear':
      _this.yScale = d3.scaleLinear()
      .domain([yMin(_this.fields), yMax(_this.fields)])
      .clamp(true);
      break;
    }
    _this.yScale.range([_this.height - (_this.margin * 2), 0]);

    switch(_this.y_axis_side){
    case 'left':
      _this.yAxis = d3.axisLeft(_this.yScale)
      .ticks(4);
      break;
    case 'right':
      _this.yAxis = d3.axisRight(_this.yScale)
      .ticks(4);
      break;
    }

    switch(_this.x_axis_side){
    case 'top':
      _this.xAxis = d3.axisTop(_this.xScale)
      .ticks(4);
      break;
    case 'bottom':
      _this.xAxis = d3.axisBottom(_this.xScale)
      .ticks(4);
      break;
    }

    let id = d3.select('#' + _this.name);
    id.append('div')
      .classed('panel-body', true);

    let svg = id.select('.panel-body')
      .append('svg')
      .attrs({
        'height': _this.height,
        'width': _this.width, })
      .append('g');

    svg.append('g')
      .attrs({
        'transform': 'translate(0,' + (_this.height - _this.margin) + ')', })
      .classed('x axis', true);

    svg.append('g')
      .attrs({'transform': 'translate(' + (_this.width - _this.margin * 2) + ',' + _this.margin + ')', })
      .classed('y axis', true);

    svg.append('defs')
      .append('clipPath')
      //.append('p') // comment out above clipPath and uncomment this line to see where lines are being drawn and removed - DEBUG ONLY
      .attr('id', 'clip')
      .append('rect')
      .attrs({
        'width': (_this.width - (_this.margin * 2)),
        'height': (_this.height - (_this.margin * 2)),
        'transform': 'translate(' + (-_this.line_thickness/2) + ',' + _this.margin + ')', });
       // 'transform': 'translate(' + (-(_this.line_thickness * 0.45)) + ',' + (_this.margin - (_this.line_thickness * 0.45)) + ')', });
       // 'transform': 'translate(-1.5, 29)'});

    /* var g = id.selectAll('svg')
      .select('g'); */

    for (let n = 0; n < _this.fields.length; n++){
      svg.append('g')
        .attr('clip-path', 'url(#clip)')
        .classed('line_' +n, true)
        .append('path')
        .classed('line', true)
        .styles({
          'stroke-opacity': '1',
          'fill': 'none',
          'stroke-width': _this.line_thickness.toString(),
          'stroke': _this.fields[n].line_color.toString(), })
        .attr('id', 'line_' + n);
    }

    switch(_this.widget){
    case 'line':
      for(let j = 0; j < _this.fields.length; j++){
        _this.fields[j].line = d3.line()
        .x(function(d) { return _this.xScale(d.x); })
        .y(function(d) { return _this.yScale(d.y); })
        .curve(_this.fields[j].curve);
      }
      break;
    case 'scatter':
      break;
    }
  }

  // utility functions
  // ***************************************************************************
  // determine yMin, returning the min - 10%, rounded down or 0 (if no value is negative).
  var yMin = function(d){
    let tmp = 0;
    for (let a = 0; a < d.length; a++){
      let min = d3.min(d[a].data, function(d) { return parseFloat(d.y); });
      if (tmp < min){
        tmp = min;
      }
    }

    if ((tmp >= 0) && ((tmp-tmp*(1/10)) <= 0)){
      return 0;
    }
    else if (tmp < 0){
      return Math.floor(tmp+tmp*(1/10));
    }
    else{
      return Math.floor(tmp-tmp*(1/10));
    }
  };

  // determine yMax, returning the max + 10%, rounded up or 0 (if no value is positive)
  var yMax = function(d){
    let tmp = 0;
    for (let a = 0; a < d.length; a++){
      let min = d3.max(d[a].data, function(d) { return parseFloat(d.y); });
      if (tmp < min){
        tmp = min;
      }
    }

    if ((tmp <= 0) && ((tmp+tmp*(1/10)) >= 0)){
      return 0;
    }
    else if (tmp < 0){
      return Math.ceil(tmp-tmp*(1/10));
    }
    else{
      return Math.ceil(tmp+tmp*(1/10));
    }
  };

  var random_color = function(){
    return d3.rgb(Math.floor(Math.random() * (255)), Math.floor(Math.random() * (255)), Math.floor(Math.random() * (255)));
  };

  function dataSimplification(data, tolerance){
    return simplify(data, tolerance);
  }

  function importOptions(properties, importedArgs){
    let property;
    // for each property in importedArgs, assign the value to the corresponging key in properties.
    for (property in importedArgs){
      if (importedArgs.hasOwnProperty(property)){
        properties[property] = importedArgs[property];
      }
    }
    return properties;
  }
}());
