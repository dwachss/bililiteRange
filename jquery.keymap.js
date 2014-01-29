// mapping for standard US keyboards. Replace the $.keymap.normal, $.keymap.shift, $.keymap.ctrl and $.keymap.alt arrays as needed
// Version: 2.4
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
	// returns the sendkeys http://bililite.com/blog/2011/01/23/improved-sendkeys/ equivalent of the character, with addtions from the
	// Microsoft version (http://msdn.microsoft.com/en-us/library/system.windows.forms.sendkeys.aspx)
	// and their indicators of control keys (+^%)
	$.keymap = function (evt){
		var c = evt.which, shift = evt.shiftKey, ctrl = evt.ctrlKey, alt = evt.altKey;
		var ret;
		if (shift && $.keymap.shift[c]){
			ret = $.keymap.shift[c];
			shift = false;
		}else if (ctrl && $.keymap.ctrl[c]){
			ret = $.keymap.ctrl[c];
			ctrl = false;
		}else if (alt && $.keymap.alt[c]){
			ret = $.keymap.alt[c];
			alt = false;
		}else{
			ret = $.keymap.normal[c];
		}
		if (!ret) return false;
		if (alt) ret = '%' + ret;
		if (ctrl) ret = '^' + ret;
		if (shift) ret = '+' + ret;
		// make sure control characters are uppercase
		return $.keymap.normalize(ret);
	}

	var aliasgenerator = {
		// VIM notation (and jquery.hotkeys numeric keypad notation)
		'^<(.*)>$': '$1', // strip the brackets
		'(?:k|num_)(\\d)': 'num$1', // numeric keypad indicator; change to num1 now; we will change it to {1} etc. later
		'\\b(?:k|num_)([a-z]+)': '$1', // replace kHome with Home etc.; we can't distinguish keypad direction keys
		// the sendkeys aliases
		bksp: 'backspace',
		bs: 'backspace',
		del: 'delete',
		down: 'downarrow',
		left: 'leftarrow',
		right: 'rightarrow',
		up: 'uparrow',
		// hotkeys plugin (https://github.com/jeresig/jquery.hotkeys/blob/master/jquery.hotkeys.js), and modifiers from VIM
		's(hift)?[+-]': '+',
		'c(trl)?[+-]': '^',
		'm(eta)?[+-]': '%', // needs to be before a(lt)- so the met[a-] doesn't match!
		'a(lt)?[+-]': '%',
		pageup: 'pgup',
		pguparrow: 'pgup', // in case we overcorrected above
		pagedown: 'pgdn',
		decimal: '.',
		// VIM notation (http://polarhome.com/vim/manual/v71/intro.html#key-notation)
		minus: 'subtract',
		point: '.',
		lt: '<',
		'#(\\d+)': 'f$1', // this is documented for ex (http://pubs.opengroup.org/onlinepubs/9699919799/utilities/ex.html#tag_20_40_13_24) but no reason not to include it
		// Jonathan Tang's keycode.js (https://github.com/nostrademons/keycode.js)
		'page_up': 'pgup',
		'page_down': 'pgdn',
		'escape': 'esc',
		'num\\+': 'add',
		'num-': 'subtract',
		'num\\*': 'multiply',
		'num/': 'divide',
		
		// make sure the special keys by themselves are marked
		'^[+%^{]$': '{$&}',
		
		'^\\+(\\w)$': function (match, p1) {return p1.toUpperCase()}, // uppercase shifted letters
		'[+^%]\\w$': function(match) {return match.toUpperCase()}, // control-letters are uppercase
		'[+^%]+': function (match) { // normalize the order of shift-ctrl-alt
			return (/\+/.test(match) ? '+' : '') +
				(/\^/.test(match) ? '^' : '') +
				(/%/.test(match) ? '%' : '')
		}
	};
	// TODO: inlcude the DOM3 key codes: https://dvcs.w3.org/hg/dom3events/raw-file/tip/html/DOM3-Events.html#h3_code-value-tables
	var aliases =[];
	for (alias in aliasgenerator){
		// mark whole words
		var name = aliasgenerator[alias];
		if (/^\w$/.test(alias)) alias = '\\b'+alias
		if (/\w$/.test(alias)) alias += '\\b'
		aliases.push({alias: new RegExp(alias), name: name});
	}
	
	$.keymap.normalize = function(c){
		// control letters can be written as uppercase(need to be explicitly shifted, if that's what's wanted)
		c = c.replace(/([^%])([A-Z])\b/, function(match, p1, p2) { return p1+p2.toLowerCase() });
		// mark uppercase letters
		c = c.replace(/\b[A-Z]\b/, '+$&');
		// simple things to keep notation consistent
		c = c.replace(/\s/g,'').replace(/\w/g, function (match) {return match.toLowerCase()});
		aliases.forEach(function(alias) { c=c.replace(alias.alias, alias.name) });
		// anything with a word in it must mean a special key; make sure it's bracketed, and remove the numeric keypad indicator (we indicate it by leaving it in {})
		if (!/{/.test(c)) c = c.replace(/[\w.]{2,}/, '{$&');
		if (!/}/.test(c)) c = c.replace(/[\w.]{2,}/, '$&}');
		c = c.replace (/num([\d.])/i, '$1');
		return c;
	}
	
	$.keymap.normalizeList = function(str){
		// normalize a list of space-delimited characters.
		return $.trim($.map(str.split(/\s+/), $.keymap.normalize).join(' '));
	}
	
	$.keymap.normal = {
		 8	: '{backspace}',
		46	: '{delete}',
		13	: '{enter}',
		27	: '{esc}',
		45	: '{insert}',
		 9	: '{tab}'
	};
	'space pgup pgdn end home leftarrow uparrow rightarrow downarrow'.
		split(' ').forEach(function(c,i) {$.keymap.normal[i+32] = '{'+c+'}'});
	"0123456789"
		.split('').forEach(function(c,i) {$.keymap.normal[i+48] = c});
	$.keymap.normal[59] = ';'; // Firefox only!
	"abcdefghijklmnopqrstuvwxyz"
		.split('').forEach(function(c,i) {$.keymap.normal[i+65] = c});
	"0 1 2 3 4 5 6 7 8 9 multiply add unused subtract . divide". // numeric keypad keys
		split(' ').forEach(function(c,i) {$.keymap.normal[i+96] = '{'+c+'}'});
	for(i=1;i<=12;++i)
		$.keymap.normal[i+111] = '{f'+i+'}'; // function keys
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
		 53: '{%}',
		 54: '{^}',
		 55: '&',
		 56: '*',
		 57: '(',
		 59: ':', // Firefox only!
		 48: ')',
		189: '_',
		187: '{+}',
		219: '{{}',
		220: '|',
		221: '}',
		186: ':',
		222: '"',
		188: '<',
		190: '>',
		191: '?'
	};
		
	$.keymap.ctrl = {};	

	$.keymap.alt = {};
	
	// based on John Resig's hotkeys (https://github.com/jeresig/jquery.hotkeys)
	// $.event.special documentation at http://learn.jquery.com/events/event-extensions/
	// Initialize with $.keymap.hotkeys('keydown');
	// use with $(element).on('keydown, {keys: '%1', allowDefault: true}, function(){});
	
	// first, create an index of namespaces to identify each keystroke list
	var nss = {};
	var nsIndex = 0;
	function hotkeysnamespace(keys){
		return nss[keys] || (nss[keys] = 'hotkeys'+ (++nsIndex));
	}
	
	["keydown","keyup"].forEach(function(type){
		$.event.fixHooks[type] = { props: "char charCode key keyCode hotkeys".split(" ") };
		$.event.special[type] = $.event.special[type] || {};
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