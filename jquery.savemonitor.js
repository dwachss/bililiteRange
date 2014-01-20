// Abstracts the idea of a "dirty" (changed but not saved) and "clean" (saved) file
// documentation: http://bililite.com/blog/2014/01/16/new-jquery-plugin-savemonitor/
// Version 1.0
//  depends: jQuery, Promise

// Copyright (c) 2014 Daniel Wachsstock
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

var states = 'clean failed dirty pending ';

$.savemonitor = function(indicator){
	$indicator = $(indicator);
	var savemonitor = new Savemonitor();
	savemonitor.on(states, function(event){
		$indicator.removeClass(states).addClass(event.type);
	});
	savemonitor.trigger();
	return savemonitor;
};

$.fn.savemonitor = function(indicator){
	var savemonitor = this.data('savemonitor');
	if (!savemonitor){
		savemonitor = $.savemonitor(indicator);
		this.data('savemonitor', savemonitor);
		this.on('input', savemonitor.setter('dirty'));
	}
	return savemonitor;
};

// export the list
$.savemonitor.states = states;

function Savemonitor(){
	var self = this;
	var state = 'clean'; // make this private!
	self.setter = function(newstate){ // note that this does not set the state, it returns a function to set the state.
		return function(){
			if (states.indexOf(newstate+' ') == -1) return;
			// only flag changes in state
			if (state == newstate) return;
			// if a change happened 
			// from the time we started saving to the time that the save completed,  the save is out of date; don't accept a clean or fail
			// So if we are dirty now, we ignore all changes except for the 'start saving' one
			if (state == 'dirty' && newstate != 'pending') return;
			// if it's clean, don't bother signaling another save
			if (state == 'clean' && newstate != 'dirty') return;
			state = newstate;
			self.trigger();
		};
	};
	self.state = function(){
		return state;
	}
	self.trigger = function(){
		$(self).triggerHandler(state); // $().trigger also calls methods with the same name, so we end up in an infinite loop
	}
}

Savemonitor.prototype = {
	clean: function (resolver){
		this.setter('pending')();
		Promise.cast(resolver).then(this.setter('clean'), this.setter('failed'));
	},
	
	dirty: function (){
		this.setter('dirty')();
	},
	
	on: function(){
		$.fn.on.apply($(this), arguments);
	}, 
	
	off: function(){
		$.fn.off.apply($(this), arguments);
	}
};

})(jQuery);