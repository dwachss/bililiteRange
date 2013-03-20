// mapping for standard US keyboards. Replace the $.keymap.normal, $.keymap.shift, $.keymap.ctrl and $.keymap.alt arrays as needed
// Version: 1.0
// Copyright (c) 2010 Daniel Wachsstock
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
		ret = ret.replace('%^', '^%'); // normalize control-alt letters
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
		
		'^\\+(\\w)$': function (match, p1) {return p1.toUpperCase()}, // uppercase shifted letters
		'[+^%]\\w$': function(match) {return match.toUpperCase()}, // control-letters are uppercase
		'[+^%]+': function (match) { // normalize the order of shift-ctrl-alt
			return (/\+/.test(match) ? '+' : '') +
				(/\^/.test(match) ? '^' : '') +
				(/%/.test(match) ? '%' : '')
		}
	};
	var aliases =[];
	for (alias in aliasgenerator){
		// mark whole words
		var name = aliasgenerator[alias];
		if (/^\w$/.test(alias)) alias = '\\b'+alias
		if (/\w$/.test(alias)) alias += '\\b'
		aliases.push({alias: new RegExp(alias), name: name});
	}
	
	$.keymap.normalize = function(c){
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
	$.keymap.hotkeys = function (eventtypes){
		eventtypes.split(/\s+/).forEach(function(type){
					
			$.event.special[type] = {
				setup: function() {
					$(this).on(type+'.keymap', handleevent).data('keymap.handlers.'+type, {});
					return false; // just let jQuery attach the event listener
				},
				add: function(handleObj){
					if (!handleObj.data || typeof handleObj.data.keys != 'string') return;
					// since we only allow a single keystroke handler, use that for the guid. This is a hack for removing the handler later.
					var keys = handleObj.guid = $.keymap.normalizeList(handleObj.data.keys);
					$.data(this, 'keymap.handlers.'+type)[keys] = $.extend({}, handleObj);
					console.log($.data(this, 'keymap.handlers.'+type));
					handleObj.handler = $.noop; // let the single handler handle this
				},
				remove: function(handleObj){
					delete $.data(this, 'keymap.handlers.'+type)[handleObj.guid];
				},
				teardown: function(){
					$(this).off(type+'.keymap').removeData('keymap.handlers.'+type).
						removeData('keymap.currSequence.'+type);
					return false;
				}
			};

			function handleevent(event){
				var self = $(this);
				var type = event.type;
				var key = $.keymap(event);
				var possibles = [key];
				var currSequence = self.data('keymap.currSequence.'+type);
				if (currSequence) possibles.unshift (currSequence + ' ' + key); // try the sequence first!
				var handlers = self.data('keymap.handlers.'+type);
				// do we have a handler defined for this sequence of keys (or just this key by itself)?
				for (var i = 0; i < possibles.length; ++i){
					currSequence = possibles[i];
					var h = handlers[currSequence];
					// if the selector is defined, only trigger if the true target matches
					if (h && h.selector && $(h.selector, self).index(event.target) < 0) continue;
					if (h){
						self.removeData('keymap.currSequence.'+type);
						self.trigger('keymapcomplete', [currSequence]);
						return h.handler.apply(this, arguments);
					}
					// is this sequence a prefix of some other defined sequence?
					for (sequence in handlers){
						var h = handlers[sequence];
						// if the selector is defined, only trigger if the true target matches
						if (h.selector && $(h.selector, self).index(event.target) < 0) continue;
						if (sequence.indexOf(currSequence) == 0){
							self.trigger('keymapprefix', [currSequence]);
							self.data('keymap.currSequence.'+type, currSequence);
							return !!h.data.allowDefault;
						}
					}
				}
				// nothing matches. Return undefined;
				self.removeData('keymap.currSequence.'+type);
			}
		});
	};
	// monkey patch remove so we can do $(elem).off('keydown', '^A')
	var oldRemove = $.event.remove;
	$.event.remove = function (elem, types, handler, selector){
		// remove just looks for the guid to match., so we can fake it out.
		// off(types, object) becomes remove (elem, types, undefined, object)
		// off(types, selector, object) becomes  remove (elem, types, object, selector)
		if (handler === undefined && $.isPlainObject(selector) && selector.keys){
			var args = [elem, types, {guid: $.keymap.normalizeList(selector.keys)}, undefined];
		}else if ($.isPlainObject(handler)&& handler.keys){
			handler.guid = $.keymap.normalizeList(handler.keys)
			args = [elem, types, handler, selector];
		}else{
			args = arguments;
		}
		return oldRemove.apply(this,args);
	}

})(jQuery);