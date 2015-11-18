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

// requires Array.prototype.forEach, so lets be nice to IE8
if ( !Array.prototype.forEach ) {
  Array.prototype.forEach = function(fn, scope) {
    for(var i = 0, len = this.length; i < len; ++i) {
      fn.call(scope, this[i], i, this);
    }
  }
}

(function($){
	// polyfill for the key field of the event, and sets a new field "keymap" that incorporates 
	// the modifier keys, as in Microsoft's sendkeys function: + for shift, ^ for control, % for alt
	// Shifted keys with a different form do not get the +; thus ^a is control-a; ^A is control-shift-a
	// returns the value of keymap
	// NOTE: modifier keys alone are intentionally ignored and return undefined
	// NOTE: assumes only unmodified and shifted and AltGr'd keys are printable; this is false for a lot of non-English keyboards
	// that use the CapsLock modifiers. Until KeyboardEvent.getModifierState (https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.getModifierState)
	// is implemented consistently, I suspect that will be impossible.
	// NOTE: tries to implement the meta key but I'm not sure if it works (I only have a Windows machine on which to test this)
	
	// original keymap plugin returned the mapped keys
	$.keymap = function (evt){
		return $.keymap.normalize(evt).keymap;
	}

	// this is the meat of the plugin.
	$.keymap.normalize = function (evt){
		if (evt.keymap == null){
			var key = evt.key,
				shift = evt.shiftKey, ctrl = evt.ctrlKey, alt = evt.altKey, meta = evt.metaKey,
				altGr = ctrl && alt; // this seems to be the standard for the alt-graphics key, http://stackoverflow.com/questions/17857404/why-does-alt-gr-have-the-same-keycode-as-ctrl
			if (key != null){
				// key is implemented; just use what they got

				if (/^(?:shift|control|meta|alt)$/i.test(key)) return evt; // ignore modifier keys alone

				// IE (of course!) is different: shifted control characters use the unshifted key code.
				var i = keymaps.normal.indexOf(key);
				if (shift && i !== -1) key = keymaps.shift.charAt(i); // fix it
				// shift-altGr is not a problem, since that would require meta-alt-ctrl-shift, and Windows doesn't do meta
			}else{
				// need to use the character map
				var c = evt.which != null ? evt.which : evt.charCode != null ? evt.charCode : evt.keyCode;
				key = charcodes[c];
				if (typeof key === 'number'){
					if (shift && altGr && keymaps.shift_alt.charCodeAt(key) !== 0){
						key = keymaps.shift_alt.charAt(key);
					}else if (altGr && keymaps.alt.charCodeAt(key) != 0){
						key = keymaps.alt.charAt(key);
					}else if (shift && keymaps.shift.charCodeAt(key) != 0){
						key = keymaps.shift.charAt(key);
					}else{
						key = keymaps.normal.charAt(key);
					}
				}
			}
			if (key == null) return evt; // not a known key
			if (keymaps.shift_alt.indexOf(key) !== -1) shift = alt = ctrl = false;  // already have the key shifted; don't mark the keymap with a +
			if (keymaps.shift.indexOf(key) !== -1) shift = false;
			if (keymaps.alt.indexOf(key) !== -1) alt = ctrl = false;
			evt.keymap = key; 
			if (meta) evt.keymap = '~' + evt.keymap;
			if (alt) evt.keymap = '%' + evt.keymap;
			if (ctrl) evt.keymap = '^' + evt.keymap;
			if (shift) evt.keymap = '+' + evt.keymap;
		}
		evt.keymap = $.keymap.normalizeString(evt.keymap); // this may be inefficiently normalizing the string multiple times if we reuse the event
		// now renormalize the key itself
		evt.shiftKey = evt.ctrlKey = evt.altKey = false;
		evt.key = evt.keymap.replace (/^([+^%~]*)(.+)/, function (match, p1, p2){
			if (/\+/.test(p1) || keymaps.shift.indexOf(p2) !== -1 || keymaps.shift_alt.indexOf(p2) !== -1) evt.shiftKey = true; // TODO: deal with altGr
			if (/\^/.test(p1) || keymaps.alt.indexOf(p2) !== -1 || keymaps.shift_alt.indexOf(p2) !== -1) evt.ctrlKey = true;
			if (/%/.test(p1) || keymaps.alt.indexOf(p2) !== -1 || keymaps.shift_alt.indexOf(p2) !== -1) evt.altKey = true;
			if (/~/.test(p1)) evt.metaKey = true;
			return p2;
		});
		if (evt.key == 'Spacebar') evt.key = ' '; // restore the standard
		return evt;
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
		// new notation for Menu button
		apps: 'ContextMenu',
		menu: 'ContextMenu',
		// VIM notation (and jquery.hotkeys numeric keypad notation)
		'^<(.*)>$': '$1', // strip the brackets
		'\\b(?:k|num_)(\\w+)': '$1', // we do not distinguish the numeric keypad
		//sendkeys notation; strip brackets
		'{(\\w+)}': '$1',
		// the sendkeys aliases
		bksp: 'Backspace',
		bs: 'Backspace',
		del: 'Delete',
		esc: 'Escape',
		down: 'ArrowDown',
		left: 'ArrowLeft',
		right: 'ArrowRight',
		up: 'ArrowUp',
		downarrow: 'ArrowDown',
		leftarrow: 'ArrowLeft',
		rightarrow: 'ArrowRight',
		uparrow: 'ArrowUp',
		add: '+',
		subtract: '-',
		multiply: '*',
		divide: '/',
		// hotkeys plugin (https://github.com/jeresig/jquery.hotkeys/blob/master/jquery.hotkeys.js), and modifiers from VIM
		's(hift)?[+-]': '+',
		'c(trl)?[+-]': '^',
		'm(eta)?[+-]': '~', // needs to be before a(lt)- so the met[a-] doesn't match!
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

		'([+^%~]+)(.)': function (match, p1, p2) { // normalize the order of shift-ctrl-alt
			return (/\+/.test(p1) ? '+' : '') +
				(/\^/.test(p1) ? '^' : '') +
				(/%/.test(p1) ? '%' : '') +
				(/~/.test(p1) ? '~' : '') + p2;
		},
	};
	for (alias in aliasgenerator){
		// mark whole words
		var key = aliasgenerator[alias];
		if (/^\w/.test(alias)) alias = '\\b'+alias;
		if (/\w$/.test(alias)) alias += '\\b';
		aliases.push({alias: new RegExp(alias, 'i'), key: key});
	}
				
	$.keymap.normalizeString = function(s){
		aliases.forEach(function(alias) { s=s.replace(alias.alias, alias.key) });
		return s;
	}
	
	$.keymap.normalizeList = function(str){
		// normalize a list of space-delimited characters.
		return $.trim($.map(str.split(/\s+/), $.keymap.normalizeString).join(' '));
	}
	
	var charcodes = {
		 32	: ' ',
		  8	: 'Backspace',
		 20	: 'CapsLock',
		 93	: 'ContextMenu',
		 46	: 'Delete',
		 13	: 'Enter',
		 27	: 'Escape',
		 45	: 'Insert',
		144	: 'NumLock',
		  9	: 'Tab'
	};
	'PageUp PageDown End Home ArrowLeft ArrowUp ArrowRight ArrowDown'.
		split(' ').forEach(function(c,i) {charcodes[i+33] = c});
	"0123456789*+,-./". // numeric keypad keys
		split('').forEach(function(c,i) {charcodes[i+96] = c});
	for(i=1;i<=12;++i)
		charcodes[i+111] = 'F'+i; // function keys
	
	// the numeric codes in order for the keyboard I'm using (from Virtualkeyboard; standard 101 keyboard
	// but '\' key to the right of '=', not ']' )
	[
		192,49,50,51,52,53,54,55,56,57,48,189,187,220,
		81,87,69,82,84,89,85,73,79,80,219,221,
		65,83,68,70,71,72,74,75,76,186,222,
		90,88,67,86,66,78,77,188,190,191
	].forEach(function (code, i){
		charcodes[code] = i;
	});
	// note that there seems to be an inconsistency in Firefox wherein the key with code 189 for everyone else
	// has code 59. Odd.
	charcodes[59] = charcodes[189]
	
	var blankstring = Array(48).join(String.fromCharCode(0)); // a string of 47 null characters, for building key maps (there are 47 printing keys)

	var keymaps;
	
	$.keymap.setlayout = function (layouts){
		// uses the layout format from VirtualKeyboard.
		// Each element is a string representing the keyboard left to right, top to bottom
		// or an object of substrings, each indexed by the starting index
		keymaps = { normal: blankstring, shift: blankstring, alt: blankstring, shift_alt: blankstring }
		for (layout in layouts){
			if (typeof layouts[layout] === 'string'){
				keymaps[layout] = layouts[layout];
			}else{
				for (i in layouts[layout]){
					i = parseInt(i);
					keymaps[layout] =
						keymaps[layout].slice(0,i) +
						layouts[layout][i] +
						keymaps[layout].substring(i+layouts[layout][i].length);
				}
			}
		}
		// add uppercase keys; assumes normal and shift exist
		var shifts = keymaps.shift.split('');
		keymaps.normal.split('').forEach(function (c, i){
			if (shifts[i].charCodeAt(0) === 0 && c.toUpperCase() !== c) shifts[i] = c.toUpperCase();
		});
		keymaps.shift = shifts.join('');
	};
			
	$.keymap.setlayout ({
		normal:'`1234567890-=\\qwertyuiop[]asdfghjkl;\'zxcvbnm,./',
		shift:{0:'~!@#$%^&*()_+|',24:'{}',35:':"',44:'<>?'}
	});
		
	// based on John Resig's hotkeys (https://github.com/jeresig/jquery.hotkeys)
	// $.event.special documentation at http://learn.jquery.com/events/event-extensions/
	// use with $(element).on('keydown, {keys: '%1', allowDefault: true}, function(){});
	
	// first, create an index of namespaces to identify each keystroke list
	// we do this to be able to remove a handler; $(el).off('keydown', {keys: 'x'}, handler) won't
	// work since we change the handler function. So we fake each $().on as
	// $(el).on ('keydown.hotkeys123', function() {if (keymap==keys) handler.call})
	// and $(el).off('keydown', {keys...}) as $(el).off('keydown.hotkeys123')
	var nss = {};
	var nsIndex = 0;
	function hotkeysnamespace(keys){
		return nss[keys] || (nss[keys] = 'hotkeys'+ (++nsIndex));
	}
	
	// modify keyboard events to use {keys: '^a %b'} notation. Note that the field should really be 'keymaps',
	// since we allow the modifer notation described above
	["keydown","keyup"].forEach(function(type){
		$.event.fixHooks[type] = {
			props: "char charCode code key keyCode keymap hotkeys".split(" "),
			filter: $.keymap.normalize
		};
		$.event.special[type] = $.event.special[type] || {};
		$.event.special[type].trigger = $.keymap.normalize;
		$.event.special[type].add = function(handleObj){
			if (!handleObj.data || !handleObj.data.keys) return;
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