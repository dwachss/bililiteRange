// Attempts to implement the ex editor (http://pubs.opengroup.org/onlinepubs/9699919799/utilities/ex.html) with some tweaks to make it javascript-friendly 
// javascript regular expressions (and change ?regexp? addressing to ?/regexp/ since '?' is used so often as a metacharacter.
// It's also much more forgiving of syntax errors.
// errors are thrown with {message: 'whatever'}
// messages are returned in range.exMessage

// documentation: to be created
// Version 0.9
//  depends: bililiteRange.js, bililiteRange.util.js

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

(function(funcs, undefined){

/*********************** shims: it's be nice to IE8 day *********************************/
if ( !Array.prototype.forEach ) {
  Array.prototype.forEach = function(fn, scope) {
    for(var i = 0, len = this.length; i < len; ++i) {
      fn.call(scope, this[i], i, this);
    }
  }
}
if(!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g,'');
  };
}

/*********************** utility plugins *********************************/
bililiteRange.extend ({
lines: function(i, j){
	if (arguments.length){
		// selects the entire lines between i and j. If j < i results will be a collapsed range, but where is left undefined.
		if (i === undefined) i = j;
		if (j === undefined) j = i;
		if (i > j) j = (i += j -= i) - j; // ludicrously hacky 1-line swap (http://www.greywyvern.com/?post=265)
		if (j <= 0) return this.bounds('start');
		var totallines = this.all().split('\n').length;
		if (i > totallines) return this.bounds('end');
		var start = this.line(i).bounds('BOL').bounds();
		var end = this.line(j).bounds('EOL').bounds();
		return this.bounds([start[0], end[1]]);
	}else{
		var test = this.clone();
		return [test.line(), test.bounds('endbounds').line()];
	}
},

newline: function(line, select){
	//insert text in a line by itself
	var b = this.bounds();
	var text = this.all();
	if (b[0] > 0 && text.charAt(b[0]-1) != '\n') line = '\n'+line;
	if (b[1] < text.length && text.charAt(b[1]) != '\n') line += '\n';
	return this.text(line, select);
}

});

/*********************** the actual ex plugin *********************************/
bililiteRange.fn.ex = function (commandstring, state){
	// set up defaults
	this.exMessage = '';
	state = setdefaults(state);
	// set the next-to-last mark
	state.marks["'"] = state.marks["''"];
	state.marks["''"] = this.clone().live();
	// actually do the command
	var oldtext = this.all();
	var oldbounds = this.bounds();
	var oldundostate = state.undos.length;
	commandstring = commandstring.replace(/^:+/,''); // ignore initial colons that were likely accidentally typed.
	splitCommands(commandstring, '|').forEach(function(command){
		var parsed = parseCommand(command);
		interpretAddresses(this, parsed.addresses, state);
		funcs[parsed.command](this, parsed.parameter, parsed.variant, state);
	}, this);	
	// only remember text changes if it actually changed (since that is all we can undo) and if we haven't done some other undo manipulation
	if (oldtext != this.all() && oldundostate == state.undos.length){
		state.undos.push(oldtext);
		state.undobounds.push(oldbounds);
	}
	return this; // allow for chaining
};

/*********************** defaults *********************************/
function setdefaults(state){
	defaults = {
		options: { wrapscan: true, shiftwidth: 8 },
		abbrs: {},
		maps: {},
		marks: {},
		buffers: [], // the delete buffer is a stack, with 0 the most recent (use shift rather than pop)
		lastRE: /(?:)/, // blank RE's refer to this
		undos: [],
		redos: [],
		undobounds: [],
		redobounds: [],
		commands: {}
	};
	state = state || defaults;
	for (item in defaults) state[item] = state[item] || defaults[item];
	for (command in state.commands){
		// allow for extensions
		funcs[command] = state.commands[command];
		synonyms[command] = command;
	}
	return state;
}

/*********************** command completion *********************************/
var synonyms = {
	// synonyms for options and commands. Note that all the tab-related options are the same
	a: 'append',
	abbreviate: 'abbreviate',
	ai: 'autoindent',
	append: 'append',
	autoindent: 'autoindent',
	c: 'change',
	change: 'change',
	copy: 'copy',
	'delete': 'del',
	global: 'global',
	hardtabs: 'shiftwidth',
	ht: 'shiftwidth',
	i: 'insert',
	ignorecase: 'ignorecase',
	insert: 'insert',
	ic: 'ignorecase',
	join: 'join',
	k: 'mark',
	m: 'move',
	map: 'map',
	mark: 'mark',
	move: 'move',
	print: 'print',
	put: 'put',
	redo: 'redo',
	s: 'substitute',
	set: 'set',
	shiftwidth: 'shiftwidth',
	substitute: 'substitute',
	sw: 'shiftwidth',
	t: 'copy',
	tabstop: 'shiftwidth',
	transcribe: 'copy',
	ts: 'shiftwidth',
	undo: 'undo',
	v: 'notglobal',
	wrapscan: 'wrapscan',
	ws: 'wrapscan',
	yank: 'yank',
	'=': '=',
	'&': 'substitute',
	'~': '~'
};

