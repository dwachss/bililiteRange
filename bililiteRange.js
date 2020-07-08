
(function(){

bililiteRange = function(el, debug){
	var ret;
	if (debug){
		ret = new NothingRange(); // Easier to force it to use the no-selection type than to try to find an old browser
	}else if (el.setSelectionRange){
		// Element is an input or textarea 
		// note that some input elements do not allow selections
		try{
			el.selectionStart; // even getting the selection in such an element will throw
			ret = new InputRange();
		}catch(e){
			ret = new NothingRange();
		}
	}else{
		// Standards, with any other kind of element
		ret = new W3CRange();
	}
	ret._el = el;
	// determine parent document, as implemented by John McLear <john@mclear.co.uk>
	ret._doc = el.ownerDocument;
	ret._win = 'defaultView' in ret._doc ? ret._doc.defaultView : ret._doc.parentWindow;
	ret._bounds = [0, ret.length()];
	
	// selection tracking. We want clicks to set the selection to the clicked location but tabbing in or element.focus() should restore
	// the selection to what it was.
	// There's no good way to do this. I just assume that a mousedown (or a drag and drop
	// into the element) within 100 ms of the focus event must have caused the focus, and
	// therefore we should not restore the selection.
	if (! ('bililiteRangeSelection' in el)){ // we haven't processed this element yet
		// track the selection.
		el.bililiteRangeSelection = [0,0];
		ret.listen('focusout', () => el.bililiteRangeSelection = ret._nativeSelection() );
		
		ret.listen('mousedown', evt => {
			el.mousetime = evt.timeStamp;
		})
		ret.listen('drop', evt => {
			el.mousetime = evt.timeStamp;
		})
		ret.listen('focus', evt => {
			if ('mousetime' in el && evt.timeStamp - el.mousetime < 100) return;
			ret._nativeSelect(ret._nativeRange(el.bililiteRangeSelection))
		})

		// DOM 3 input events, https://www.w3.org/TR/input-events-1/
		// have a data field with the text inserted, but thatisn't enough to fully describe the change;
		// we need to know the old text (or at least its length)
		// and *where* the new text was inserted.
		// So we enhance input events with that information. 
		// the "newText" should always be the same as the 'data' field, if it is defined
		ret.listen ('beforeinput', () => el.bililiteRangeOldText = ret.all() );
		ret.listen('input', evt => {
			const newText = ret.all();
			if (!evt.bililiteRange){
				evt.bililiteRange = diff (el.bililiteRangeOldText, newText);
				if (evt.bililiteRange.unchanged){
					// no change. Assume that whatever happened, happened at the selection point (and use whatever data the browser gives us).
					evt.bililiteRange.start = ret.clone().bounds('selection')[1] - (evt.data || '').length,
				}
			}
		});
	}
	
	return ret;
}

function diff (oldText, newText){
	// Try to find the changed text, assuming it was a continuous change
	if (oldText == newText){
		return {
			unchanged: true,
			start: 0,
			oldText,
			newText
		}
	}

	const oldlen = oldText.length;
	const	newlen = newText.length;
	for (var i = 0; i < newlen && i < oldlen; ++i){
		if (newText.charAt(i) != oldText.charAt(i)) break;
	}
	const start = i;
	for (i = 0; i < newlen && i < oldlen; ++i){
		let newpos = newlen-i-1, oldpos = oldlen-i-1;
		if (newpos < start || oldpos < start) break;
		if (newText.charAt(newpos) != oldText.charAt(oldpos)) break;
	}
	const oldend = oldlen-i;
	const newend = newlen-i;
	return {
		start,
		oldText: oldText.slice(start, oldend),
		newText: newText.slice(start, newend)
	}
};
bililiteRange.diff = diff; // expose

// convenience function for defining input events
function inputEventInit(type, originalText, newText, start, inputType){
	return {
		type,
		inputType,
		data: newText,
		bubbles: true,
		bililiteRange: {
			unchanged: (originalText == newText),
			start,
			originalText,
			newText
		}
	};
}

// base class
function Range(){}
Range.prototype = {
	length: function() {
		return this._el[this._textProp].length;
	},
	bounds: function(s){
		if (bililiteRange.bounds[s]){
			this._bounds = bililiteRange.bounds[s].apply(this);
		}else if (s){
			this._bounds = s; // don't do error checking now; things may change at a moment's notice
		}else{
			// constrain bounds now
			var b = [
				Math.max(0, Math.min (this.length(), this._bounds[0])),
				Math.max(0, Math.min (this.length(), this._bounds[1]))
			];
			b[1] = Math.max(b[0], b[1]);
			return b;
		}
		return this; // allow for chaining
	},
	 // allow use of range[0]  and range[1] for start and end of bounds 
	get 0(){
		return this.bounds()[0];
	},
	set 0(x){
		this.bounds([x, this[1]]);
		return x;
	},
	get 1(){
		return this.bounds()[1];
	},
	set 1(x){
		this.bounds([this[0], x]);
		return x;
	},
	select: function(){
		var b = this._el.bililiteRangeSelection = this.bounds();
		if (this._el === this._doc.activeElement){
			// only actually select if this element is active!
			this._nativeSelect(this._nativeRange(b));
		}
		this.dispatch({type: 'select', bubbles: true});
		return this; // allow for chaining
	},
	text: function(text, select, inputType = 'insertText'){
		if (arguments.length){
			let bounds = this.bounds(), el = this._el;
			let eventparams = [this.text(), text, this[0], inputType];
			this.dispatch (inputEventInit('beforeinput',...eventparams));
			this._nativeSetText(text, this._nativeRange(bounds));
			if (select == 'start'){
				this[1] = this[0];
			}else if (select == 'end'){
				this[0] += text.length;
				this[1] = this[0];
			}else if (select == 'all'){
				this[1] = this[0]+text.length;
			}
			this.dispatch (inputEventInit('input',...eventparams));
			return this; // allow for chaining
		}else{
			return this._nativeGetText(this._nativeRange(this.bounds()));
		}
	},
	insertEOL: function (){
		this._nativeEOL();
		this._bounds = [this._bounds[0]+1, this._bounds[0]+1]; // move past the EOL marker
		return this;
	},
	sendkeys: function (text){
		var self = this;
		this.data().sendkeysOriginalText = this.text();
		this.data().sendkeysBounds = undefined;
		function simplechar (rng, c){
			if (/^{[^}]*}$/.test(c)) c = c.slice(1,-1);	// deal with unknown {key}s
			rng.text(c, 'end');
		}
		text.replace(/{[^}]*}|[^{]+|{/g, function(part){
			(bililiteRange.sendkeys[part] || simplechar)(self, part, simplechar);
		});
		this.bounds(this.data().sendkeysBounds);
		this.dispatch({type: 'sendkeys', which: text});
		return this;
	},
	top: function(){
		return this._nativeTop(this._nativeRange(this.bounds()));
	},
	scrollIntoView: function(scroller){
		var top = this.top();
		// scroll into position if necessary
		if (this._el.scrollTop > top || this._el.scrollTop+this._el.clientHeight < top){
			if (scroller){
				scroller.call(this._el, top);
			}else{
				this._el.scrollTop = top;
			}
		}
		return this;
	},
	wrap: function (n){
		this._nativeWrap(n, this._nativeRange(this.bounds()));
		return this;
	},
	selection: function(text){
		if (arguments.length){
			return this.bounds('selection').text(text, 'end').select();
		}else{
			return this.bounds('selection').text();
		}
	},
	clone: function(){
		return bililiteRange(this._el).bounds(this.bounds());
	},
	all: function(text){
		if (arguments.length){
			this.dispatch ({type: 'beforeinput', bubbles: true, data: text});
			this._el[this._textProp] = text;
			this.dispatch ({type: 'input', bubbles: true, data: text});
			return this;
		}else{
			return this._el[this._textProp];
		}
	},
	element: function() { return this._el },
	dispatch: function(opts = {}){
		var event = new Event (opts.type, opts);
		for (prop in opts) try { event[prop] = opts[prop] } catch(e){}; // ignore read-only errors for properties that were copied in the previous line
		// dispatch event asynchronously (in the sense of on the next turn of the event loop; still should be fired in order of dispatch
		setTimeout( () => this._el.dispatchEvent(event), 0);
		return this;
	},
	listen: function (type, func = console.log){
		this._el.addEventListener(type, func);
		return this;
	},
	dontlisten: function (type, func = console.log){
		this._el.removeEventListener(type, func);
		return this;
	}
};

// allow extensions ala jQuery
bililiteRange.fn = Range.prototype; // to allow monkey patching
bililiteRange.extend = function(fns){
	for (fn in fns) Range.prototype[fn] = fns[fn];
};

//bounds functions
bililiteRange.bounds = {
	all: function() { return [0, this.length()] },
	start: function () { return [0,0] },
	end: function () { return [this.length(), this.length()] },
	selection: function(){
		if (this._el === this._doc.activeElement){
			this.bounds ('all'); // first select the whole thing for constraining
			return this._nativeSelection();
		}else{
			return this._el.bililiteRangeSelection;
		}
	}
};

// sendkeys functions
bililiteRange.sendkeys = {
	'{enter}': function (rng){
		rng.insertEOL();
	},
	'{tab}': function (rng, c, simplechar){
		simplechar(rng, '\t'); // useful for inserting what would be whitespace
	},
	'{newline}': function (rng, c, simplechar){
		simplechar(rng, '\n'); // useful for inserting what would be whitespace (and if I don't want to use insertEOL, which does some fancy things)
	},
	'{backspace}': function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) rng.bounds([b[0]-1, b[0]]); // no characters selected; it's just an insertion point. Remove the previous character
		rng.text('', 'end'); // delete the characters and update the selection
	},
	'{del}': function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) rng.bounds([b[0], b[0]+1]); // no characters selected; it's just an insertion point. Remove the next character
		rng.text('', 'end'); // delete the characters and update the selection
	},
	'{rightarrow}':  function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) ++b[1]; // no characters selected; it's just an insertion point. Move to the right
		rng.bounds([b[1], b[1]]);
	},
	'{leftarrow}': function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) --b[0]; // no characters selected; it's just an insertion point. Move to the left
		rng.bounds([b[0], b[0]]);
	},
	'{selectall}' : function (rng){
		rng.bounds('all');
	},
	'{selection}': function (rng){
		// insert the characters without the sendkeys processing
		var s = rng.data().sendkeysOriginalText;
		rng.text(s, 'end');
	},
	'{mark}' : function (rng){
		rng.data().sendkeysBounds = rng.bounds();
	}
};
// Synonyms from the proposed DOM standard (http://www.w3.org/TR/DOM-Level-3-Events-key/)
bililiteRange.sendkeys['{Enter}'] = bililiteRange.sendkeys['{enter}'];
bililiteRange.sendkeys['{Backspace}'] = bililiteRange.sendkeys['{backspace}'];
bililiteRange.sendkeys['{Delete}'] = bililiteRange.sendkeys['{del}'];
bililiteRange.sendkeys['{ArrowRight}'] = bililiteRange.sendkeys['{rightarrow}'];
bililiteRange.sendkeys['{ArrowLeft}'] = bililiteRange.sendkeys['{leftarrow}'];

