// implements a simple undo stack for bililiteRange

// version 1.0
// Documentation pending

// depends on bililiteRange.js

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

if (bililiteRange) (function(){

bililiteRange.fn.undo = function(n){
	// this will only work for browsers that support custom events. A polyfill to add input events, addEventListener, dispatchEvent and CustomEvent would work
	if (!CustomEvent) return;
	if (arguments.length == 0) n = 1; // default
	var state = getundostate(this._el);
	if (n > 0)  for (var i = 0; i < n; ++i) restore (state, 'undo', this._el);
	else if (n < 0) for (i = 0; i > n; --i) restore (state, 'redo', this._el)
};

function getundostate(el){
	// the undo stack should not contain any DOM elements so we will not create a circular reference that might create a memory leak
	// if we attach it directly to the element.
	if (el.bililiteRangeUndos) return el.bililiteRangeUndos;
	var state = new undostate (el);
	setuplisteners (el);
	return state;
}

function undostate (el){
	// inefficiently just stores the whole text rather than trying to figure out a diff
	var rng = bililiteRange(el);
	this.text = rng.text();
	this.bounds = rng.bounds('selection').bounds(); 
	this.undo = this; // set up a doubly linked list that never ends (so undo with only one element on the list does nothing) 
	this.redo = this;
	var laststate = el.bililiteRangeUndos;
	if (laststate) {
		this.undo = laststate;
		laststate.redo = this;
	}
	el.bililiteRangeUndos = this;
}

function restore (state, dir, el){
	// dir is 'undo' or 'redo';
	el.dispatchEvent(new CustomEvent(dir)); // signal it
	state = state[dir];
	state.lastevent = dir; // mark the undo/redo so we don't add the change in text to the undo stack
	el.bililiteRangeUndos = state;
	bililiteRange(el).text(state.text).bounds(state.bounds).select(); // restore the old state
}

function setuplisteners (el){
	el.addEventListener('input', function(){
		var state = getundostate(el), lastevent = state.lastevent;
		delete state.lastevent;
		switch (lastevent){
			//  catch input events that we should not save  (resulting from undo, redo and keypress events that are contiguous)
			case 'undo': case 'redo':
				return; // don't record the current input
			case 'keypress':
				// if the last event was also a keypress, drop that one (so we would undo back to the beginning of the typing)
				if (state.penultimateevent == 'keypress') el.bililiteRangeUndos = state.undo;
		}
		(new undostate(el)).penultimateevent = lastevent; // record so we can check for keypress sequences
	});
	// mark events that should not be added to the undo chain
	el.addEventListener('keypress', function(evt){
		// key presses are not added, which means that undo will undo all of them, unless the previous event was not a keypress (meaning we are starting a
		// new series of typing) or we type a carriage return, which starts a new series of typing, or the new keypress is in a different place than the old one
		if (evt.which < 32) return; // nonprinting characters; Firefox tends to send them all. We want them all undone individually
		if (evt.altKey || evt.altGraphKey || evt.ctrlKey || evt.metaKey) return;
		var bounds = bililiteRange(el).bounds('selection').bounds();
		if (bounds[0] != bounds[1]) return; // about to erase a selection; start a new undo sequence
		var state = getundostate(el);
		// only mark this if the previous event was in the same place
		if (state.bounds[0] != bounds[0]) return;
		state.lastevent = 'keypress';
	});	
}

// for use as an event handler
bililiteRange.undo = function (event){
	bililiteRange(event.target).undo();
	event.preventDefault();
}
bililiteRange.redo = function (event){
	bililiteRange(event.target).undo(-1);
	event.preventDefault();
}

// for debugging
function getstack(state, dir){
	dir = dir || 'undo';
	for (var ret = []; ret.push(state), state[dir] != state; state = state[dir]);
	return ret;
}

})();