// create a "status bar" to display messages

// version 2.0
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

	//
	message = Promise.resolve(message).then (
		result => { if (result instanceof Error) throw result; return result } // Errors should be catch'ed, not then'ed 
	);
	this.data('status.promise', message);

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

// monkey patch promise to allow retrieving the promise
const oldPromise = $.fn.promise;
$.fn.promise = function (type){
	if (type !== 'status') return oldPromise.apply (this, arguments);
	return this.data('status.promise');
};

})(jQuery);