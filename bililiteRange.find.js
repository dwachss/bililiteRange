(function(){

bililiteRange.createOption('dotall', {value: false});
bililiteRange.createOption('ignorecase', {value: false});
bililiteRange.createOption('magic', {value: true});
bililiteRange.createOption('multiline', {value: false});
bililiteRange.createOption('unicode', {value: false});
bililiteRange.createOption('wrapscan', {value: true});

bililiteRange.bounds.find = function (name, restring, flags = ''){
	return find (this, restring, 'V'+flags);
};

bililiteRange.override('bounds', function (re, flags = ''){
	if (!(re instanceof RegExp)) return this.super(...arguments);
	return find (this, re.source, flags + re.flags);
});

bililiteRange.createOption ('words', {value: /\b/});
bililiteRange.createOption ('bigwords', {value: /\s+/});
bililiteRange.createOption ('sentences', {value: /\n\n|\.\s/});
bililiteRange.createOption ('paragraphs', {value: /\n\n/});
bililiteRange.createOption ('sections', {value: /\n(<hr\/?>|(-|\*|_){3,})\n/i});

bililiteRange.bounds.to = function(name, separator, outer = false){
	if (separator in this.data) separator = this.data[separator];
	// end of text counts as a separator
	const match = findprimitive(`(${separator.source})|$`, 'g'+separator.flags, this.all(), this[1],  this.length);
	return this.bounds('union', outer ? match.index + match[0].length : match.index);
};

bililiteRange.bounds.from = function(name, separator, outer = false){
	if (separator in this.data) separator = this.data[separator];
	if (!(separator instanceof RegExp)) separator = new RegExp (quoteRegExp (separator));
	// start of text counts as a separator
	const match = findprimitiveback(`(${separator.source})|^`, 'g'+separator.flags, this.all(), 0,  this[0]);
	return this.bounds('union', outer ? match.index : match.index + match[0].length);
};

bililiteRange.bounds.whole = function(name, separator, outer = false){
	return this.bounds('union', 'from', separator).bounds('union', 'to', separator, outer);
};

//------- private functions -------

function find (range, source, sourceflags){
	const {
		backward,
		magic,
		restricted,
		sticky,
		wrapscan,
		flags
	} = parseFlags (range, sourceflags);
	if (!magic) source = quoteRegExp (source);
	const findfunction = backward ? findprimitiveback : findprimitive;
	let from, to;
	if (restricted){
		from = range[0];
		to = range[1];
	}else if (backward){
		from = 0;
		to = range[0];
	}else{
		from = range[1];
		to = range.length;
	}
	let match = findfunction (source, flags, range.all(), from, to);
	if (!match && wrapscan && !sticky && !restricted){
		match = findfunction(source, flags, range.all(), 0, range.length);
	}
	range.match = match || false; // remember this for the caller
	if (match) range.bounds([match.index, match.index+match[0].length]); // select the found string
	return range;
}

function parseFlags (range, flags){
	let flagobject = {
		b: false,
		i: range.data.ignorecase,
		m: range.data.multiline,
		r: false,
		s: range.data.dotall,
		u: range.data.unicode,
		v: range.data.magic,
		w: range.data.wrapscan,
		y: false
	};
	flags.split('').forEach( flag => flagobject[flag.toLowerCase()] = flag === flag.toLowerCase() );
	return {
		// these are the "real" flags, plus 'g' so we can use lastIndex. 'y' overrides 'g'
		flags: (flagobject.i ? 'i' : '') + (flagobject.m ? 'm' : '') + (flagobject.s ? 's' : '') +
		       (flagobject.u ? 'u' : '') + (flagobject.y ? 'y' : '') + 'g',
		backward: flagobject.b,
		magic: flagobject.v,
		restricted: flagobject.r,
		wrapscan: flagobject.w,
		sticky: flagobject.y
	};
}

function quoteRegExp (source){
	// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
	return source.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

function findprimitive (source, flags, text, from, to){
	// code from https://github.com/idupree/bililiteRange/tree/findback-greedy-correctness
	if (to < text.length){
		// make sure that there are at least length-to characters after the match
		source = '(?:' + source + ')(?=[\\s\\S]{' + (text.length-to) + '})';
	}
	const re = new RegExp (source, flags);
	re.lastIndex = from;
	return re.exec(text);
}

function findprimitiveback (source, flags, text, from, to){
	// code from https://github.com/idupree/bililiteRange/tree/findback-greedy-correctness
	if (to < text.length){
		// make sure that there are at least length-to characters after the match
		source = '(?:' + source + ')(?=[\\s\\S]{' + (text.length-to) + '})';
	}
	if (/y/.test(flags)){
		// sticky. Only match the end of the string.
		flags = flags.replace('y','');
		source = '(?:' + source + ')(?![\\s\\S]{' + (text.length-to+1) + '})'; // *don't* match too many characters
		// this works even if $ won't, if multiline is true
		const re = new RegExp (source, flags);
		re.lastIndex = from;
		return re.exec(text);
	}else{
		// no way to search backward; have to search forward until we fail
		const re = new RegExp (source, flags);
		re.lastIndex = from;
		let match = false;
		do {
			var lastmatch = match;
			match = re.exec(text);
			if (match && re.lastIndex == match.index) ++re.lastIndex; // beware zero-length matches and infinite loops
		}while (match);
		return lastmatch;
	}
}

})();