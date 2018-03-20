/*
modal.js
    a modal generator for the DAS Display

    immediately-invoked function expression (IFFE)
    an expression I learned writing this, pronounced 'iffy'
        (function(){ ... }());
    the function gets called immediately upon loading.
    the parser sees the function declaration as a function expression,
    rather than a function declaration and invokes it.
*/

(function(){
  // constructor
  this.Modal = function(){
    // globals
    var formData,
    numWidget;

    this.xhr = null;

    // set default values;
    var defaults = {
      className: 'dasmodal',
      idName: 'dasmodal',
      title: 'no content',
      content: '<strong>no content</strong>',
      url: 'undefined',
      preview: false,
      submitButton: false,
      closeButton: true,
      footer: true,
      widget: 'DASLineWidget',
    };

    // set our options if arguments are supplied, otherwise use defaults
    if (arguments[0] && typeof arguments[0] === 'object'){
      this.options = importOptions(defaults, arguments[0]);

      // xhr request to get remote content
      if (this.options.url !== 'undefined'){
        this.xhr = new XMLHttpRequest();
        this.xhr.open('GET', this.options.url, true);
        this.xhr.onload = xhrResponseSetContent.bind(this);
        this.xhr.send();
      }
    }
    else{
      this.options = defaults;
    }
  };

  // public methods
  Modal.prototype.open = function(){
    initialize.call(this);
    addListeners.call(this);
  };

  Modal.prototype.close = function(){
    // remove the overlay
    d3.select('.overlay')
    .remove();

    // remove the modal
    d3.select('.' + this.options.className)
    .transition()
    .style('opacity', 0)
    .remove();

    // set .container-content back to normal
    d3.select('.container-content')
    .selectAll('div')
    .filter(function(){
      if(this.parentNode.className.includes('container-content')){
        return this;
      }
    })
    .transition()
    .delay(100)
    .styles({
      'opacity': '1',
      'filter': 'blur(0px)',
    });

    // set the body back to normal
    d3.select('body')
    .transition()
    .delay(100)
    .style('background-color', '#252839');

    // sometimes the cursor gets stuck, set it back to auto
    d3.select('html')
    .style('cursor', 'auto');

    if (this.options.preview){
      if (d3.select('.widget-preview')._groups[0][0] !== null){
        widget_array[widget_array.length -1].remove();
        widget_array.pop();
        widget_spec_array.pop();
      }
    }
  };

  Modal.prototype.submit = function(){
    this.close();
  }

  // private methods
  function initialize(){
    var content = this.options.content;
    var clientWidth = document.body.clientWidth;
    var clientHeight = document.body.clientHeight;
    var height = 320;
    var width = 280;

    // remove any modals onscreen, we only want one new window open.
    d3.selectAll('.dasmodal')
    .remove();

    if (d3.select('.widget-preview')._groups[0][0] !== null){
      widget_array[widget_array.length -1].remove();
      widget_array.pop();
      widget_spec_array.pop();
    }

    // add a new div, set class, id, and styles, add a div and append a button with style.
    // starts out invisible
    d3.select('body')
    .append('div')
    .classed(this.options.className, true)
    .attr('id', this.options.idName)
    .styles({
      'opacity': 0,
      'position': 'absolute',
      'left': ((clientWidth - width)/2) + 'px',
      'top': ((clientHeight - height)/2) + 'px',
      'height': 'auto',
      'width': 'max-content',
      'min-width': '280px',
      'max-width': '1280px',
      'min-height': '320px',
      'max-height': '720px',
      'border': '2px solid #252525',
      'box-shadow': '0 3px 15px rgba(0,0,0,.8)',
      'background-color': '#252839',
      'text-align': 'center',
    })
    .append('div')
    .classed('dasmodal-header', true)
    .styles({
      'height': '40px',
    })
    .append('button')
    .attr('name', 'close-button')
    .classed('close-x-button', true)
    .text('X');

    // set the body background color to a dark gray
    d3.select('body')
    .transition()
    .delay(100)
    .style('background-color', '#252525');

    // fade any div in our primary container
    d3.select('.container-content')
    .selectAll('div')
    .filter(function(){
      if(this.parentNode.className.includes('container-content')){
        return this;
      }
    })
    .transition()
    .delay(100)
    .styles({
      'opacity': '.2',
      'filter': 'blur(2.5px)',
    });

    // get the computed style of our modal, and parse out width and height
    // this ensures that our modal is centered on the screen
    width = parseInt((window.getComputedStyle(document.getElementById(this.options.className), null).width).split(['px'])[0]);
    height = parseInt((window.getComputedStyle(document.getElementById(this.options.className), null).height).split(['px'])[0]);

    // append our content to the modal
    d3.select('.' + this.options.className)
    .append('div')
    .classed('dasmodal-content', true)
    .styles({
      'text-align': 'left',
      'width': 'max-content',
      'left': ((clientWidth - width)/2) + 'px',
      'top': ((clientHeight - height)/2) + 'px',
      'margin-left': '4px',
      'margin-right': '4px',
    })
    .html(content);

    // append optional items
    // append footer
    if (this.options.footer){
      d3.select('.' + this.options.className)
      .append('div')
      .classed('dasmodal-footer', true)
      .styles({
        'height': '35px',
        'text-align': 'center',
        'margin': '6px 7px -4px 7px', //top right bottom left
        'padding': '0px 0px 0px 0px',
        'vertical-align': 'middle',
      });

      if (this.options.title !== ''){
        d3.select('.dasmodal-header')
        .append('div')
        .classed('modal-title', true)
        .styles({
          'text-align': 'left',
          'float': 'left',
          'padding': '4px',
        })
        .html(this.options.title);
      }
    }

    // append close button
    if (this.options.closeButton){
      d3.select('.dasmodal-footer')
      .append('button')
      .attr('name', 'close-button')
      .classed('close-button', true)
      .styles({
        'float': 'left',
      })
      .text('Close');
    }

    // append submit button
    if (this.options.submitButton){
      d3.select('.dasmodal-footer')
      .append('button')
      .attr('name', 'submit-button')
      .classed('submit-button', true)
      .styles({
        'float': 'right',
      })
      .text('Submit');
    }



       /* // append an invisible overlay for background click events
        d3.select('.container-content')
            .append('div')
            .attr('id', 'overlay')
            .classed('overlay', true)
            .styles({
                'position': 'absolute',
                'top': '0px',
                'left': '0px',
                'height': '100%',
                'width': '100%',
                'opacity': '0',
            });*/


            // make our modal visible
    d3.select('.' + this.options.className)
            .classed(this.options.className + ' draggable', true)
            .transition()
            .delay(100)
            .style('opacity', 1);
  }

  // utility method to add event listeners
  function addListeners(){
    // add an event listener to the close buttons that calls close.
    d3.select('.close-button')
    .on('click', this.close.bind(this));

    d3.select('.close-x-button')
    .on('click', this.close.bind(this));

    // add an event listener to the overlay that calls close
    d3.select('.overlay')
    .on('click', this.close.bind(this));

    // preview event listener routine, only if preview is true and the url is defined
    // this is for widget building
    if (this.options.preview && this.options.url !== 'undefined'){
      addAutoWidgetPreview(this.options);
    }

    // add an event listener for the submit button
    if (this.options.submitButton) {
      if (this.options.preview && this.options.url !== 'undefined'){
        var close = function(){
          submit(formData);
          this.close();
        };
        d3.select('.submit-button')
        .on('click', close.bind(this));
      }
      else{
        d3.select('.submit-button')
        .on('click', this.submit.bind(this));
      }
    }
  }


  // function to add a mutation observer to know when the modal has loaded it's data
  // also adds the event listeners to each field so we know when it's been updated
  function addAutoWidgetPreview(options){
    var timeout;
    numWidget = widget_array.length;

    // add mutation observers to catch when the modal is added, and auto preview the widget
    var target = document.getElementById(options.idName);
    var config = { attributes: true, childList: false, characterData: false };
    var observer = new MutationObserver(function(mutations){
      // if we see a mutation, stop oberserving
      this.disconnect();
      // then create a new FormData object to store the widget builder form data in
      // we then iterate through each input-field class node, and select the first child element (which is an <input> tag)
      // and append the id and value (key:value) pairs to the FormData object
      // we also bind event listeners (change event)
      formData = new FormData();
      d3.select('.dasmodal-content')
      .selectAll('.input-field')
      .selectAll(function(){
        formData.append(this.firstElementChild.id,this.firstElementChild.value);
        this.firstElementChild.addEventListener('change', function(e){
          //                          console.log('\n' + e.target.id);
          //                          console.log(' Old Value: ' + formData.get(e.target.id));
          //                          console.log(' New value: ' + e.target.value );
          formData.set(e.target.id, e.target.value);
          preview(formData, options, numWidget);
        });
        //                        this.firstElementChild.addEventListener('
        //                        maybe add a focus event here? element.hasFocus()
        //                        something maybe and change the help text
      });

      // append the widget type to the FormData
      formData.append('widget', options.widget);

      preview(formData, options, numWidget);
    });
    observer.observe(target, config);
  }

  // submit function
  function submit(formData){
    var name = formData.get('name');

    document.getElementById('container-content').appendChild(document.getElementById(name));
    var left = parseInt((window.getComputedStyle(document.getElementById(name), null).left).split(['px'])[0]);
    var top = parseInt((window.getComputedStyle(document.getElementById(name), null).top).split(['px'])[0]);

    d3.select('.widget-preview')
    .classed('draggable widget-preview', false)

  }

  function preview(formData, options, numWidget){
    var _numWidget = numWidget;
    var post = new XMLHttpRequest();

    //  open to the passed url (/das/build_widget/ should almost always be this)
    post.open('POST', options.url);

    // an anonymous callback function to handle the response on onload
    post.onload = (function(){
      if (post.readyState === post.DONE){
        if (post.status === 200){
          // make sure we dont keep appending new widgets everytime the preview event is fired
          if ((widget_spec_array.length > _numWidget) && (widget_array.length !== 0)){
            widget_array[_numWidget].remove();
            widget_spec_array.pop();
            widget_array.pop();
            timeout = 300;

          }else{
            timeout = 0;
          }
          setTimeout(function(){
            widget_spec_array.push(JSON.parse(post.responseText));
            widget_spec_array[widget_spec_array.length -1].container = '.main';
            widget_spec_array[widget_spec_array.length -1].class_name = 'panel widget draggable widget-preview';
            widget_array.push(new window[widget_spec_array[widget_spec_array.length -1].widget](widget_spec_array[widget_spec_array.length -1], (widget_spec_array - 1)));
          }, timeout);
        }
      }
    }).bind(this);
    // send the form via POST
    post.send(formData);
  }

  // utility method to set properties to the passed in properties
  function importOptions(properties, importedArgs){
    var property;
    // for each property in importedArgs, assign the value to the corresponding key in properties
    for (property in importedArgs){
      if (importedArgs.hasOwnProperty(property)){
        properties[property] = importedArgs[property];
      }
    }
    return properties;
  }

  // utility method to set content to the returned xhr response
  function xhrResponseSetContent(){
    if (this.xhr.readyState === this.xhr.DONE){
      if (this.xhr.status === 200){
        this.options.content = this.xhr.response;
      }
    }
  }
}());
