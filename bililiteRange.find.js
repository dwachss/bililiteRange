(function(_private){

bililiteRange.createOption('dotall', {value: false});
bililiteRange.createOption('ignorecase', {value: false});
bililiteRange.createOption('multiline', {value: false});
bililiteRange.createOption('unicode', {value: false});
bililiteRange.createOption('wrapscan', {value: true});

bililiteRange.RegExp = function(source, flags){
	this.source = source.source || source.toString(); // allow copying from a RegExp or a bililiteRange.RegExp
	this.flags = flags;
	if (source.flags) this.flags += source.flags; // source flags override the flags argument
}

bililiteRange.RegExp.prototype = {
	toRE (range, globalize = true){
		// returns a real RegExp with the global, not sticky, flag set, based on the defaults in range.data
		let flags = '';
		['dotall', 'ignorecase', 'multiline', 'unicode', 'wrapscan'].forEach( key => {
			flags += range.data[key] ? key[0] : '';
		});
		flags.replace('d','s'); // who's idea was this, having the dotAll flag be 's'?
		flags += this.flags;
		let flagobject = {};
		flags.split('').forEach( flag => {
			if (/[bimsuw]/.test(flag)) flagobject[flag] = true;
			if (/[IMUSUW]/.test(flag)) flagobject[flag.toLowerCase()] = false; // These are the only ones that might need to override a default
		});
		flags = (globalize ? 'g' : '') +
		 (flagobject.i ? 'i' : '') +
		 (flagobject.m ? 'm' : '') +
		 (flagobject.s ? 's' : '') +
		 (flagobject.u ? 'u' : '');
		let re = new RegExp (this.source, flags);
		re.backwards = (flagobject.b == true);
		re.wrapscan = (flagobject.w == true);
		return re;
	}
};

bililiteRange.prototype.re = (source, flags) => new bililiteRange.RegExp(source, flags);

bililiteRange.override('bounds', function (re){
	if (re instanceof RegExp) re = new bililiteRange.RegExp(re);
	if (!(re instanceof bililiteRange.RegExp)) return this.super(...arguments);
	re = re.toRE(this);
	let bounds = this.bounds();
	let findprimitive = 'findprimitive';
	let initialbounds = [bounds[0], Number.MAX_VALUE];
	let fallbackbounds = [bounds[0]+1, Number.MAX_VALUE];

	if (re.backwards){
		findprimitive = 'findprimitiveback';
		initialbounds = [0, bounds[0]];
		fallbackbounds = [0, bounds[0]-1];
	}
	var match = _private[findprimitive](re, initialbounds, this);
	if (matchIs(match, bounds)){ // if the match is exactly the current string, it doesn't count
		match = _private[findprimitive](re, fallbackbounds, this);
	}
	if (!match && re.wrapscan) match = _private[findprimitive](re, [0, Number.MAX_VALUE], this);
	if (matchIs(match, bounds)) match = false; // again, even with wrapping, don't find the identical segment
	this.match = match; // remember this for the caller
	if (match) this.bounds([match.index, match.index+match[0].length]); // select the found string
	return this;
});

bililiteRange.prototype.replace = function (searchvalue, newvalue){
	if (searchvalue instanceof bililiteRange.RegExp) searchvalue = searchvalue.toRE(this);
	let b0 = this[0];
	const searchrange = this.clone();
	this.text().replace (searchvalue, function (match){
		let args = Array.from(arguments);
		let wholestring = args.pop();
		if (typeof wholestring != 'string') args.pop(); // get past the groups argument
		const index = args.pop(); // this is what we want
		const newtext = match.replace (searchvalue, newvalue);
		searchrange.bounds([b0+index, b0+index+match.length]).text(newtext, {inputType: 'insertReplacementText'});
		b0 += newtext.length - match.length;
	});
};

bililiteRange.bounds.to = function(name, separator){
	if (separator in this.data) separator = this.data[separator];
	if (!separator.source) separator = new RegExp(separator);
	// note possible bug: if separator.source is defined but not separator.flags, then flags will be 'undefinedW'
	// only possible if separator is some weird, non-RegExp but not a string, object.
	separator = this.re( `(${separator.source})|$`, separator.flags);
	const re = separator.toRE(this);
	// need to use findprimitive because we want to be sure to find a separator *after* this range. 
	// bounds(/re/) includes searching in the range. bounds('endbounds') will fail for a zero-length match
	// like /\b/
	const match = _private.findprimitive(re, [this[1],  Number.MAX_VALUE], this);
	return this.bounds('union', match.index);
}

bililiteRange.bounds.from = function(name, separator){
	if (separator in this.data) separator = this.data[separator];
	if (!separator.source) separator = new RegExp(separator);
	separator = this.re( `(${separator.source})|^`, separator.flags + 'bW');
	const prevseparator = this.clone().bounds(separator);
	return this.bounds('union', prevseparator[1]); // only from the end of the separator
}

bililiteRange.bounds.whole = function(name, separator){
	return this.bounds('union', 'from', separator).bounds('union', 'to',separator);
}

bililiteRange.createOption ('words', {value: /\b/});
bililiteRange.createOption ('bigwords', {value: /\s+/});
bililiteRange.createOption ('sentences', {value: /\n\n|\.\s/});
bililiteRange.createOption ('paragraphs', {value: /\n\n/});
bililiteRange.createOption ('sections', {value: /\n(<hr\/?>|(-|\*|_){3,})\n/i});

_private.findprimitive = function(re, bounds, range){
	// search for re within the bounds given. Return the result of the RegExp.exec call  or false if not found.
	// re needs to be global for this to work!
	var text = range.all();
	re.lastIndex = bounds[0];
	var match = re.exec(text);
	if (!match || match.index+match[0].length > bounds[1]) return false;
	return match;
};

_private.findprimitiveback = function (re, bounds, range){
	// no way to search backwards; have to search forward until we fail
	var match = false;
	do {
		var lastmatch = match;
		match = _private.findprimitive(re, bounds, range);
		bounds[0] = match.index+1;
	}while (match);
	return lastmatch;
};

function matchIs(match, bounds){
	// check if the match that we just found is the same as the existing bounds, since we shouldn't count that
	// this way, "Find Next" won't keep coming back to the same string.
	// I think this is the way that Word does it
	return match && match.index == bounds[0] && match[0].length == bounds[1]-bounds[0];
}

})({});
