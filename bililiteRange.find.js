'use strict';

(function(bililiteRange){

const FLAGS = {
	// flag: [name, native?]
	b:	['backwardScan', false],
	d:	['hasIndices', true],
	g:	['global', true],
	i:	['ignoreCase', true],
	m:	['multiline', true],
	n:	['explicitCapture', false],
	q:	['quotedPattern', false],
	r:	['restrictedScan', false],
	s:	['dotAll', true],
	u:	['unicode', true],
	w:	['wrapScan', false],
	x:	['freeSpacing', false],
	y:	['sticky', true],
};

for (const flag in FLAGS){
	bililiteRange.createOption(FLAGS[flag][0], {value: false});
}

bililiteRange.bounds.find = function (name, string, flags = ''){
	return find (this, string, 'q'+flags);
};

bililiteRange.override('bounds', function (re, flags = ''){
	if (re instanceof Object && 'source' in re && 'flags' in re){ 
		return find (this, re.source, flags + re.flags);
	}
	if (re instanceof Object && 'raw' in re){
		const {source, flags} = parseRE(String.raw(...arguments), blanks(...arguments))
		return find (this, source, flags);
	}
	return this.super(...arguments);
});

bililiteRange.prototype.replace = function (search, replacement, flags = ''){
	if (search instanceof Object && 'source' in search && 'flags' in search){
		// a RegExp or similar
		flags = flags + search.flags;
		search = search.source;
	}else if (search instanceof Object && 'raw' in search){
		({source:search, replacement, flags} = parseRE(String.raw(...arguments), blanks(...arguments)));
	}else{
		search = search.toString();
		flags = 'q' + flags;
	}
	const flagObject = parseFlags(this, flags);
	search = flagObject.quotedPattern ? quoteRegExp(search) : processTokens(search, flagObject, this);
	return this.text(
		replaceprimitive (search, flagObject, this.all(), replacement, this[0], this[1]),
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

// In a string template literal, replace interpolated strings with blanks so we don't try to parse them
function blanks(strs,...values){
	return String.raw(strs,...values.map(s=> ' '.repeat(String(s).length)));
}

function parseRE(str, template){
	const delimiterRE = char => new RegExp(String.raw`(?<![^\\](?:\\\\)*\\)${quoteRegExp(char)}`, 'g'); // not preceded by an odd number of backslashes
	const prefixRE = /^\(\?([-a-zA-Z]+)\)/; // flags as prefix rather than suffix
	let source = '', replacement = '', flags = '', rest = '';
	if (prefixRE.test(str)){
		source = str.replace(prefixRE, (prefix, prefixedFlags) => {
			flags = prefixedFlags;
			return '';
		});
		return {source, replacement, flags, rest}; 
	}
	const delim = template[0];
	if (/[\s\w(]/.test(delim)) throw new SyntaxError(`Illegal Delimiter in parse: ${delim}`);
	const matches = [...template.matchAll(delimiterRE(delim))].map( match => match.index );
	source = str.substring(1, matches[1]);
	if (matches.length > 1){
		rest = str.substring(matches[1]+1, matches[2]);
	}
	if (matches.length > 2){
		replacement = rest;
		rest = str.substring(matches[2]+1);
	}
	rest = rest.replace (/^([-a-zA-Z]*)\s*/, (_, f) =>{
		flags = f;
		return '';
	});
	return {source, replacement, flags, rest};
}

function find (range, source, sourceflags){
	const flagObject =  parseFlags (range, sourceflags + 'g');
	const {
		backwardScan,
		quotedPattern,
		restrictedScan,
		sticky,
		wrapScan,
		nativeFlags
	} = flagObject;
	source = quotedPattern ? quoteRegExp(source) : processTokens(source, flagObject, range);
	const findfunction = backwardScan ? findprimitiveback : findprimitive;
	let from, to;
	if (restrictedScan){
		from = range[0];
		to = range[1];
	}else if (backwardScan){
		from = 0;
		to = range[0];
	}else{
		from = range[1];
		to = range.length;
	}
	let match = findfunction (source, nativeFlags, range.all(), from, to);
	if (!match && wrapScan && !sticky && !restrictedScan){
		match = findfunction(source, nativeFlags, range.all(), 0, range.length);
	}
	range.match = match ?? false; // remember this for the caller
	if (match) range.bounds([match.index, match.index+match[0].length]); // select the found string
	return range;
}

function parseFlags (range, flags){
	const flagName = flag => FLAGS[flag]?.[0];
	const nativeFlags = Object.keys(FLAGS).filter( flag => FLAGS[flag][1] );
	const flagObject = {};
	// get the defaults
	for (const flag in FLAGS){
		flagObject[flagName(flag)] = range.data[flagName(flag)];
	}
	const splitFlags = flags.split('-');
	// get the positive flags
	for (const flag of splitFlags[0]){
		flagObject[flagName(flag.toLowerCase())] = false; // DEPRECATED NOTATION
		flagObject[flagName(flag)] = true;
	}
	// get the negative flags
	if (splitFlags[1]) for (const flag of splitFlags[1]){
		flagObject[flagName(flag)] = false;
	}
	flagObject.nativeFlags = nativeFlags.filter(flag => flagObject[flagName(flag)]).join('');
	return flagObject;
}

function quoteRegExp (source){
	// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
	return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// code taken from XRegExp project, https://xregexp.com/
const TOKENS = [];
function processTokens(source, flagObject, range){
	let currentScope = 'pattern';
	let ret = '';
	for (let i = 0; i < source.length;){
		if (currentScope == 'pattern' && source[i] == '['){
			currentScope = 'characterClass';
		}else if (currentScope == 'characterClass' && source[i] == ']'){
			currentScope = 'pattern';
		}
		for (const {pattern, handler, flag, scope} of TOKENS){
			if ((!scope || scope == currentScope) && (!flag || flagObject[flag])){
				const match = pattern.exec(source.substring(i));
				if (match?.index === 0){
					ret += handler(match[0], range);
					i += match[0].length;
					break;
				}
			}
		}
	}
	return ret;
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
		const re = new RegExp (source, flags);
		re.lastIndex = from;
		return re.exec(text);
	}else{
		if (!flags.includes('g')) flags +='g';
		const re = new RegExp (source, flags);
		re.lastIndex = from;	
		return [...text.matchAll(re)].pop();
	}
}

function replaceprimitive (search, flagObject, text, replacement, from, to){
	if (from > 0){
		// make sure we have at least (from) characters before the match
		search = `(?<=[^]{${from}})(?:${search})`;
	}
	if (to < text.length){
		// make sure we have at least (length - to) characters after the match
		search = `(?:${search})(?=[^]{${text.length - to}})`;
	}
	if (flagObject.sticky && flagObject.backward){
		flagObject.nativeFlags = flagObject.nativeFlags.replace(/[gy]/g, '');
		// make sure we don't have too many characters after the match
		search = `(?:${search})(?![^]{${text.length - to + 1}})`;
	}else if (flagObject.backward && ! flagObject.global){
		// would anyone ever do this? Replace only the last match?
		const match = findprimitiveback (search, flagObject.flags+'g', text, from, to);
		if (!match) return text.slice (from, to); // no match, no change
		search = `(?<=[^]{${match.index}})(?:${search})`;
	}
	const re = new RegExp (search, flagObject.nativeFlags);
	re.lastIndex = from; // only relevant for sticky && !backward
	// if to == length, then go to the end of the string,not to position 0!
	return text.replace (re, replacement).slice(from, to-text.length || undefined);
}

// match all characters as the default
TOKENS.unshift({
	pattern: /\\.|./s,
	handler: match => match,
});

TOKENS.unshift({
	pattern: /\\G/,
	handler: (_, rng) => `(?<=(?<![^])[^]{${rng[0]}})`,
	scope: 'pattern'
});

TOKENS.unshift({
	pattern: /\\g/,
	handler: (_, rng) => `(?<=(?<![^])[^]{${rng[1]}})`,
	scope: 'pattern'
});

TOKENS.unshift({
	pattern: /\\A/,
	handler: () => `(?<![^])`,
	scope: 'pattern'
});

TOKENS.unshift({
	pattern: /\\z/,
	handler: () => `(?![^])`,
	scope: 'pattern'
});

TOKENS.unshift({
	pattern: /\\Z/,
	handler: () => String.raw`(?![^\n])(?!\n[^])`,
	scope: 'pattern'
});

TOKENS.unshift({
	pattern: /\((?![?:])/,
    handler: () => '(?:',
	flag: 'explicitCapture',
	scope: 'pattern'
});

TOKENS.unshift({
	pattern: /\s+|#[^\n]*\n?/,
	handler: () => '(?:)',
	flag: 'freeSpacing',
	scope: 'pattern'
});

TOKENS.unshift({ // comment in pattern
	pattern: /\(\?#[^)]*\)/,
	handler: () => '(?:)',
	scope: 'pattern'
});

TOKENS.unshift({ // comment in character class
	pattern: /\(\?#[^)]*\)/,
	handler: () => '',
	scope: 'characterClass'
});

TOKENS.unshift({
	pattern: /\\Q[^]*?\\E/,
	handler: (match) => quoteRegExp(match.slice(2,-2))
});

})(bililiteRange);