// an input element in a standards document. "Native Range" is just the bounds array
function InputRange(){}
InputRange.prototype = new Range();
InputRange.prototype._textProp = 'value';
InputRange.prototype._nativeRange = function(bounds) {
	return bounds || [0, this.length()];
};
InputRange.prototype._nativeSelect = function (rng){
	this._el.setSelectionRange(rng[0], rng[1]);
};
InputRange.prototype._nativeSelection = function(){
	return [this._el.selectionStart, this._el.selectionEnd];
};
InputRange.prototype._nativeGetText = function(rng){
	return this._el.value.substring(rng[0], rng[1]);
};
InputRange.prototype._nativeSetText = function(text, rng){
	var val = this._el.value;
	this._el.value = val.substring(0, rng[0]) + text + val.substring(rng[1]);
};
InputRange.prototype._nativeEOL = function(){
	this.text('\n');
};
InputRange.prototype._nativeTop = function(rng){
	// I can't remember where I found this clever hack to find the location of text in a text area
	var clone = this._el.cloneNode(true);
	clone.style.visibility = 'hidden';
	clone.style.position = 'absolute';
	this._el.parentNode.insertBefore(clone, this._el);
	clone.style.height = '1px';
	clone.value = this._el.value.slice(0, rng[0]);
	var top = clone.scrollHeight;
	// this gives the bottom of the text, so we have to subtract the height of a single line
	clone.value = 'X';
	top -= clone.scrollHeight;
	clone.parentNode.removeChild(clone);
	return top;
}
InputRange.prototype._nativeWrap = function() {throw new Error("Cannot wrap in a text element")};

