// Text range utilities
// documentation: http://bililite.com/blog/2013/02/08/bililiterange-plugins/
// depends on bililiteRange.js (http://bililite.com/blog/2011/01/17/cross-browser-text-ranges-and-selections/)
// Version: 1.1
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
var oldbounds = bililiteRange.fn.bounds;
bililiteRange.extend({
	
	find: function(re, nowrap, backwards){
		// little hack: can put the "nowrap" as a flag on the RegExp itself, analagous to ignoreCase and multiline; overrides the parameter
		if (re.nowrap !== undefined) nowrap = re.nowrap;
		re = globalize(re);
		var bounds = this.bounds();
		if (!backwards){
			var findprimitive = 'findprimitive';
			var initialbounds = [bounds[0], Number.MAX_VALUE]
		}else{
			findprimitive = 'findprimitiveback';
			initialbounds = [0, bounds[0]-1];
		}
		var match = this[findprimitive](re, initialbounds);
		if (matchIs(match, bounds)){ // if the match is exactly the current string, it doesn't count
			match = this[findprimitive](re, [bounds[0]+1, Number.MAX_VALUE]);
		}
		if (!match && !nowrap) match = this[findprimitive](re, [0, Number.MAX_VALUE]);
		if (matchIs(match, bounds)) match = false; // again, even with wrapping, don't find the identical segment
		this.match = match; // remember this for the caller
		if (match) this.bounds([match.index, match.index+match[0].length]); // select the found string
		return this;
	},

	findBack: function (re, nowrap) { return this.find(re,nowrap,true) },
	
	bounds: function(s){
		switch(s){
			case 'EOL' :
				// set the range to the end of this line
				// if we start at the beginning of a line, findBack will go to the previous line! Check for that case first
				this.bounds('startbounds');
				if (this.findprimitive (/$/mg, this.bounds())) return this;
				return this.find(/$/m, true); // don't wrap
			case 'BOL' :
				// set the range to the beginning of this line
				// if we start at the beginning of a line, findBack will go to the previous line! Check for that case first
				this.bounds('startbounds');
				if (this.findprimitive (/^/mg, this.bounds())) return this;
				return this.findBack(/^/m, true); // don't wrap
			case 'line' :
				this.bounds('BOL');
				var start = this.bounds()[0];
				this.bounds('EOL');
				return this.bounds([start, this.bounds()[1]]);
			case 'startbounds' :
				return this.bounds([this.bounds()[0], this.bounds()[0]]);
			case 'endbounds' :
				return this.bounds([this.bounds()[1], this.bounds()[1]]);
			default:
				return oldbounds.call(this, s);
		}
	},
		
	line:function(n){
		// set the bounds to the nth line or
		// return the line number of the start of the bounds. Note that it is 1-indexed, the way ex writes it!
		if (arguments.length){
			n =  parseInt(n);
			if (isNaN(n)) return this;
			// if n is too large,set the bounds to the end; if too small, to the beginning
			if (n > this.all().split('\n').length) return this.bounds([Number.MAX_VALUE,Number.MAX_VALUE]);
			if (n < 1) return this.bounds([0,0]);
			// move to the given line number, at same character number as the initial bounds.
			var start = this.bounds();
			this.bounds('BOL');
			var c = start[0] - this.bounds()[0]; // character number
			// so find n-1 newlines to get to the correct line, then c characters over (if we don't have that many, go to the end of the line)
			var re = new RegExp('(.*\\n){'+(n-1)+'}(.{'+c+'}|.*$)', 'm');
			return this.bounds('all').find(re).bounds('endbounds');
		}else{
			// just count newlines before this.bounds
			return bililiteRange(this._el).bounds([0, this.bounds()[0]]).text().split('\n').length;
		}
	},
	
	live: function(on){
		var self = this;
		if (arguments.length == 0 || on){
			this._oldtext = self.all(); // resync the text if it should be necessary
			if (this._inputHandler) return this; // don't double-bind
			this._inputHandler = function(ev){
				// first find the change.
				var start, oldend, newend;
				var newtext = self.all();
				if (newtext == self._oldtext) return; // no change
				if (!ev.bounds){
					// "real" input events don't tell us the bounds, just the text. Estimate bounds
					var oldlen = self._oldtext.length;
					var	newlen = newtext.length;
					for (i = 0; i < newlen && i < oldlen; ++i){
						if (newtext.charAt(i) != self._oldtext.charAt(i)) break;
					}
					start = i;
					for (i = 0; i < newlen && i < oldlen; ++i){
						var newpos = newlen-i-1, oldpos = oldlen-i-1;
						if (newpos < start || oldpos < start) break;
						if (newtext.charAt(newpos) != self._oldtext.charAt(oldpos)) break;
					}
					oldend = oldlen-i;
					newend = newlen-i;
					// save the data for any other ranges that might need it. Note that 
					ev.data = newtext.slice(start, newend);
					ev.bounds = [start, oldend];
				}else{
					// use the information we got
					start = ev.bounds[0];
					oldend = ev.bounds[1];
					newend = ev.bounds[0]+ev.data.length;
				}
				self._oldtext = newtext;
				// adjust bounds; this tries to emulate the algorithm that Microsoft Word uses for bookmarks
				if (self._bounds[0] <= start){
					// no change
				}else if (self._bounds[0] > oldend){
					self._bounds[0] += newend - oldend;
				}else{
					self._bounds[0] = newend;
				}
				if (self._bounds[1] < start){
					// no change
				}else if (self._bounds[1] >= oldend){
					self._bounds[1] += newend - oldend;
				}else{
					self._bounds[1] = start;
				}
			};
			self.listen('input', self._inputHandler);
		}else{
			self.dontlisten('input', self._inputHandler);
			delete self._inputHandler;
		}
	return this;
	},
	
	findprimitive: function(re, bounds){
		// search for re within the bounds given. Return the result of the RegExp.exec call  or false if not found.
		// re needs to be global for this to work!
		var text = this.all();
		re.lastIndex = bounds[0];
		var match = re.exec(text);
		if (!match || match.index+match[0].length > bounds[1]) return false;
		return match;
	},
	
	findprimitiveback: function (re, bounds){
		// no way to search backwards; have to search forward until we fail
		var match = false;
		do {
			lastmatch = match;
			match = this.findprimitive(re, bounds);
			bounds[0] = match.index+1;
		}while (match);
		return lastmatch;
	}
});

// utilities
function globalize (re){
	// make a RegExp global, to allow multiple searches
	return new RegExp(re.source, 'g'+(re.ignoreCase ? 'i' : '') + (re.multiline ? 'm' : ''));
}
function matchIs(match, bounds){
	// check if the match that we just found is the same as the existing bounds, since we shouldn't count that
	// this way, "Find Next" won't keep coming back to the same string.
	// I think this is the way that Word does it
	return match && match.index == bounds[0] && match[0].length == bounds[1]-bounds[0];
}

})();