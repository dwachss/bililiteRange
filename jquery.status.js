// create a "status bar" to display messages and accept line input

// version 1.0
// Documentation at http://bililite.com/blog/2013/12/11/new-jquery-plugin-statusbar/

// Copyright (c) 2013 Daniel Wachsstock
// MIT license:
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

(function($){

var defaults = {
	show: $.fn.show,
	hide: function() {return this.fadeOut(5000)},
	result: undefined,
	run: $.noop, // function to which to pass the text to resolve result
	prompt: false,
	successClass: 'success',
	failureClass: 'failure',
	cancelMessage: 'User Canceled'
};

$.fn.status = function(message, classname, opts){
	if (typeof message != 'string'){
		// shift arguments
		opts = message;
		message = undefined;
	}else if (typeof classname != 'string'){
		opts = classname;
		classname = '';
	}

	opts = $.extend({}, defaults, opts)
	var self = this;

	if (message) return this.each(function(){
		// just show the message
		var span = $('<span>').addClass(classname).text(message).hide().appendTo(this);
		opts.show.call(span);
		opts.hide.call(span);
		span.promise().done(function() {span.remove()});
	});
	
	if (!opts.result) opts.result = $.Deferred();

	function resolve (text){
		try{
			opts.result.resolve({message: opts.run(text)});
		}catch(e){
			opts.result.reject({message: e.message});
		}
	}
		
	opts.result.done(function(data) {
		if (data.message) self.status(data.message, opts.successClass, opts);
	}).fail(function(data){
		if (data.message) self.status(data.message, opts.failureClass, opts);
	});
		
	if (opts.result.state() != 'pending') return; // nothing more to do; the result has already been resolved
		
	if (opts.prompt === false) resolve(); // no input needed
		
	if (opts.result.state() == 'pending'){
		// we need to actually do something!
		var input = createinput(this, opts); // this actually returns the label that contains the input
		var history = this.data('statusbar.history') || []; // a stack of past commands
		this.data('statusbar.history', history);
		$('input',input).on('keyup', function (evt){
			if (evt.which == 13){ // enter
				history.push(this.value);
				resolve (this.value);
				return false;
			}else if (evt.which == 27){ // esc
				opts.result.reject({message: opts.cancelMessage});
				return false;
			}else if (evt.which == 38){ // up arrow
				this.value = history.pop();
				$(this).trigger('input'); // always need to alert when the text changes
			}
		}).on('keypress', function (evt){
			if (evt.which == 13) evt.preventDefault(); // don't pass the return to enclosing forms
		});
		$('input',input)[0].focus();
	}
	return this; // chain
};

$.fn.status.defaults = defaults; // expose defaults


function createinput(container, options){
	// inserts a <label>Prompt: <input/></label> in container
	var oldtext = $('label input', container).val(); // use the old text if it exists
	$('label', container).remove(); // remove any old elements
	var inputlabel = $('<label>').hide().text(options.prompt).prependTo(container);
	$('<input>').appendTo(inputlabel).val(oldtext);
	options.result.always(function(){
		// when we're done, get rid of the element
		options.hide.call(inputlabel);
		inputlabel.promise().done(function() {inputlabel.remove()});
	});
	options.show.call(inputlabel);
	return inputlabel;
}
})(jQuery);