function W3CRange(){}
W3CRange.prototype = new Range();
W3CRange.prototype._textProp = 'textContent';
W3CRange.prototype._nativeRange = function (bounds){
	var rng = this._doc.createRange();
	rng.selectNodeContents(this._el);
	if (bounds){
		w3cmoveBoundary (rng, bounds[0], true, this._el);
		rng.collapse (true);
		w3cmoveBoundary (rng, bounds[1]-bounds[0], false, this._el);
	}
	return rng;					
};
W3CRange.prototype._nativeSelect = function (rng){
	this._win.getSelection().removeAllRanges();
	this._win.getSelection().addRange (rng);
};
W3CRange.prototype._nativeSelection = function (){
	// returns [start, end] for the selection constrained to be in element
	var rng = this._nativeRange(); // range of the element to constrain to
	if (this._win.getSelection().rangeCount == 0) return [this.length(), this.length()]; // append to the end
	var sel = this._win.getSelection().getRangeAt(0);
	return [
		w3cstart(sel, rng),
		w3cend (sel, rng)
	];
};
W3CRange.prototype._nativeGetText = function (rng){
	return rng.toString();
};
W3CRange.prototype._nativeSetText = function (text, rng){
	rng.deleteContents();
	rng.insertNode (this._doc.createTextNode(text));
	this._el.normalize(); // merge the text with the surrounding text
};
W3CRange.prototype._nativeEOL = function(){
	var rng = this._nativeRange(this.bounds());
	rng.deleteContents();
	var br = this._doc.createElement('br');
	br.setAttribute ('_moz_dirty', ''); // for Firefox
	rng.insertNode (br);
	rng.insertNode (this._doc.createTextNode('\n'));
	rng.collapse (false);
};
W3CRange.prototype._nativeTop = function(rng){
	if (this.length == 0) return 0; // no text, no scrolling
	if (rng.toString() == ''){
		var textnode = this._doc.createTextNode('X');
		rng.insertNode (textnode);
	}
	var startrng = this._nativeRange([0,1]);
	var top = rng.getBoundingClientRect().top - startrng.getBoundingClientRect().top;
	if (textnode) textnode.parentNode.removeChild(textnode);
	return top;
}
W3CRange.prototype._nativeWrap = function(n, rng) {
	rng.surroundContents(n);
};

