// insert characters in a textarea or text input field
// special characters are enclosed in {}; use {{} for the { character itself
// documentation: http://bililite.com/blog/2008/08/20/the-fnsendkeys-plugin/
// Version: 2.3
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

(function($){

$.fn.sendkeys = function (x, opts){
	return this.each( function(){
		var localkeys = $.extend({}, opts, $(this).data('sendkeys')); // allow for element-specific key functions
		var rng = $.data(this, 'sendkeys.range') || bililiteRange(this);
		$.data(this, 'sendkeys.range', rng);
		rng.bounds('selection');
		$(this).trigger({type: 'beforesendkeys', which: x});
		this.focus();
		$.data(this, 'sendkeys.originalText', rng.text());
		x.replace(/([^{])\n/g, '$1{enter}'). // turn line feeds into explicit break insertions, but not if escaped
		  replace(/{[^}]*}|[^{]+/g, function(s){
				(localkeys[s] || $.fn.sendkeys.defaults[s] || $.fn.sendkeys.defaults.simplechar)(rng, s);
				rng.select();
		  });
		$(this).trigger({type: 'sendkeys', which: x});
	});
}; // sendkeys

// add the functions publicly so they can be overridden
$.fn.sendkeys.defaults = {
	simplechar: function (rng, s){
		// deal with unknown {key}s
		if (/^{[^}]*}$/.test(s)) s = s.slice(1,-1);
		for (var i =0; i < s.length; ++i){
			var x = s.charCodeAt(i);
			$(rng.element()).trigger({type: 'keypress', keyCode: x, which: x, charCode: x});
		}
		rng.text(s, 'end');
	},
	'{enter}': function (rng){
		var x = '\n'.charCodeAt(0);
		$(rng._el).trigger({type: 'keypress', keyCode: x, which: x, charCode: x});
		rng.insertEOL();
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
		var s = $.data(rng.element(), 'sendkeys.originalText');
		for (var i =0; i < s.length; ++i){
			var x = s.charCodeAt(i);
			$(rng.element()).trigger({type: 'keypress', keyCode: x, which: x, charCode: x});
		}
		rng.selection(s);
	},
	'{mark}' : function (rng){
		var bounds = rng.bounds();
		$(rng.element()).one('sendkeys', function(){
			// set up the event listener to change the selection after the sendkeys is done
			rng.bounds(bounds).select();
		});
	}
};

})(jQuery)