// create a "status bar" to display messages and accept line input

// version 1.3
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
	returnPromise: false,
	run: $.noop, // function to which to pass the text to resolve result
	prompt: false,
	initialText: false,
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
	function show($el) {opts.show.call($el);};
	function hide($el) {opts.hide.call($el); $el.promise().done(function() {$el.remove()})};

	if (message) return this.each(function(){
		// just show the message, newest message first
		var span = $('<span>').addClass(classname).text(message).hide().prependTo(this);
		show(span);
		hide(span);
	});
	
	var result = new Promise(function(resolve, reject){
		if (opts.prompt === false){
			// no input needed
			resolve(opts.run());
			return;
		}

		// insert a <label>Prompt <input /></label>
		$('label', self).remove(); // remove any old elements
		// appending at the end makes full-length input elements possible, as in http://stackoverflow.com/questions/773517/style-input-element-to-fill-remaining-width-of-its-container
		var input = $('<label>').hide().appendTo(self);
		var text = typeof opts.initialText == 'string' ? opts.initialText : '';
		// hate to have a nonsemantic wrapper, but we need it to do the full-length trick
		$('<input>').val(text).wrap('<span>').parent().appendTo(input);
		if (opts.initialText === true && 'placeholder' in $('input', input)[0]){
			$('input', input).attr('placeholder', opts.prompt);
		}else{
			$('<strong>').text(opts.prompt).prependTo(input);
		}
		show(input);

		var history = self.data('statusbar.history') || []; // a stack of past commands
		self.data('statusbar.history', history);

		$('input',input).on('keyup', function (evt){
			if (evt.which == 13){ // enter
				history.push(this.value);
				// Promises fail here! The event handler catches the error before the Promise handler does!
				try {	resolve (opts.run(this.value)) }
				catch (e) { reject(e) }
				hide(input);
				return false;
			}else if (evt.which == 27){ // esc
				reject(new Error(opts.cancelMessage));
				hide(input);
				return false;
			}else if (evt.which == 38){ // up arrow
				this.value = history.pop();
				$(this).trigger('input'); // always need to alert when the text changes
			}
		}).on('keypress', function (evt){
			if (evt.which == 13) evt.preventDefault(); // don't pass the return to enclosing forms
		});
		$('input',input)[0].focus(); // focus the input box so input can start		
	});
	
	result.then(function(message) {
		if (message) self.status(message, opts.successClass, opts);
	},function(err){
		if (err.message) self.status(err.message, opts.failureClass, opts);
	});
	
	return opts.returnPromise ? result : this; // chain
};

$.fn.status.defaults = defaults; // expose defaults

})(jQuery);