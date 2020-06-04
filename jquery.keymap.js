//
// Version: 4.1
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
	// adds supports for limiting keydown and keyup to specific key combinations, as $().on('keydown', 'ctrl-A', func);
	// allows listening for sequences of keys as well: $().on('keydown', 'a b c', func); will trigger only when the a, b, and c keys are pressed in order
	// NOTE: tries to implement the meta key but I'm not sure if it works (I only have a Windows machine on which to test this).
	// Ignores the AltGr.
	

//---- Map a KeyEvent to a string that describes the keys pressed
	$.keymap = function (evt){
		// create a "keymap" field in evt that represents the keystroke as a whole: "ctrl-alt-Delete" for instance.
		// In general, use the key field. However, modified letters (ctrl-, alt-, and meta-) use the code field
		// so that ctrl-A is the A key even on non-English keyboards.
		var key = evt.key, code = evt.code,
			shift = evt.shiftKey, ctrl = evt.ctrlKey, alt = evt.altKey, meta = evt.metaKey;
			// key is implemented; just use what they got
		if (!key || /^(?:shift|control|meta|alt)$/i.test(key)) return evt; // ignore undefined or modifier keys alone
		if (key == ' ') key = 'Space'; // we use spaces to delimit keystrokes, so this needs to be changed
		if ((ctrl || alt || meta) && /^Key[a-zA-Z]$/.test(code)){
			key = code.charAt(code.length-1)[shift ? 'toUpperCase' : 'toLowerCase']();
		}
		evt.keymap = key;
		// printable characters should ignore the shift; that's incorporated into the key generated
		if (key.length !== 1 && shift) evt.keymap = 'shift-'+evt.keymap;
		if (meta) evt.keymap = 'meta-'+evt.keymap;
		if (alt) evt.keymap = 'alt-'+evt.keymap;
		if (ctrl) evt.keymap = 'ctrl-'+evt.keymap;
		return evt;
	}

	// normalize capitalization	
	var aliases = $.map(
		'Backspace CapsLock Delete Enter Escape Insert NumLock Tab Space PageUp PageDown End Home ArrowLeft ArrowUp ArrowRight ArrowDown'.split(' '),
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
		// turn all modifiers into the Microsoft notation (https://docs.microsoft.com/en-us/office/vba/language/reference/user-interface-help/sendkeys-statement)
		// with ~ for meta. This makes setting the order easier later on.
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
				
		'^\\+(\\w)$': function (match, p1) {return p1.toUpperCase()}, // uppercase shifted letters

		' ': 'Space',

		'([+^%~]+)(.)': function (match, p1, p2) { // normalize the order of ctrl-alt-meta-shift
			return (/\^/.test(p1) ? 'ctrl-' : '') +
				(/%/.test(p1) ? 'alt-' : '') +
				(/~/.test(p1) ? 'meta-' : '') +
				(/\+/.test(p1) ? 'shift-' : '') + p2;
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
		// normalize a single key definition string
		aliases.forEach(function(alias) { s=s.replace(alias.alias, alias.key) });
		// string should be in the form (ctrl-)?(alt-)?(meta-)?(shift-?)key
		return s;
	}


//---- Normalize a string of space-delimited key descriptions
// turns "%A ^c down" into "alt-shift-KeyA ctrl-KeyC ArrowDown"
	$.keymap.normalizeList = function(str){
		if (typeof str !== "string") return;
		return $.trim($.map(str.split(/\s+/), $.keymap.normalizeString).join(' '));
	};
	
	// we want to be able to remove event handlers as well, based on the keys selector (so we can remove all the 'keydown {keys: ctrl-A}'
	// handlers. There's no way to do this directly, so we turn the keys selector into a namespace, and monkey patch event.remove to look for that
	var keymapnamespaces = {};
	function keymapnamespace(keys){
		keys = $.keymap.normalizeList(keys);
		return keymapnamespaces[keys] || (keymapnamespaces[keys] = 'keymap' + ($.guid++));
	}
	function addnamespace (types, keys){
		var ns = '.'+keymapnamespace(keys);
		types = types.replace (/\S+/g, '$&'+ns);
		return types;
	}
	var oldRemove = $.event.remove;
	$.event.remove = function (elem, types, handler, selector){
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
	};

//---- Modify KeyEvents to use key descriptions				
	// modify keyboard events to use {keys: '^a %b'} notation.
	["keydown","keyup"].forEach(function(type){
		$.event.special[type] = $.event.special[type] || {};
		$.event.special[type].handle = function (evt){
			var self = $(this);
			if (!evt.data) return;
			var keys = evt.data.keys; // array of target keys for this handler
			if (!keys) return;
			var key = $.keymap(evt).keymap; // current key
			if (!key) return;
			// we need to keep track of keys on this particular element, and separately for each handler.
			var targetData = $.data(evt.target);
			targetData.keymap = targetData.keymap || [];
			var currSequence = targetData.keymap[evt.data.guid];
			var key = $.keymap(evt).keymap; // current key
			var currSequence = currSequence ? currSequence + ' ' + key : key;
			while (currSequence){
				var length = currSequence.split(' ').length;
				if (keys[length-1].test(currSequence)){
					if (length == keys.length){
						// matched the whole thing
						evt.hotkeys = currSequence;
						self.trigger('keymapcomplete', [currSequence]);
						targetData.keymap[evt.data.guid] = ''; // restart
						return evt.handleObj.handler.apply(this, arguments);
					}else{	
						targetData.keymap[evt.data.guid] = currSequence;
						self.trigger('keymapprefix', [currSequence]);
						return !!evt.handleObj.data.allowDefault;
					}
				}
				currSequence = currSequence.replace(/^\S+[ ]?/, ''); // strip the first key	
			}
			targetData.keymap[evt.data.guid] = ''; // restart
		};

		$.event.special[type].add = function(handleObj){
			if (!handleObj.data || !handleObj.data.keys) return;
			handleObj.data.guid = $.guid++; // track this particular handler
			var keys = handleObj.data.keys;
			handleObj.namespace = handleObj.namespace.split('.').
				concat(keymapnamespace(keys)).sort().join('.'); // add the new namespace in alphabetical order
			if (typeof keys == 'string'){
				// escape RegExp from https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
				handleObj.data.keys = keyregexps(
					$.keymap.normalizeList(keys).replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&")
				);
			}else if (keys instanceof RegExp){
				handleObj.data.keys = keyregexps(keys.source, keys.ignoreCase);
			}
		};
		
	});
	
	function keyregexps(source, ignorecase){
		// return an array of regexps to match key sequences in source
		// so keyregexp('a b c [a-z]') returns [ /^a$/, /^a b$/, /^a b [a-z]$/ ]
		var accum = '';
		return $.map(source.split(' '), function(key) {
			accum += ' '+key;
			return new RegExp('^'+accum.slice(1)+'$', ignorecase ? 'i' : ''); // ^...$ to match the entire key
		});
	}


})(jQuery);