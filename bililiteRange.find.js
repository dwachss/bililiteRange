'use strict';

(function(bililiteRange){

bililiteRange.createOption('dotall', {value: false});
bililiteRange.createOption('global', {value: false});
bililiteRange.createOption('ignorecase', {value: false});
bililiteRange.createOption('magic', {value: true});
bililiteRange.createOption('multiline', {value: false});
bililiteRange.createOption('unicode', {value: false});
bililiteRange.createOption('wrapscan', {value: true});

bililiteRange.bounds.find = function (name, restring, flags = ''){
	return find (this, restring, 'V'+flags);
};

bililiteRange.override('bounds', function (re, flags = ''){
	// duck typed RegExps are OK, allows for flags to be part of re
	if (!(re instanceof Object && 'source' in re && 'flags' in re)) return this.super(...arguments);
	return find (this, re.source, flags + re.flags);
});

bililiteRange.prototype.replace = function (search, replace, flags = ''){
	if (search instanceof Object && 'source' in search && 'flags' in search){
		// a RegExp or similar
		flags = flags + search.flags;
		search = search.source;
	}else{
		search = search.toString();
		flags = 'V' + flags;
	}
	return this.text(
		replaceprimitive (search, parseFlags(this, flags), this.all(), replace, this[0], this[1]),
		{ inputType: 'insertReplacementText' }
	);
}		

bililiteRange.createOption ('word', {value: /\b/});
bililiteRange.createOption ('bigword', {value: /\s+/});
bililiteRange.createOption ('sentence', {value: /\n\n|\.\s/});
bililiteRange.createOption ('paragraph', {value: /\n\s*\n/});
bililiteRange.createOption ('section', {value: /\n(<hr\/?>|(-|\*|_){3,})\n/i});
bililiteRange.createOption ('()', {value: [/\(/, /\)/] });
bililiteRange.createOption ('[]', {value: [/\[/, /]/] });
bililiteRange.createOption ('{}', {value: [/{/, /}/] });
bililiteRange.createOption ('"', {value: [/"/, /"/] });
bililiteRange.createOption ("'", {value: [/'/, /'/] });

bililiteRange.bounds.to = function(name, separator, outer = false){
	if (separator in this.data) separator = this.data[separator];
	if (separator.length == 2) separator = separator[1];
	if (!(separator instanceof RegExp)) separator = new RegExp (quoteRegExp (separator));
	// end of text counts as a separator
	const match = findprimitive(`(${separator.source})|$`, 'g'+separator.flags, this.all(), this[1],  this.length);
	return this.bounds('union', outer ? match.index + match[0].length : match.index);
};

bililiteRange.bounds.from = function(name, separator, outer = false){
	if (separator in this.data) separator = this.data[separator];
	if (separator.length == 2) separator = separator[0];
	if (!(separator instanceof RegExp)) separator = new RegExp (quoteRegExp (separator));
	// start of text counts as a separator
	const match = findprimitiveback(`(${separator.source})|^`, 'g'+separator.flags, this.all(), 0,  this[0]);
	return this.bounds('union', outer ? match.index : match.index + match[0].length);
};

bililiteRange.bounds.whole = function(name, separator, outer = false){
	if (separator in this.data) separator = this.data[separator];
	// if it's a two-part separator (like parentheses or quotes) then "outer" should include both.
	return this.bounds('union', 'from', separator, outer && separator?.length == 2).bounds('union', 'to', separator, outer);
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
	} = parseFlags (range, sourceflags + 'g');
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
		g: range.data.global,
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
		// these are the "real" flags
		flags: (flagobject.g ? 'g' : '') + (flagobject.i ? 'i' : '') + (flagobject.m ? 'm' : '') +
			(flagobject.s ? 's' : '') + (flagobject.u ? 'u' : '') + (flagobject.y ? 'y' : ''),
		backward: flagobject.b,
		global: flagobject.g,
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
		source = `(?:${source})(?=[^]{${text.length-to}})`;
	}
	const re = new RegExp (source, flags);
	re.lastIndex = from;
	return re.exec(text);
}

function findprimitiveback (source, flags, text, from, to){
	// code from https://github.com/idupree/bililiteRange/tree/findback-greedy-correctness
	if (to < text.length){
		// make sure that there are at least length-to characters after the match
		source = `(?:${source})(?=[^]{${text.length-to}})`;
	}
	if (/y/.test(flags)){
		// sticky. Only match the end of the string.
		flags = flags.replace('y','');
		source = `(?:${source})(?![^]{${text.length-to+1}})`; // *don't* match too many characters
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

function replaceprimitive (search, flagobject, text, replace, from, to){
	if (!flagobject.magic) search = quoteRegExp (search);
	if (from > 0){
		// make sure we have at least (from) characters before the match
		search = `(?<=[^]{${from}})(?:${search})`;
	}
	if (to < text.length){
		// make sure we have at least (length - to) characters after the match
		search = `(?:${search})(?=[^]{${text.length - to}})`;
	}
	if (flagobject.sticky && flagobject.backward){
		flagobject.flags = flagobject.flags.replace(/[gy]/g, '');
		// make sure we don't have too many characters after the match
		search = `(?:${search})(?![^]{${text.length - to + 1}})`;
	}else if (flagobject.backward && ! flagobject.global){
		// would anyone ever do this? Replace only the last match?
		const match = findprimitiveback (search, flagobject.flags+'g', text, from, to);
		if (!match) return text.slice (from, to); // no match, no change
		search = `(?<=[^]{${match.index}})(?:${search})`;
	}
	const re = new RegExp (search, flagobject.flags);
	re.lastIndex = from; // only relevant for sticky && !backward
	// if to == length, then go to the end of the string,not to position 0!
	return text.replace (re, replace).slice(from, to-text.length || undefined);
}

})(bililiteRange);