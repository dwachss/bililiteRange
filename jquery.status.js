// create a "status bar" to display messages
// and ask for user input, returning a Promise

// version 2.1
// Documentation at http://bililite.com/blog/2013/12/11/new-jquery-plugin-statusbar/

// Copyright (c) 2020 Daniel Wachsstock
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

$.fn.status = function(message, {
		display = function() {return this.show().fadeOut(5000)},
		successClass = 'success',
		failureClass = 'failure'
	}={}){

	message = Promise.resolve(message).then (
		result => { if (result instanceof Error) throw result; return result } // Errors should be catch'ed, not then'ed 
	);
	this.data('prompt.promise', message);

	function displayMessage(container, text, which){
		const span = $('<span>').addClass(which).text(text).hide().prependTo(container);
		display.call(span);
		span.promise().done( ()=> span.remove() );
	};

	return this.each( function(){
		message.then( text => {			
			if (this instanceof Node){
				displayMessage (this, text, successClass);
			}else{
				// if we aren't using $().status on a real DOM node, assume we are using $(console or something similar).status
				this.log(text);
			}
		}).catch( err => {
			if (this instanceof Node){
				displayMessage (this, err.message, failureClass);
			}else{
				this.error(err.message);
			}
		});
	});
};

$.fn.statusDisplayer = function (){
	// returns a pair of functions to use in Promise.prototype.then
	return [
		success => {
			this.status(Promise.resolve(success));
			return success;
		},
		failure => {
			this.status(Promise.reject(failure));
			return failure; // status deals with the error, so I should not throw it again
		}
	]
}

$.fn.prompt = function (message = '', defaultValue = ''){
	const container = this[0]; // only ask for input on one element
	const p = new Promise( (resolve, reject) => {
		if (!(container instanceof Node)){
			// not a real element; have to use the modal dialog
			try {
				let response = ((container && 'prompt' in container) ? container : window).prompt(message, defaultValue);
				if (response !== null){
					resolve (response);
				}else{
					reject ($.fn.prompt.cancel);
				}
			}catch(e){
				reject(e);
			}
			return;
		}
		
		// If we get here, then the message container is a real DOM Node. Insert a <label>Prompt <input /></label>
		$('label', container).remove(); // remove any old elements
		// to make a full length input, use container: display: flex; and container input: flex: auto
		const input = $('<label>').hide().appendTo(container);
		$('<input>').val(defaultValue).appendTo(input);
		$('<strong>').text(message).prependTo(input);
		input.show();

		const history = this.data('prompt.history') || []; // a stack of past commands
		this.data('prompt.history', history);

		$('input',input).on('keyup', function (evt){
			if (evt.key == 'Enter'){
				history.push(this.value);
				resolve (this.value);
				input.trigger('focusout').remove(); // Firefox doesn't trigger a blur when the element is removed
				return false;
			}else if (evt.key == 'Escape'){
				reject ($.fn.prompt.cancel);
				input.trigger('focusout').remove(); // Firefox doesn't trigger a blur when the element is removed
				return false;
			}else if (evt.key == 'ArrowUp'){ 
				this.value = history.pop();
				$(this).trigger('input'); // always need to alert when the text changes
			}
		}).on('keypress', function (evt){
			if (evt.key == 'Enter') evt.preventDefault(); // don't pass the return to enclosing forms
		});
		$('input',input)[0].focus(); // focus the input box so input can start		
	});
	this.data ('prompt.promise', p);
	return p;
};

$.fn.prompt.cancel = new Error ('User Canceled');

// monkey patch promise to allow retrieving the promise
const oldPromise = $.fn.promise;
$.fn.promise = function (type){
	if (type !== 'prompt') return oldPromise.apply (this, arguments);
	return this.data('prompt.promise');
};

})(jQuery);