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

(function(undefined){

/*********************** shims: it's be nice to IE8 day *********************************/
if(!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g,'');
  };
}

/*********************** utility plugins *********************************/
bililiteRange.extend ({
lines: function(i, j){
	if (arguments.length){
		// selects the entire lines between i and j. 
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
	//insert text in a line by itself. Note that it's a newline, not a <br/> even if that would be appropriate
	var b = this.bounds();
	var text = this.all();
	if (b[0] > 0 && text.charAt(b[0]-1) != '\n') line = '\n'+line;
	if (b[1] < text.length && text.charAt(b[1]) != '\n') line += '\n';
	return this.text(line, select);
}

});

/*********************** the actual ex plugin *********************************/
bililiteRange.ex = {}; // namespace for exporting utility functions

bililiteRange.fn.ex = function (commandstring, defaultaddress){
	this.exMessage = '';
	var state = this.exState();
	// default address is generally the current line; 'bounds' means use the current bounds. '%' means the entire text
	defaultaddress = defaultaddress || '.';
	// set the next-to-last mark
	state.marks["'"] = state.marks["''"];
	state.marks["''"] = this.clone().live();
	// actually do the command
	commandstring = commandstring.replace(/^:+/,''); // ignore initial colons that were likely accidentally typed.
	splitCommands(commandstring, '|').forEach(function(command){
		var parsed = parseCommand(command, defaultaddress);
		interpretAddresses(this, parsed.addresses, state);
		parsed.command.call(this, parsed.parameter, parsed.variant);
	}, this);	
	this.dispatch({type: 'excommand', command: commandstring, range: this});
	return this; // allow for chaining
};

var exStates = []; // to avoid memory leaks, 
bililiteRange.fn.exState = function(options){
	var state = exStates[this.element().exState];
	if (!state){
		state = exStates[this.element().exState = exStates.length] = {
			// defaults
			wrapscan: true,
			multiline: true,
			shiftwidth: 8,
			marks: {},
		};
	}
	// simple copy, not recursive
	if (options) for (option in options) state[option] = options[option];
	return state; 
}

var buffers = bililiteRange.ex.buffers = []; // the delete buffer is a stack, with 0 the most recent (use shift rather than pop)

/*********************** command completion *********************************/

function commandCompletion(command){
	var ret = (function(){
		if (commands[command]) return commands[command];
		command = command.toLowerCase();
		for(trialCommand in commands){
			if (trialCommand.substr(0,command.length) == command) return commands[trialCommand];
		}
		throw {message: command+" not defined"};
	})();
	if (typeof ret == 'string') return commandCompletion(ret); // look for synonyms; beware of infinite loops!
	return ret;
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

// command id's in the real ex are letters and = & ~ > < 
var idRE = /^\s*([a-zA-Z=&~><]+)/;
var aUnicode = 'a'.charCodeAt(0);
function encodeID (c){
	// encodes a single character in base-26 (a-z) numbers preceded by '&'; sort of like encodeURI with '%'s
	// but with characters legal in ex commands
	function encode(x) {
		if (x < 26) return String.fromCharCode(x + aUnicode);
		return encode(x/26) + encode(x%26);
	};
	return '&' + encode(c.charCodeAt(0));
}
bililiteRange.ex.toID = function (s){
	// creates a legal id from an arbitrary string. Since I use sendkeys/keymap, I special-case those characters
	return s.replace(/./g, function (c){
		if (idRE.test(c)) return c;
		return {
			'%': 'alt~',
			'^': 'ctl~',
			'+': 'shift~',
			'{': '<',
			'}': '>'
		}[c] || encodeID(c) ;
	});
}

function parseCommand(command, defaultaddress){
	return {
		addresses: parseAddresses(),
		command: commandCompletion(parseCommandWord()),
		variant: parseVariant(),
		parameter: parseParameter()
	};
	
	function parseAddresses(){
		var addresses = [defaultaddress];
		// basic addresses
		command = command.replace(addressRE, function(match, c){
			addresses = [c];
			return '';
		});
		// relative addresses
		command = command.replace(/^\s*[-+\d]+/, function (match){
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
		command = command.replace(idRE, function (match, c){
			ret = c;
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
bililiteRange.ex.string = string; // export it

/*********************** turn an array of address descriptions into an actual range *********************************/
var lastRE = /(?:)/; // blank RE's refer to this
function interpretAddresses (rng, addresses){
	// 'bounds' is only used as the default to mean "don't change the range"
	if (addresses.length == 1 && addresses[0] == "bounds") return;
	var state = rng.exState();
	var lines = [];
	var currLine = rng.line();
	addresses.forEach(function(s){
		var offset = 0;
		s = s.replace(/[-+\d]+$/, function (match){
			offset = interpretOffset(match);
			return '';
		});
		if (s.charAt(0) == '/'){
			var re = createRE(s, rng.exState().ignorecase);
			lines.push(rng.bounds('EOL').find(re, !state.wrapscan).bounds('EOL').line()+offset);
		}else if (s.charAt(0) == '?'){
			// since having ? as a delimiter wreaks havoc with Javascript RE's, use ?/....../
			re = createRE(s.slice(1), rng.exState().ignorecase);
			lines.push(rng.bounds('BOL').findBack(re, !state.wrapscan).bounds('EOL').line()+offset);
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

function createRE(s, ignorecase){
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
		re = lastRE.source;
		flags = flags || lastRE.flags;
	}
	if (!/M/i.test(flags)) flags += 'm'; // default is multiline mode unless we mark it otherwise with M
	if (ignorecase && !/I/i.test(flags)) flags += 'i'; // allow for global option to ignore case
	var ret = new RegExp(re, flags.replace(/[^igm]/g,''));  // don't forget to remove the invalid flags
	if (/w/.test(flags)) ret.nowrap = false;
	if (/W/.test(flags)) ret.nowrap = true;
	ret.rest = s.replace(new RegExp('\\'+delim+'$'), ''); // remove the last delimiter if present
	lastRE = ret;
	lastRE.flags = flags;
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

function pushBuffer(text, buffer){
	if (buffer){
		if (/^[A-Z]/.test(buffer)){
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

function popBuffer (buffer){
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
/*********************** the actual editing commands *********************************/

// exported utility function
function booleanOption (option){
	return function (parameter, variant){
		var state = this.exState();
		if (parameter=='?'){
			this.exMessage = state[option] ? 'on' : 'off';
		}else if (parameter == 'off' || parameter == 'no' || parameter == 'false'){
			state[option] = variant;
		}else{
			state[option] = !variant; // variant == false means take it straight and set the option
		}
	};
}
bililiteRange.ex.booleanOption = booleanOption;

// a command is a function (parameter {String}, variant{Boolean}). 'this' is the bililiteRange; or a string that marks a synonym
var commands = bililiteRange.ex.commands = {
	a: 'append',

	ai: 'autoindent',

	append: function (parameter, variant){
		// the test is variant XOR autoindent. the !'s turn booleany values to boolean, then != means XOR
		if (!variant != !this.exState().autoindent) parameter = autoindent(parameter, this);
		this.bounds('endbounds').newline(parameter, 'end');
	},

	autoindent: booleanOption ('autoindent'),

	c: 'change',

	change: function (parameter, variant){
		if (!variant != !this.exState().autoindent) parameter = autoindent(parameter, this);
		pushBuffer (this.text());
		this.newline(parameter, 'end');
	},

	copy: function (parameter, variant){
		var targetrng = this.clone();
		var parsed = parseCommand(parameter);
		interpretAddresses(targetrng, parsed.addresses);
		targetrng.bounds('endbounds').newline(this.text(), 'end');
		this.bounds(targetrng.bounds());
	},

	del: function (parameter, variant){
		var match = /^([a-zA-Z]?)\s*(\d*)/.exec(parameter);
		// the regular expression will match anything (all the components are optional), so match is never false
		if (match[2]){
			// a count means we to change the range in e.g., 1,2 d 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
			var lines = this.lines();
			this.lines(lines[1], lines[1]+Math.max(1, parseInt(match[2]))-1);
		}
		pushBuffer(this.text(), match[1]);
		// need to delete the newline as well.
		this.bounds([this.bounds()[0], this.bounds()[1]+1]);
		this.text('', 'end');
	},

	'delete': 'del',

	global: function (parameter, variant){
		var re = createRE(parameter, this.exState().ignorecase);
		// turn pat into a list of live bookmarks
		var rngs = [];
		var lines = this.lines();
		for (i = lines[0]; i <= lines[1]; ++i){
			var line = this.clone().lines(i);
			if (re.test(line.text()) ? !variant : variant){ // that's re.test XOR variant
				rngs.push(line.live());
			}
		}
		rngs.forEach(function(line){
			splitCommands(re.rest, '\\n').forEach(function(command){
				var parsed = parseCommand(command);
				parsed.command.call(line, parsed.parameter, parsed.variant);
			});
		});
		this.bounds (rngs.length ? rngs.pop().bounds() : 'endbounds');
	},

	hardtabs: 'shiftwidth',

	ht: 'shiftwidth',

	i: 'insert',

	ignorecase: booleanOption ('ignorecase'),

	insert: function (parameter, variant){
		if (!variant != !this.exState().autoindent) parameter = autoindent(parameter, this);
		this.bounds('startbounds').newline(parameter, 'end');
	},

	ic: 'ignorecase',

	join: function (parameter, variant){
		var lines = this.lines();
		var match = /^\d+/.exec(parameter);
		if (match){
			// a count means we to change the range in e.g., 1,2 d 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
			lines = [lines[1], lines[1]+parseInt(match[0])-1];
		}
		if (lines[0] == lines[1]) ++lines[1]; // join at least 2 lines
		var re = variant ? /\n/g : /\s*\n\s*/g;
		var replacement = variant ? '' : ' '; // just one space. Doesn't do what the ex manual says about not inserting a space before a ')'
		this.lines(lines[0],lines[1]);
		this.text(this.text().replace(re, replacement), 'start');
	},

	k: 'mark',

	m: 'move',

	mark: function (parameter, variant){
		this.exState().marks[parameter] = this.clone().live();
	},

	ml: 'multiline',

	move: function (parameter, variant){
		var thisrng = this.clone().live();
		commands.copy.call (this, parameter, variant);
		commands.del.call (thisrng, '', false);
	},

	multiline: booleanOption ('multiline'),

	notglobal: function (parameter, variant){
		commands.global.call (this, parameter, !variant);
	},

	print: function() { this.select() },

	put: function (parameter, variant){
		// this seems to be the correct definition, but should this respect autoindent?
		commands.append.call (this, popBuffer(parameter), variant);
	},

	redo: function (parameter, variant){
		// restores the text only, not any other aspects of state
		this.undo(-1);
	},

	s: 'substitute',

	set: function (parameter, variant){
		if (!parameter || parameter == 'all'){
			// only display the stringifiable options
			var options = {}, state = this.exState();
			for (option in state) if (!(state[option] instanceof Object)) options[option] = state[option];
			this.exMessage = JSON.stringify(options);
		}else{
			splitCommands(parameter, ' ').forEach(function(command){
				var match = /(no)?(\w+)(\?|=(\S+)|)/.exec(command);
				if (!match && command.trim()) throw {message: 'Bad syntax in set: '+command};
				var func = match[2];
				if (match[1]){
					var value = match[1];
				}else if (!match[3]){
					value = 'on';
				}else if (match[3] == '?'){
					value = '?';
				}else{
					value = string(match[4]);
				}
				commandCompletion(func).call(this, value, variant); // each option takes care of its own setting
			});
		}
	},

	shiftwidth: function (parameter, variant){
		if (parameter == '?' || parameter === true || !parameter){
			this.exMessage = '['+this.exState().shiftwidth+']';
		}else{
			var shiftwidth = parseInt(parameter);
			if (isNaN(shiftwidth) || shiftwidth <= 0) throw {message: 'Invalid value for shiftwidth: '+parameter};
			this.exState().shiftwidth =
				this.element().style.tabSize =
				this.element().style.OTabSize =
				this.element().style.MozTabSize = shiftwidth; // for browsers that support this.
		}
	},

	substitute: function (parameter, variant){
		// we do not use the count parameter (too hard to interpret s/(f)oo/$1 -- is that last 1 a count or part of the replacement?
		// easy enough to assume it's part of the replacement but that's probably not what we meant)
		var re = createRE(parameter, this.exState().ignorecase);
		this.text(this.text().replace(re, string(re.rest))).bounds('endbounds');
	},

	sw: 'shiftwidth',

	t: 'copy',

	tabstop: 'shiftwidth',

	transcribe: 'copy',

	ts: 'shiftwidth',

	u: 'undo',

	undo: function (parameter, variant){
		// restores the text only, not any other aspects of state
		this.undo();
	},

	v: 'notglobal',

	wrapscan: booleanOption ('wrapscan'),

	ws: 'wrapscan',

	yank: function (parameter, variant){
		var match = /^([a-zA-Z]?)\s*(\d*)/.exec(parameter);
		// the regular expression will match anything (all the components are optional), so match is never false
		if (match[2]){
			// a count means we to change the range in e.g., 1,2 y 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
			var lines = this.lines();
			this.lines(lines[1], lines[1]+Math.max(1, parseInt(match[2]))-1);
		}
		pushBuffer(this.text(), match[1]);
	},

	'=': function (){
		var lines = this.lines();
		this.exMessage = '['+(lines[0] == lines[1] ? lines[0] : lines[0]+', '+lines[1])+']';
	},
	
	'&': 'substitute',

	'~': function (parameter, variant){
		// repeat substitution with last replacement string as the search pattern
		// according to http://pubs.opengroup.org/onlinepubs/9699919799/utilities/ex.html, this is synonymous with &
		// but according to the original ex manual (http://roguelife.org/~fujita/COOKIES/HISTORY/1BSD/exrefm.pdf)
		// this is the definition. It seems useless to have two identical shortcuts, so I'll use the latter
		lastRE = new RegExp (lastRE.rest, 'g');
		commands.substitute.call (rng, parameter, variant);
	}
};

})();