// W3C internals
function nextnode (node, root){
	//  in-order traversal
	// we've already visited node, so get kids then siblings
	if (node.firstChild) return node.firstChild;
	if (node.nextSibling) return node.nextSibling;
	if (node===root) return null;
	while (node.parentNode){
		// get uncles
		node = node.parentNode;
		if (node == root) return null;
		if (node.nextSibling) return node.nextSibling;
	}
	return null;
}
function w3cmoveBoundary (rng, n, bStart, el){
	// move the boundary (bStart == true ? start : end) n characters forward, up to the end of element el. Forward only!
	// if the start is moved after the end, then an exception is raised
	if (n <= 0) return;
	var node = rng[bStart ? 'startContainer' : 'endContainer'];
	if (node.nodeType == 3){
	  // we may be starting somewhere into the text
	  n += rng[bStart ? 'startOffset' : 'endOffset'];
	}
	while (node){
		if (node.nodeType == 3){
			var length = node.nodeValue.length;
			if (n <= length){
				rng[bStart ? 'setStart' : 'setEnd'](node, n);
				// special case: if we end next to a <br>, include that node.
				if (n == length){
					// skip past zero-length text nodes
					for (var next = nextnode (node, el); next && next.nodeType==3 && next.nodeValue.length == 0; next = nextnode(next, el)){
						rng[bStart ? 'setStartAfter' : 'setEndAfter'](next);
					}
					if (next && next.nodeType == 1 && next.nodeName == "BR") rng[bStart ? 'setStartAfter' : 'setEndAfter'](next);
				}
				return;
			}else{
				rng[bStart ? 'setStartAfter' : 'setEndAfter'](node); // skip past this one
				n -= length; // and eat these characters
			}
		}
		node = nextnode (node, el);
	}
}
var     START_TO_START                 = 0; // from the w3c definitions
var     START_TO_END                   = 1;
var     END_TO_END                     = 2;
var     END_TO_START                   = 3;
// from the Mozilla documentation, for range.compareBoundaryPoints(how, sourceRange)
// -1, 0, or 1, indicating whether the corresponding boundary-point of range is respectively before, equal to, or after the corresponding boundary-point of sourceRange. 
    // * Range.END_TO_END compares the end boundary-point of sourceRange to the end boundary-point of range.
    // * Range.END_TO_START compares the end boundary-point of sourceRange to the start boundary-point of range.
    // * Range.START_TO_END compares the start boundary-point of sourceRange to the end boundary-point of range.
    // * Range.START_TO_START compares the start boundary-point of sourceRange to the start boundary-point of range. 
