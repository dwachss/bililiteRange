(function(){
	
/* 	
bililiteRange.override('bounds', function (re, nowrap, backwards){
	if (!(re instanceof RegExp)) return this.super(...arguments);
	if (!('nowrap' in re)) re.nowrap = nowrap;
	if (!('backwards' in re)) re.backwards = backwards;
});
 */
 
bililiteRange.extend({
	find: function(re, nowrap, backwards){
		// little hack: can put the "nowrap" as a flag on the RegExp itself, analagous to ignoreCase and multiline; overrides the parameter
		if (re.nowrap !== undefined) nowrap = re.nowrap;
		re = globalize(re);
		var bounds = this.bounds();
		if (!backwards){
			var findprimitive = 'findprimitive';
			var initialbounds = [bounds[0], Number.MAX_VALUE];
			var fallbackbounds = [bounds[0]+1, Number.MAX_VALUE];
		}else{
			findprimitive = 'findprimitiveback';
			initialbounds = [0, bounds[0]];
			fallbackbounds = [0, bounds[0]-1];
		}
		var match = this[findprimitive](re, initialbounds);
		if (matchIs(match, bounds)){ // if the match is exactly the current string, it doesn't count
			match = this[findprimitive](re, fallbackbounds);
		}
		if (!match && !nowrap) match = this[findprimitive](re, [0, Number.MAX_VALUE]);
		if (matchIs(match, bounds)) match = false; // again, even with wrapping, don't find the identical segment
		this.match = match; // remember this for the caller
		if (match) this.bounds([match.index, match.index+match[0].length]); // select the found string
		return this;
	},

	findBack: function (re, nowrap) { return this.find(re,nowrap,true) },

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
			var lastmatch = match;
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