function commandCompletion(command){
	if (synonyms[command]) return synonyms[command];
	for(trialCommand in synonyms){
		if (trialCommand.substr(0,command.length) == command) return synonyms[trialCommand];
	}
	throw {message: command+" not defined"};
}

/*********************** separating a command line into individual commands *********************************/
function splitCommands(commandLine, splitter){
	// need to be fancy about the | in regexps and strings; rather than try to make a monster regexp, use a simple parser
	var commands = [];
	var delims = /[/"]/; // regular expressions and strings
	var escaper = /\\/;
	for (var i = 0; i < commandLine.length; ++i){
		if (commandLine.indexOf(splitter, i) == i){
			// terribly inefficient to do the same search every time through the loop, but probably faster to use the native indexOf than any other search
			commands.push (commandLine.slice(0, i));
			commandLine = commandLine.slice(i+splitter.length);
			i = -1; // restart the loop
			continue;
		}
		var c = commandLine.charAt(i);
		if (escaper.test(c)) ++i;
		if (delims.test(c)){
			// scan forward until the end of the string
			for (var j = i+1; j <= commandLine.length; ++j){
				var d = commandLine.charAt(j);
				if (d === '') {
					// fell off the end; we will close the string
					commandLine += c;
					d = c;
				}
				if (escaper.test(d)) ++j;
				if (c == d){
					i = j;
					break;
				}
			}
		}
	}
	commands.push(commandLine); // the rest of the line
	return commands;
}

/*********************** parsing individual commands *********************************/
// create a regular expression to cover all possible address indicators.
// Rather than write the whole ugly thing out, synthesize it.
var REflags = 'igmwIMW'; // valid flags for regular expressions (I and M mean not i and m when they are the default, and w means wrap, overriding
// the state of wrapscan; W means no wrapping
function bslash(s) {return s.replace('\\', '\\\\')} // need to double-escape backslashes
var addressRE = new RegExp('^\\s*' + // allow whitespace at the beginning
	'('+[
		'[.\\$%]', // single character addresses
		'\\d+', // line numbers
		"'['a-z]", // marks
		bslash("\\&?[/?]"), // special regexps: \/, \&\, \?, \&?
		// forward (/ delimited) regexps, a slash followed by some (escaped character or a non slash) ended with a slash, possibly preceded with a question mark
		'\\??'+bslash('/(?:\\.|[^/])*/['+REflags+']*')
	].join('|')+')'
);

function parseCommand(command){
	return {
		addresses: parseAddresses(),
		command: commandCompletion(parseCommandWord()),
		variant: parseVariant(),
		parameter: parseParameter()
	};
	
	function parseAddresses(){
		var addresses = ['.']; // default address
		// basic addresses
		command = command.replace(addressRE, function(match, c){
			addresses = [c];
			return '';
		});
		// relative addresses
		command = command.replace(/^[-+\d]+/, function (match){
			addresses[0] += match;
			return '';
		});
		// a comma separates addresses
		if (/^\s*([,;])\s*/.test(command)){
			command = command.replace(/^\s*([,;])\s*/, '');
			if (RegExp.$1 == ';') addresses.push(';'); // need to track semicolons since they change the value of '.'
			addresses.push.apply(addresses, parseAddresses()); // recursively parse the whole list
		}
		return addresses;
	}

	function parseCommandWord(){
		if (/^\s*$/.test(command)) return 'print'; // blank line just goes to the addressed line, which is what we do with print
		var ret;
		command = command.replace(/^\s*([a-zA-Z=&~><]+)/, function (match, c){
			ret = c.toLowerCase();
			return '';
		});
		if (!ret) throw {message: "No command string"};
		return ret;
	}
	function parseVariant(){
		var variant = false;
		command = command.replace(/^\s*!/, function (){
			variant = true;
			return '';
		});
		return variant;
	}
	function parseParameter(){
		return (string(command));
	}
}

function string(text){
	// we use JSON strings if it is necessary to include special characters
	if (text === undefined) return '';
	text = text.trim();
	if (text.charAt(0) == '"') text = JSON.parse(text);
	return text;
}
/*********************** turn an array of address descriptions into an actual range *********************************/
function interpretAddresses (rng, addresses, state){
	var lines = [];
	var currLine = rng.line();
	addresses.forEach(function(s){
		var offset = 0;
		s = s.replace(/[-+\d]+$/, function (match){
			offset = interpretOffset(match);
			return '';
		});
		if (s.charAt(0) == '/'){
			var re = createRE(s, state.options.ignorecase, state);
			lines.push(rng.bounds('EOL').find(re, !state.options.wrapscan).bounds('EOL').line()+offset);
		}else if (s.charAt(0) == '?'){
			// since having ? as a delimiter wreaks havoc with Javascript RE's, use ?/....../
			re = createRE(s.slice(1), state.options.ignorecase, state);
			lines.push(rng.bounds('BOL').findBack(re, !state.options.wrapscan).bounds('EOL').line()+offset);
		}else if (s.charAt(0) == "'"){
			var mark = state.marks[s.slice(1)];
			if (mark){
				lines.push(mark.line());
			}else{
				throw {message: 'Mark '+s.slice(1)+' not defined'};
			}
		}else if (/\d+/.test(s)){
			lines.push(rng.line(parseInt(s)).find(/.*/).bounds('endbounds').line()+offset); // make sure we go to the end of the line
		}else if (s == '.'){
			lines.push(currLine+offset);
		}else if (s == '$'){
			lines.push (rng.bounds('all').bounds('endbounds').line()+offset);
		}else if (s == '%'){
			lines.push(0);
			lines.push (rng.bounds('all').bounds('endbounds').line());
		}else if (s == ';'){
			currLine = rng.line();
		}else if (s == ''){
			lines.push(offset);
		}
	});
	var lastline = lines.pop();
	rng.lines(lines.pop(), lastline);
}

function createRE(s, ignorecase, state){
	// create a RegExp from a string (with an aribitrary delimiter), of the form /re/(rest)?/?flags?/? (the "rest" part is for the substitute command)
	// as with splitCommands above, easier to scan with a simple parser than to use RegExps
	var delim = s.charAt(0);
	var escaper = /\\/;
	var re, rest,flags;
	for (var i = 1; i < s.length; ++i){
		c = s.charAt(i);
		if (escaper.test(c)) ++i;
		if (c == delim) break;
	}
	re = s.substring(1, i);
	s = s.substring(i+1);
	// flags may end with a delimiter, put in by the parser in splitCommands
	s = s.replace(RegExp('(['+REflags+']*)\\'+delim+'?$'), function(match, p1){
		flags = p1;
		return '';
	});
	if (re == ''){
		// blank string means use last regular expression
		re = state.lastRE.source;
		flags = flags || state.lastRE.flags;
	}
	if (!/M/i.test(flags)) flags += 'm'; // default is multiline mode unless we mark it otherwise with M
	if (ignorecase && !/I/i.test(flags)) flags += 'i'; // allow for global option to ignore case
	var ret = new RegExp(re, flags.replace(/[^igm]/g,''));  // don't forget to remove the invalid flags
	if (/w/.test(flags)) ret.nowrap = false;
	if (/W/.test(flags)) ret.nowrap = true;
	ret.rest = s.replace(new RegExp('\\'+delim+'$'), ''); // remove the last delimiter if present
	state.lastRE = ret;
	state.lastRE.flags = flags;
	return ret;
}

function interpretOffset(s){
	var re = /([-+]\d*)|\d+/g, ret = 0, match;
	while(match = re.exec(s)){
		switch (match[0]){
			case '+' : ++ret; break;
			case '-' : --ret; break;
			default: ret += parseInt(match[0]);
		}
	}
	return ret;
}

/*********************** the buffers *********************************/

function pushBuffer(text, buffers, buffer){
	if (buffer){
		if (/^[A-Z]/.test(parameter)){
			// uppercase means append
			buffers[buffer.toLowerCase()] += text;
		}else{
			buffers[buffer] = text;
		}
	}else{
		// unnamed buffer is the delete stack
		buffers.unshift(text);
	}		
}

function popBuffer (buffers, buffer){
	return buffer ? buffers[buffer.toLowerCase()] : buffers.shift();
}

/*********************** autoindenting *********************************/

function indentation(rng){
	// returns the whitespace at the start of this line
	return /^\s*/.exec(rng.clone().bounds('line').text())[0];
}
function autoindent (text, rng){
	return text.replace(/(^|\n)([ \t]*)/g, '$1$2'+indentation(rng)); // keep existing indentation!
}
/*********************** the editing functions *********************************/

function booleanOption (option, rng, parameter, variant, state){
	if (parameter=='?'){
		rng.exMessage = state.options[option];
	}else if (!parameter || parameter == 'off' || parameter == 'no' || parameter == 'false'){
		state.options[option] = false;
	}else{
		state.options[option] = true;
	}
}

funcs.abbreviate = function (rng, parameter, variant, state){
	var match = /^(\w+)\s*(.*)/.exec(parameter);
	if (!match) throw {message: 'Bad syntax in abbreviate: '+parameter};
	state.abbrs[match[1]] = string(match[2]);
}

funcs.append = function (rng, parameter, variant, state){
	// the test is variant XOR autoindent. the !'s turn booleany values to boolean, then != means XOR
	if (!variant != !state.options.autoindent) parameter = autoindent(parameter, rng);
	rng.bounds('endbounds').newline(parameter, 'end');
}

funcs.autoindent = function (rng, parameter, variant, state){
	booleanOption ('autoindent', rng, parameter, variant, state)
}

funcs.change = function (rng, parameter, variant, state){
	if (!variant != !state.options.autoindent) parameter = autoindent(parameter, rng);
	pushBuffer (rng.text(), state.buffers);
	rng.newline(parameter, 'end');
}

funcs.copy = function (rng, parameter, variant, state){
	var targetrng = rng.clone();
	var parsed = parseCommand(parameter);
	interpretAddresses(targetrng, parsed.addresses, state);
	targetrng.bounds('endbounds').newline(rng.text(), 'end');
	rng.bounds(targetrng.bounds());
}

funcs.del = function (rng, parameter, variant, state){
	var match = /^([a-zA-Z]?)\s*(\d*)/.exec(parameter);
	// the regular expression will match anything (all the components are optional), so match is never false
	if (match[2]){
		// a count means we to change the range in e.g., 1,2 d 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
		var lines = rng.lines();
		rng.lines(lines[1], lines[1]+Math.max(1, parseInt(match[2]))-1);
	}
	pushBuffer(rng.text(), state.buffers, match[1]);
	// need to delete the newline as well.
	rng.bounds([rng.bounds()[0], rng.bounds()[1]+1]);
	rng.text('', 'end');
}

funcs.global = function (rng, parameter, variant, state){
	var re = createRE(parameter, state.options.ignorecase, state);
	// turn pat into a list of live bookmarks
	var rngs = [];
	var lines = rng.lines();
	for (i = lines[0]; i <= lines[1]; ++i){
		var line = rng.clone().lines(i);
		if (re.test(line.text()) ? !variant : variant){ // that's re.test XOR variant
			rngs.push(line.live());
		}
	}
	rngs.forEach(function(line){
		splitCommands(re.rest, '\\n').forEach(function(command){
			var parsed = parseCommand(command);
			funcs[parsed.command](line, parsed.parameter, parsed.variant, state);
		});
	});
	rng.bounds (rngs.length ? rngs.pop().bounds() : 'endbounds');
}

funcs.ignorecase = function (rng, parameter, variant, state){
	booleanOption ('ignorecase', rng, parameter, variant, state)
}

funcs.insert = function (rng, parameter, variant, state){
	if (!variant != !state.options.autoindent) parameter = autoindent(parameter, rng);
	rng.bounds('startbounds').newline(parameter, 'end');
}

funcs.join = function (rng, parameter, variant, state){
	var lines = rng.lines();
	var match = /^\d+/.exec(parameter);
	if (match){
		// a count means we to change the range in e.g., 1,2 d 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
		lines = [lines[1], lines[1]+parseInt(match[0])-1];
	}
	if (lines[0] == lines[1]) ++lines[1]; // join at least 2 lines
	var re = variant ? /\n/g : /\s*\n\s*/g;
	rng.lines(lines[0],lines[1]);
	rng.text(rng.text().replace(re, ' '), 'start');
}

funcs.map = function (rng, parameter, variant, state){
	// use the control/alt key notation from Microsoft's sendkeys (http://msdn.microsoft.com/en-us/library/system.windows.forms.sendkeys.aspx)
	// but ^ must precede %. This also will distinguish ^c from ^C (the latter requires having the shift key pressed as well)
	var match = /^(\^?%?.)\s*(.*)/.exec(parameter);
	if (!match) throw {message: 'Bad syntax in map: '+parameter};
	state.maps[match[1]] = (variant ? '!' : '') + string(match[2]);
}

funcs.mark = function (rng, parameter, variant, state){
	state.marks[parameter] = rng.clone().live();
}

funcs.move = function (rng, parameter, variant, state){
	var thisrng = rng.clone().live();
	funcs.copy (rng, parameter, variant, state);
	funcs.del (thisrng, '', false, state);
}

funcs.notglobal = function (rng, parameter, variant, state){
	funcs.global(rng, parameter, !variant, state);
}

funcs.print = function(rng) { rng.select() };

funcs.put  = function (rng, parameter, variant, state){
	// this seems to be the correct definition, but should this respect autoindent?
	funcs.append(rng, popBuffer(state.buffers, parameter), variant, state);
}

funcs.redo = function (rng, parameter, variant, state){
	// restores the text only, not the selection point or any other aspects of state
	rng.all(state.redos.pop()).bounds(state.redobounds.pop());
}

funcs.set = function (rng, parameter, variant, state){
	if (!parameter || parameter == 'all'){
		rng.exMessage = JSON.stringify(state.options);
	}else{
		splitCommands(parameter, ' ').forEach(function(command){
			var match = /(no)?(\w+)(\?|=(\S+)|)/.exec(command);
			if (!match && command.trim()) throw {message: 'Bad syntax in set: '+command};
			var func = match[2];
			if (match[1]){
				var value = false;
			}else if (!match[3]){
				value = true;
			}else if (match[3] == '?'){
				value = '?';
			}else{
				value = string(match[4]);
			}
			funcs[commandCompletion(func)](rng, value, variant, state); // each option takes care of its own setting
		});
	}
}

funcs.shiftwidth = function (rng, parameter, variant, state){
	if (parameter == '?' || parameter === true || !parameter){
		rng.exMessage = state.options.shiftwidth;
	}else{
		var shiftwidth = parseInt(parameter);
		if (isNaN(shiftwidth) || shiftwidth <= 0) throw {message: 'Invalid value for shiftwidth: '+parameter};
		state.options.shiftwidth = shiftwidth;
		rng._el.style.tabSize = shiftwidth; // for browsers that support this.
	}
}

funcs.substitute = function (rng, parameter, variant, state){
	// we do not use the count parameter (too hard to interpret s/(f)oo/$1 -- is that last 1 a count or part of the replacement?
	// easy enough to assume it's part of the replacement but that's probably not what we meant)
	var re = createRE(parameter, state.options.ignorecase, state);
	rng.text(rng.text().replace(re, string(re.rest))).bounds('endbounds');
}

funcs.unabbreviate = function (rng, parameter, variant, state){
	delete state.abbrs[parameter];
}

funcs.map = function (rng, parameter, variant, state){
	delete state.maps[(variant ? '!' : '') + parameter];
}

funcs.undo = function (rng, parameter, variant, state){
	// restores the text only, not the selection point or any other aspects of state
	state.redos.push(rng.all());
	state.redobounds.push(rng.bounds());
	rng.all(state.undos.pop()).bounds(state.undobounds.pop());
}

funcs.wrapscan = function (rng, parameter, variant, state){
	booleanOption ('wrapscan', rng, parameter, variant, state)
}

funcs.yank = function (rng, parameter, variant, state){
	var match = /^([a-zA-Z]?)\s*(\d*)/.exec(parameter);
	// the regular expression will match anything (all the components are optional), so match is never false
	if (match[2]){
		// a count means we to change the range in e.g., 1,2 d 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
		var lines = rng.lines();
		rng.lines(lines[1], lines[1]+Math.max(1, parseInt(match[2]))-1);
	}
	pushBuffer(rng.text(), state.buffers, match[1]);
}

funcs['='] = function (rng){
	var lines = rng.lines();
	rng.exMessage = '['+(lines[0] == lines[1] ? lines[0] : lines[0]+', '+lines[1])+']';
}

funcs['~'] = function (rng, parameter, variant, state){
	// repeat substitution with last replacement string as the search pattern
	// according to http://pubs.opengroup.org/onlinepubs/9699919799/utilities/ex.html, this is synonymous with &
	// but according to the original ex manual (http://roguelife.org/~fujita/COOKIES/HISTORY/1BSD/exrefm.pdf)
	// this is the definition. It seems useless to have two identical shortcuts, so I'll use the latter
	state.lastRE = new RegExp (state.lastRE.rest, 'g');
	funcs.substitute (rng, parameter, variant, state);
}

})({});