function w3cstart(rng, constraint){
	if (rng.compareBoundaryPoints (START_TO_START, constraint) <= 0) return 0; // at or before the beginning
	if (rng.compareBoundaryPoints (END_TO_START, constraint) >= 0) return constraint.toString().length;
	rng = rng.cloneRange(); // don't change the original
	rng.setEnd (constraint.endContainer, constraint.endOffset); // they now end at the same place
	return constraint.toString().length - rng.toString().length;
}
function w3cend (rng, constraint){
	if (rng.compareBoundaryPoints (END_TO_END, constraint) >= 0) return constraint.toString().length; // at or after the end
	if (rng.compareBoundaryPoints (START_TO_END, constraint) <= 0) return 0;
	rng = rng.cloneRange(); // don't change the original
	rng.setStart (constraint.startContainer, constraint.startOffset); // they now start at the same place
	return rng.toString().length;
}

function NothingRange(){
	// Bugfix for https://github.com/dwachss/bililiteRange/issues/18 
	// Adding typeof check of string for el.value in case for li elements
	if (typeof this._el.value === 'string'){
		this._textProp = 'value';
	}else{
		this._textProp = 'textContent';
	}
}
NothingRange.prototype = new Range();
NothingRange.prototype._nativeRange = function(bounds) {
	return bounds || [0,this.length()];
};
NothingRange.prototype._nativeSelect = function (rng){ // do nothing
};
NothingRange.prototype._nativeSelection = function(){
	return [0,0];
};
NothingRange.prototype._nativeGetText = function (rng){
	return this._el[this._textProp].substring(rng[0], rng[1]);
};
NothingRange.prototype._nativeSetText = function (text, rng){
	var val = this._el[this._textProp];
	this._el[this._textProp] = val.substring(0, rng[0]) + text + val.substring(rng[1]);
};
NothingRange.prototype._nativeEOL = function(){
	this.text('\n');
};
NothingRange.prototype._nativeTop = function(){
	return 0;
};
NothingRange.prototype._nativeWrap = function() {throw new Error("Wrapping not implemented")};


// data for elements, similar to jQuery data, but allows for monitoring with custom events
var data = []; // to avoid attaching javascript objects to DOM elements, to avoid memory leaks
bililiteRange.fn.data = function(){
	var index = this.element().bililiteRangeData;
	if (index == undefined){
		index = this.element().bililiteRangeData = data.length;
		data[index] = new Data(this);
	}
	return data[index];
}
var Data = function(rng) {
	Object.defineProperty(this, 'values', {
		value: {}
	});
	Object.defineProperty(this, 'sourceRange', {
		value: rng
	});
	// JSON.stringify(rng.data()) only shows properties that were defined with
	// bililiteRange.data ('propertyname') that were actually set for rng.
	Object.defineProperty(this, 'toJSON', {
		value: function(){
			var ret = {};
			for (var i in Data.prototype) if (i in this.values) ret[i] = this.values[i];
			return ret;
		}
	});
	// to display all the properties (not just those changed), use JSON.stringify(rng.data().all)
	Object.defineProperty(this, 'all', {
		get: function(){
			var ret = {};
			for (var i in Data.prototype) ret[i] = this[i];
			return ret;
		}
	});
}

Data.prototype = {};
Object.defineProperty(Data.prototype, 'values', { // default values of data properties
	value: {}
});
Object.defineProperty(Data.prototype, 'monitored', {
	value: {}
});

bililiteRange.data = function (name, newdesc = {}){
	var desc = Object.getOwnPropertyDescriptor(Data.prototype, name) || {};
	if ('enumerable' in newdesc) desc.enumerable = !!newdesc.enumerable;
	if (!('enumerable' in desc)) desc.enumerable = true; // default
	if ('value' in newdesc) Data.prototype.values[name] = newdesc.value;
	if ('monitored' in newdesc) Data.prototype.monitored[name] = newdesc.monitored;
	desc.configurable = true;
	desc.get = function (){
		if (name in this.values) return this.values[name];
		return Data.prototype.values[name];
	};
	let attr = `data-${name}`;
	desc.set = function (value){
		this.values[name] = value;
		if (Data.prototype.monitored[name]){
			// signal in two ways
			this.sourceRange.dispatch({ type: attr, bubbles: true, detail: value });
			try{
				this.sourceRange.element().setAttribute (attr, value); // illegal attribute names will throw. Ignore it			
			}
		}
	}
	Object.defineProperty(Data.prototype, name, desc);
}

})();
