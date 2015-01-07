// mapping for standard US keyboards. Replace the $.keymap.normal and $.keymap.shift to match your keyboard.
// Assumes that control and alt modified keys are nonprinting!
//
// Updated to use the 2014 proposed W3C DOM events:
// http://www.w3.org/TR/DOM-Level-3-Events/
// http://www.w3.org/TR/DOM-Level-3-Events-key/
// See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.key for how it is currently (2015) implemented
//
// Version: 3.0
// Copyright (c) 2015 Daniel Wachsstock
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

// requires Array.prototype.forEach, so lets me nice to IE8
if ( !Array.prototype.forEach ) {
  Array.prototype.forEach = function(fn, scope) {
    for(var i = 0, len = this.length; i < len; ++i) {
      fn.call(scope, this[i], i, this);
    }
  }
}

// depends on jQuery to normalize the keydown event 
(function($){
	// polyfill for the key and code fields of the event, and sets a new field "keymap" that incorporates 
	// the modifier keys, as in Microsoft's sendkeys function: + for shift, ^ for control, % for alt
	// Shifted keys with a different form do not get the +; thus ^a is control-a; ^A is control-shift-a
	// returns the value of keymap
	// NOTE: modifier keys are intentionally ignored and return undefined
	$.keymap = function (evt){
		var key = evt.key, c = evt.which, shift = evt.shiftKey, ctrl = evt.ctrlKey, alt = evt.altKey;
		if (evt.keymap !== undefined) return evt.keymap; // event has already been handled
		if (key !== undefined){
			// key is implemented; just use what they got
			if (/^(?:shift|control|meta|alt)$/i.test(evt.key)) return;
			// IE (of course!) is different: shifted control characters use the unshifted key code.
			var i = $.keymap.unshiftedchars.indexOf(key);
			if (shift && i !== -1){
				key = $.keymap.shiftedchars[i];
				shift = false;
			}
			if ($.keymap.shiftedchars.indexOf(key) !== -1) shift = false; // already have the key shifted
		}else{
			key = shift ? $.keymap.shift[c] : $.keymap.normal[c];
		}
		if (key === undefined) return;
		if ($.keymap.shiftedchars.indexOf(key) !== -1) shift = false; // already have the key shifted
		var keymap = key; 
		if (alt) keymap = '%' + keymap;
		if (ctrl) keymap = '^' + keymap;
		if (shift) keymap = '+' + keymap;
		keymap = $.keymap.normalize(keymap);
		evt.key = key;
		evt.keymap = keymap;
		return keymap;
	}

	// normalize capitalization	
	var aliases = $.map(
		'Backspace CapsLock Delete Enter Escape Insert NumLock Tab Spacebar PageUp PageDown End Home ArrowLeft ArrowUp ArrowRight ArrowDown'.split(' '),
		function (key){
			return {alias:  new RegExp('\\b'+key+'\\b', 'i'), key: key};
		}
	);
		
	// various other key notations that I want to use
	var aliasgenerator = {
		// VIM notation (and jquery.hotkeys numeric keypad notation)
		'^<(.*)>$': '$1', // strip the brackets
		'\\b(?:k|num_)(\\w+)': '$1', // we do not distinguish the numeric keypad
		//sendkeys notation; strip brackets
		'{(\\w+)}': '$1',
		// the sendkeys aliases
		bksp: 'Backspace',
		bs: 'Backspace',
		del: 'Delete',
		down: 'ArrowDown',
		esc: 'Escape',
		left: 'ArrowLeft',
		right: 'ArrowRight',
		up: 'ArrowUp',
		add: '+',
		subtract: '-',
		multiply: '*',
		divide: '/',
		// hotkeys plugin (https://github.com/jeresig/jquery.hotkeys/blob/master/jquery.hotkeys.js), and modifiers from VIM
		's(hift)?[+-]': '+',
		'c(trl)?[+-]': '^',
		'm(eta)?[+-]': '%', // needs to be before a(lt)- so the met[a-] doesn't match!
		'a(lt)?[+-]': '%',
		decimal: '.',
		// VIM notation (http://polarhome.com/vim/manual/v71/intro.html#key-notation)
		minus: '-',
		point: '.',
		lt: '<',
		'#(\\d+)': 'F$1', // this is documented for ex (http://pubs.opengroup.org/onlinepubs/9699919799/utilities/ex.html#tag_20_40_13_24) but no reason not to include it
		// Jonathan Tang's keycode.js (https://github.com/nostrademons/keycode.js)
		'page_up': 'pgup',
		'page_down': 'pgdn',
		'num\\+': '+',
		'num-': '-',
		'num\\*': '*',
		'num/': '/',
				
		'^\\+(\\w)$': function (match, p1) {return p1.toUpperCase()}, // uppercase shifted letters

		// one exceptions to the standard:
		// I use Spacebar for space, not ' ', since that is used as a separator below
		' ': 'Spacebar',

		'([+^%]+)(.)': function (match, p1, p2) { // normalize the order of shift-ctrl-alt
			return (/\+/.test(p1) ? '+' : '') +
				(/\^/.test(p1) ? '^' : '') +
				(/%/.test(p1) ? '%' : '') + p2;
		},
	};
	for (alias in aliasgenerator){
		// mark whole words
		var key = aliasgenerator[alias];
		if (/^\w/.test(alias)) alias = '\\b'+alias;
		if (/\w$/.test(alias)) alias += '\\b';
		aliases.push({alias: new RegExp(alias, 'i'), key: key});
	}
				
	$.keymap.normalize = function(c){
		aliases.forEach(function(alias) { c=c.replace(alias.alias, alias.key) });
		return c;
	}
	
	$.keymap.normalizeList = function(str){
		// normalize a list of space-delimited characters.
		return $.trim($.map(str.split(/\s+/), $.keymap.normalize).join(' '));
	}
	
	
	$.keymap.normal = {
		 32	: ' ',
		  8	: 'Backspace',
		 20	: 'CapsLock',
		 46	: 'Delete',
		 13	: 'Enter',
		 27	: 'Escape',
		 45	: 'Insert',
		144	: 'NumLock',
		  9	: 'Tab'
	};
	'PageUp PageDown End Home ArrowLeft ArrowUp ArrowRight ArrowDown'.
		split(' ').forEach(function(c,i) {$.keymap.normal[i+33] = c});
	"0123456789"
		.split('').forEach(function(c,i) {$.keymap.normal[i+48] = c});
	$.keymap.normal[59] = ';'; // Firefox only!
	"abcdefghijklmnopqrstuvwxyz"
		.split('').forEach(function(c,i) {$.keymap.normal[i+65] = c});
	"0123456789*+,-./". // numeric keypad keys
		split('').forEach(function(c,i) {$.keymap.normal[i+96] = c});
	for(i=1;i<=12;++i)
		$.keymap.normal[i+111] = 'F'+i; // function keys
	';=,-./`'
		.split('').forEach(function(c,i) {$.keymap.normal[i+186] = c});
	"[\\]'"
		.split('').forEach(function(c,i) {$.keymap.normal[i+219] = c});
	
	$.keymap.shift = {
		192: '~',
		 49: '!',
		 50: '@',
		 51: '#',
		 52: '$',
		 53: '%',
		 54: '^',
		 55: '&',
		 56: '*',
		 57: '(',
		 59: ':', // Firefox only!
		 48: ')',
		189: '_',
		187: '+',
		219: '{',
		220: '|',
		221: '}',
		186: ':',
		222: '"',
		188: '<',
		190: '>',
		191: '?'
	};
		
	"ABCDEFGHIJKLMNOPQRSTUVWYZ"
		.split('').forEach(function(c,i) {$.keymap.shift[i+65] = c});

	// characters that represent already-shifted keys, so should not have the + added.
	$.keymap.shiftedchars = '';
	$.keymap.unshiftedchars = '';
	for (c in $.keymap.shift){
		$.keymap.shiftedchars += $.keymap.shift[c];
		$.keymap.unshiftedchars += $.keymap.normal[c];
	}
	
	// based on John Resig's hotkeys (https://github.com/jeresig/jquery.hotkeys)
	// $.event.special documentation at http://learn.jquery.com/events/event-extensions/
	// use with $(element).on('keydown, {keys: '%1', allowDefault: true}, function(){});
	
	// first, create an index of namespaces to identify each keystroke list
	var nss = {};
	var nsIndex = 0;
	function hotkeysnamespace(keys){
		return nss[keys] || (nss[keys] = 'hotkeys'+ (++nsIndex));
	}
	
	// function to set up the "key" field in keydown and keyup events
	function polyfill (evt, original){
		// do the original filtering
		if (evt.which == null && original != null) {
			event.which = original.charCode != null ? original.charCode : original.keyCode;
		}
		// don't take it for granted that the caller got this right
		if (evt.keymap !== undefined) evt.keymap = $.keymap.normalize (evt.keymap);
		var keymap = $.keymap(evt);
		if (keymap == undefined) return evt;
		var key = keymap.replace (/^([+^%]+)(.+)/, function (match, p1, p2){
			if (/\+/.test(p1) || $.keymap.shiftedchars.indexOf(p2) !== -1) evt.shiftKey = true;
			if (/\^/.test(p1)) evt.ctrlKey = true;
			if (/%/.test(p1)) evt.altKey = true;
			return p2;
		});
		if (key == 'Spacebar') key = ' '; // restore the standard
		evt.key = key;
		return evt;
	}

	["keydown","keyup"].forEach(function(type){
		$.event.fixHooks[type] = {
			props: "char charCode code key keyCode keys hotkeys".split(" "),
			filter: polyfill
		};
		$.event.special[type] = $.event.special[type] || {};
		$.event.special[type].trigger = polyfill;
		$.event.special[type].add = function(handleObj){
			if (!handleObj.data) return;
			var keys = handleObj.data.keys;
			// Use the keys as a sort of namespace for the event. This is a hack for removing the handler later.
			handleObj.namespace = handleObj.namespace.split('.').
				concat(hotkeysnamespace(keys)).sort().join('.'); // add the new namespace in alphabetical order
			if (typeof keys == 'string'){
				// escape RegExp from https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
				keys = keyregexp(
					$.keymap.normalizeList(keys).replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&")
				);
			}else if (keys instanceof RegExp){
				keys = keyregexp(keys.source, keys.ignoreCase);
			}else{
				return;
			}
			var origHandler = handleObj.handler;
			var currSequence = '';
			handleObj.handler = function (event){
				var self = $(this);
				var key = $.keymap(event);
				if (!key) return; // avoid problems with control keys
				currSequence += ' ' + key;
				// find the portion of the current sequence that could be a prefix of the sought keys
				while (currSequence){
					var length = currSequence.split(' ').length-1;
					if (keys[length-1].test(currSequence)){
						var actualkeys = currSequence.slice(1); // remove the initial space
						if (length == keys.length){
							// matched the whole thing
							event.hotkeys = actualkeys;
							self.trigger('keymapcomplete', [actualkeys]);
							currSequence = ''; // restart
							return origHandler.apply(this, arguments);
						}else{								
							self.trigger('keymapprefix', [actualkeys]);
							return !!handleObj.data.allowDefault;
						}
					}
					currSequence = currSequence.replace(/ \S+/, ''); // strip the first key
				}
			};
		};
	});
	
	function keyregexp(source, ignorecase){
		// return an array of regexps to match key sequences in source
		var accum = '';
		return $.map(source.split(' '), function(key) {
			accum += ' '+key;
			return new RegExp('^'+accum+'$', ignorecase ? 'i' : ''); // ^...$ to match the entire key
		});
	}

	function addnamespace (types, keys){
		var ns = '.'+hotkeysnamespace($.keymap.normalizeList(keys));
		return types.replace (/(\S)(\s)|$/g, '$1'+ns+'$2');;
	}
	// monkey patch remove so we can do $(elem).off('keydown', {keys: '^A'}) (basically fake the off('keydown', handler) syntax into accepting an object instead
	var oldRemove = $.event.remove;
	$.event.remove = function (elem, types, handler, selector){
		// remove just looks for the guid to match., so we can fake it out.
		// off(types, object) becomes remove (elem, types, undefined, object)
		// off(types, selector, object) becomes  remove (elem, types, object, selector)
		if (handler === undefined && $.isPlainObject(selector) && selector.keys){
			var args = [elem, addnamespace (types, selector.keys)];
		}else if ($.isPlainObject(handler) && handler.keys){
			args = [elem, addnamespace (types, handler.keys), undefined, selector];
		}else{
			args = arguments;
		}
		return oldRemove.apply(this,args);
	}

})(jQuery);