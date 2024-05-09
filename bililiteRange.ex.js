const { bililiteRange } = require('./bililiteRange.js');

/*********************** the actual ex plugin *********************************/
bililiteRange.ex = {}; // namespace for exporting utility functions

const exkey = Symbol(); // marker that an element has been processed already

bililiteRange.createOption ('stdout', {value: console.log, enumerable: false});
bililiteRange.createOption ('stderr', {value: console.error, enumerable: false});
bililiteRange.createOption ('reader', {
	value: async (file, dir) => localStorage.getItem(file)
});
bililiteRange.createOption ('writer', {
	value: async (text, file, dir) => localStorage.setItem(file, text)
});
// to use AJAX (you would probably want to handle HTTP errors, which still resolve, with response.ok != true):
// range.data.reader = async (file, dir) => (await fetch(file)).text();
// range.data.writer = async (text, file, dir) => await fetch(file, {method: 'POST', body: text});
// to use jQuery:
// range.data.reader = async (file, dir) => $.get(file);
// range.data.writer = async (text, file, dir) => $.post(file, {text: text});
bililiteRange.createOption ('savestatus', { monitored: true, value: 'clean', enumerable: false });
bililiteRange.createOption ('confirm', { enumerable: false, value: false });

bililiteRange.prototype.executor = function ({command, defaultaddress = '%%'} = {}){
	// returns a function that will run commandstring (if not defined, then will run whatever command is passed in when executed)
	const el = this.element;
	return text => {
		el.focus();
		bililiteRange(el).bounds('selection').
		 ex(command ?? text, defaultaddress).
		 select().
		 scrollIntoView();
	}
};

bililiteRange.prototype.ex = function (commandstring = '', defaultaddress = '.'){
	const data = this.data;
	if (!this.element[exkey]){
		this.element[exkey] = new Set(); // for storing all the event handlers that need to be removed at quit

		this.initUndo(false); // ex shouldn't affect key strokes

		data.directory ??= this.window.location.origin;
		data.file ??= this.window.location.pathname; // if this is set to the empty string, then don't save anything.

		addListener (this, 'visibilitychange', evt => {
			if (document.visibilityState == 'hidden') preserve(this);
		}, document);
		const unloadhandler = evt => {
			evt.preventDefault();
			return evt.returnValue = 'not saved'; // any nonempty string
		};
		addListener (this, 'input', evt => data.savestatus = 'dirty');
		addListener(this, 'beforeunload', unloadhandler, window);
		addListener (this, 'data-savestatus', evt => {
			// from https://developer.chrome.com/blog/page-lifecycle-api/
			if (data.savestatus == 'clean' || !data.confirm){
				this.dontlisten('beforeunload', unloadhandler, window);
			}else{
				this.listen('beforeunload', unloadhandler, window);
			}
		});
		data.savestatus = 'clean';
		data.marks = {
			"'": this.clone().live(), // this will record the last position in the text
			"''": this.clone().live() // this records the current position; just so it can be copied into ' above
		};
	}else{
		// update the marks
		let b = this.bounds(), lastb = data.marks["''"].bounds();
		if (b[0] != lastb[0] || b[1] != lastb[1]){
			data.marks["'"].bounds(lastb);
			data.marks["''"].bounds(b);
		}
	}
	// actually do the command
	commandstring = commandstring.replace(/^:+/,''); // ignore initial colons that were likely accidentally typed.
	try{
		splitCommands(commandstring, '|').forEach(function(command){
			let parsed = parseCommand(command, defaultaddress);
			interpretAddresses(this, parsed.addresses, data);
			parsed.command.call(this, parsed.parameter, parsed.variant);
		}, this);
		this.dispatch({type: 'excommand', command: commandstring, range: this});
	}catch(err){
		this.data.stderr(err);
	}
	return this; // allow for chaining
};

var registers = bililiteRange.ex.registers = []; // the delete register is a stack, with 0 the most recent (use shift rather than pop)

/*********************** command completion *********************************/

function commandCompletion(command){
	var ret = (function(){
		if (commands[command]) return commands[command];
		command = command.toLowerCase();
		for (var trialCommand in commands){
			if (trialCommand.substring(0,command.length) == command) return commands[trialCommand];
		}
		throw new Error(command+" not defined");
	})();
	if (typeof ret == 'string') return commandCompletion(ret); // look for synonyms; beware of infinite loops!
	return ret;
}

/*********************** separating a command line into individual commands *********************************/
function splitCommands(commandLine, splitter = '|'){
	// need to be fancy about the | in regexps and strings; rather than try to make a monster regexp, use a simple parser
	var commands = [];
	var delims = /[/"]/; // regular expressions and strings
	var escaper = /\\/;
	for (var i = 0; i < commandLine.length; ++i){
		if (commandLine.substring(i, splitter.length) == splitter){
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
	commands = commands.filter ( item => item ); // remove empty strings
	return commands;
}

bililiteRange.ex.splitCommands = splitCommands;

/*********************** parsing individual commands *********************************/
// create a regular expression to cover all possible address indicators.
// Rather than write the whole ugly thing out, synthesize it.
const addressRE = new RegExp('^\\s*' + // allow whitespace at the beginning
	'('+[
		'%%', // my extension to mean "current range"
		String.raw`[.\$%]`, // single character addresses
		String.raw`\d+`, // line numbers
		"'['a-z]", // marks
		// regular expressions. Allow any letters as flags
		String.raw`/(?:\\.|[^/])*/[a-zA-Z]*`
	].join('|')+')'
);

// command names. Technically multiple >>> and <<< are legal, but we will treat them as parameters
const idRE = /^\s*([!=&~><]|[a-zA-Z]+)/;

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
		if (/^\s*[,;]\s*/.test(command)){
			if (/^\s*;/.test(command)) addresses.push(';'); // need to track semicolons since they change the value of '.'
			command = command.replace(/^\s*[,;]\s*/, '');
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
		if (!ret) throw new Error("No command string");
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
	if (text.startsWith('"')){
		try{
			text = JSON.parse(text);
		}catch (err){
			// nothing; it's not a JSON string
		}
	}
	return text;
}
bililiteRange.ex.string = string; // export it

/*********************** turn an array of address descriptions into an actual range *********************************/
var lastRE = /(?:)/; // blank RE's refer to this
var lastSubstitutionRE = /(?:)/; // & command uses this
function interpretAddresses (rng, addresses){
	// %% is the current range. If it is used by itself, don't change the range (or use line-based addressing)
	if (addresses.length == 1 && addresses[0] == "%%") return;
	const data = rng.data;
	var lines = [];
	var currLine = rng.line();
	addresses.forEach(function(s){
		var offset = 0;
		s = s.replace(/[-+\d]+$/, function (match){
			offset = interpretOffset(match);
			return '';
		});
		if (s.charAt(0) == '/'){
			var re = createRE(s);
			let line = rng.bounds(re).line()+offset;
			lines.push(line);
		}else if (s.charAt(0) == "'"){
			var mark = data.marks[s.slice(1)];
			if (mark){
				var these = mark.lines();
				lines.push(these[0]);
				if (these[0] != these[1]) lines.push(these[1]);
			}else{
				throw new Error('Mark '+s.slice(1)+' not defined');
			}
		}else if (/\d+/.test(s)){
			lines.push(rng.bounds('line', s).bounds('EOL').line()+offset); // make sure we go to the end of the line
		}else if (s == '.'){
			lines.push(currLine+offset);
		}else if (s == '%%'){
			var rnglines = rng.lines();
			lines.push(rnglines[0]);
			lines.push(rnglines[1]+offset);
		}else if (s == '$'){
			lines.push (rng.bounds('end').line()+offset);
		}else if (s == '%'){
			lines.push(0);
			lines.push (rng.bounds('end').line()+offset);
		}else if (s == ';'){
			if (lines.length > 0)	currLine = lines[lines.length-1];
		}else if (s == ''){
			lines.push(offset);
		}
	});
	rng.bounds('line', lines.pop(), lines.pop());
}

// we want to be able to list RegExp's with set, which uses JSON.stringify. This function lets us to that.
function REtoJSON() { return '/' + this.source + '/' + (this.flags || '') }
function createRE(s, substitute = false){
	// create a pseudo RegExp from a string (with an aribitrary delimiter, no \w characters or special RegExp characters).
	// if substitute is true, of the form /source/(replacement/)?flags?/?
	// otherwise /source/flags?/?
	// note that it may end with a delimiter, which may be added by the parser in splitCommands
	// as with splitCommands above, easier to scan with a simple parser than to use RegExps
	const delim = s.charAt(0);
	if (/[\w\\|"]/.test(delim)) throw new Error(`Illegal delimiter in regular expression: ${delim}`);
	const escaper = /\\/;
	let source, replacement, flags;
	let i;
	for (i = 1; i < s.length; ++i){
		let c = s.charAt(i);
		if (escaper.test(c)) ++i;
		if (c == delim) break;
	}
	source = s.substring(1, i);
	s = s.substring(i+1);
	if (substitute) {
		for (i = 0; i < s.length; ++i){
			let c = s.charAt(i);
			if (escaper.test(c)) ++i;
			if (c == delim) break;
		}
		replacement = s.substring(0, i);
		s = s.substring(i+1);
	}else{
		replacement = '';
	}
	// flags may end with a delimiter, put in by the parser in splitCommands
	s = s.replace(RegExp('([a-zA-Z]*)\\'+delim+'?'), function(match, p1){
		flags = p1;
		return '';
	});
	if (source == ''){
		// blank string means use last regular expression
		source = lastRE.source;
	}
	lastRE = {source, replacement, flags, rest: s, toJSON: REtoJSON};
	return lastRE;
}
bililiteRange.ex.createRE = createRE;

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

/*********************** the registers *********************************/

function pushRegister(text, register){
	if (register){
		if (/^[A-Z]/.test(register)){
			// uppercase means append
			registers[register.toLowerCase()] += text;
		}else{
			registers[register] = text;
		}
	}else{
		// unnamed register is the delete stack
		registers.unshift(text);
	}
}

function popRegister (register){
	return register ? registers[register.toLowerCase()] : registers.shift();
}

/*********************** save and quit *********************************/

function preserve (rng) {
	const data = rng.data;
	localStorage.setItem(`ex-${data.directory}/${data.file}`, rng.all());
}

function recover (rng) {
	const data = rng.data;
	rng.all(localStorage.getItem(`ex-${data.directory}/${data.file}`));
}

function writer (rng, parameter) {
	const file = parameter || rng.data.file;
	return rng.data.writer (rng.all(), file, rng.data.directory).then( () => {
		rng.data.savestatus = 'clean';
		if (parameter) rng.data.file = parameter;
		rng.data.stdout (file + ' saved');
	}).catch( err => {
		rng.data.savestatus = 'failed';
		rng.data.stderr(new Error (file + ' not saved'));
	});
};

function addListener (rng, ...handler){
	rng.element[exkey].add(handler);
	rng.listen(...handler);
}

function removeListeners (rng){
	rng.element[exkey].forEach( handler => rng.dontlisten(...handler) );
}

/*********************** the actual editing commands *********************************/

// a command is a function (parameter {String}, variant {Boolean})
// 'this' is the bililiteRange; or a string that marks a synonym
var commands = bililiteRange.ex.commands = {
	a: 'append',

	ai: 'autoindent',

	append: function (parameter, variant){
		this.bounds('EOL').text(parameter, {
			ownline: true,
			autoindent: variant ? 'invert' : undefined
		}).bounds('endbounds');
	},

	c: 'change',

	cd: 'directory',

	change: function (parameter, variant){
		pushRegister (this.text());
		const indentation = this.indentation();
		this.text(parameter, {
			inputType: 'insertReplacementText'
		}).bounds('endbounds');
		// the test is variant XOR autoindent. the !'s turn booleany values to boolean, then != means XOR
		if (!variant != !this.data.autoindent) this.indent(indentation);
	},

	chdir: 'directory',

	copy: function (parameter, variant){
		var targetrng = this.clone();
		var parsed = parseCommand(parameter, '.');
		interpretAddresses(targetrng, parsed.addresses);
		targetrng.bounds('endbounds').text(this.text(), {
			ownline: true,
			inputType: 'insertFromPaste'
		}).bounds('endbounds');
		this.bounds(targetrng.bounds());
	},

	del: function (parameter, variant){
		var match = /^([a-zA-Z]?)\s*(\d*)/.exec(parameter);
		// the regular expression will match anything (all the components are optional), so match is never false
		if (match[2]){
			// a count means we to change the range in e.g., 1,2 d 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
			var lines = this.lines();
			this.bounds('line', lines[1], lines[1]+Math.max(1, parseInt(match[2]))-1);
		}
		pushRegister(this.text(), match[1]);
		this.bounds('andnewline').text('', {inputType: 'deleteContent'}).bounds('endbounds');
	},

	'delete': 'del',

	dir: 'directory',

	edit: function (parameter, variant){
		if (this.data.confirm && this.data.savestatus == 'dirty' && !variant){
			throw new Error (this.data.file + ' not saved. Use edit! to force reloading');
		}
		const file = parameter || this.data.file;
		this.data.reader(file, this.data.directory).then( text => {
			if (parameter) this.data.file = parameter;
			this.all(text).bounds('end');
			this.data.savestatus = 'clean';
			this.data.stdout (file + ' loaded');
		}).catch(
			err => this.data.stderr (new Error (file + ' not loaded'))
		);
	},

	global: function (parameter, variant){
		if (parameter == '?' || /^[a-z]/.test(parameter)){
			// we are referring to the global option, not the command
			createOption.Boolean('global').call(this, parameter, variant);
			return;
		}
		// TODO: make this work correctly, even with multiple added lines.
		var re = createRE(parameter);
		re.flags += 'r'; // search within the line
		var commands = string(re.rest);
		var line = this.clone();
		var lines = this.lines();
		for (var i = lines[0]; i <= lines[1]; ++i){
			line.bounds('line', i).bounds(re);
			if (!line.match == variant){ // !match means match is not defined.
				const oldlines = this.all().split('\n').length;
				line.ex(commands);
				const addedlines = this.all().split('\n').length - oldlines;
				lines[1] += addedlines;
				i += addedlines;
				// note that this assumes the added lines are all  before or immediately after the current line. If not, we will skip the wrong lines
			}
		}
		this.bounds(line).bounds('EOL'); // move to the end of the last modified line
	},

	i: 'insert',

	insert: function (parameter, variant){
		// go to right before the beginning of this line
		this.bounds('BOL').bounds(this[0]-1).text(parameter, {
			ownline: true,
			autoindent: variant ? 'invert' : undefined
		}).bounds('endbounds');
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
		this.bounds('line', lines[0], lines[1]);
		this.text(this.text().replace(re, replacement), {
			inputType: 'insertReplacementText'
		}).bounds('startbounds');
	},

	k: 'mark',

	m: 'move',

	map: function (parameter, variant){
		const parameters = splitCommands (parameter, ' ');
		const lhs = string(parameters.shift());
		const rhs = string(parameters.join(' '));
		this.dispatch ({type: 'map', detail: { command: 'map', variant, rhs, lhs }});
	},

	mark: function (parameter, variant){
		const mark = this.clone();
		this.data.marks[parameter] = mark.live();
	},

	move: function (parameter, variant){
		const text = this.text();
		const parsed = parseCommand(parameter, '.');
		const targetrng = this.clone();
		interpretAddresses(targetrng, parsed.addresses);
		if (targetrng[0] >= this[0] && targetrng[0] <= this[1]) return; // if target is inside the current range, don't do anything
		targetrng.bounds('endbounds');
		this.bounds('andnewline').text('', {inputType: 'deleteByDrag'});
		targetrng.text(text, {
			ownline: true,
			inputType: 'insertFromDrop'
		}).bounds('startbounds');
		if (targetrng[0] >= this[0]) targetrng[0] -= text.length; // account for the removed text
		this.bounds(targetrng[0]);
	},

	notglobal: function (parameter, variant){
		commands.global.call (this, parameter, !variant);
	},

	print: function() { this.select() },

	preserve () { preserve(this) },

	put: function (parameter, variant){
		this.bounds('EOL').text(popRegister(parameter), {
			inputType: 'insertFromYank',
			ownline: true
		}).bounds('endbounds');
	},

	quit (parameter, variant){
		const data = this.data;
		if (!variant && data.savestatus != 'clean' && data.confirm){
			if (!data.confirm(`${data.file} not saved. Do you want to leave?`)) return;
		}
		preserve(this);
		removeListeners (this);
		delete this.element[exkey];
		Object.values(data.marks).forEach( rng => rng.live(false) );
		data.marks = {};
		this.window.dispatchEvent( new CustomEvent('quit', { detail: this.element }) );
	},

	read: function (parameter, variant){
		if (variant) {
			this.text(Function (parameter).call(this));
		}else{
			const file = parameter || this.data.file;
			this.data.reader(file, this.data.directory).then( text => {
				this.bounds('EOL').text(text, {
					ownline: true
				}).bounds('endbounds');
				this.data.stdout(file + ' read');
			}).catch(
				err => this.data.stderr(new Error (file + ' not read'))
			);
		}
	},

	recover () { recover(this) },

	redo: function (parameter, variant){
		// restores the text only, not any other aspects of state
		this.redo();
	},

	s: 'substitute',

	sendkeys: function (parameter, variant){
		this.sendkeys(parameter);
	},

	set: function (parameter, variant){
		if (!parameter){
			this.data.stdout (JSON.stringify(this.data));
		}else if(parameter == 'all'){
			this.data.stdout (JSON.stringify (this.data.all));
		}else{
			var self = this;
			splitCommands(parameter, ' ').forEach(function(command){
				var match = /(no)?([^=?]+)(\?|=(.+)|)/.exec(command);
				if (!match && command.trim()) throw new Error('Bad syntax in set: '+command);
				var func = match[2];
				if (match[1]){
					var value = 'off';
				}else if (!match[3]){
					value = 'on';
				}else if (match[3] == '?'){
					value = '?';
				}else{
					value = string(match[4]);
				}
				commandCompletion(func).call(self, value, variant); // each option takes care of its own setting
			});
		}
	},

	shiftwidth: "tabsize",

	source: function (parameter, variant){
		if (!parameter) throw new Error ('No file named in source');
		this.data.reader(parameter, this.data.directory).then( sourcefile => {
			// blank lines should be ignored, not interpreted as print
			sourcefile.split('\n').filter( line => line.trim() ).forEach ( line => this.ex(line) );
		}).catch(
			err => this.data.stderr(new Error (parameter + ' not read in source'))
		);
	},

	substitute: function (parameter, variant){
		// we do not use the count parameter (too hard to interpret s/(f)oo/$1 -- is that last 1 a count or part of the replacement?
		// easy enough to assume it's part of the replacement but that's probably not what we meant)
		var re = parameter ? createRE(parameter, true) : lastSubstitutionRE;
		if (re.source == '' && re.replacement == '') re = lastSubstitutionRE;
		if (re.source == '') re.source = lastRE.source;
		this.replace(re, string(re.replacement)).bounds('EOL');
		lastSubstitutionRE = Object.assign({}, re); // clone, so
	},

	sw: 'tabsize',

	t: 'copy',

	tabstop: 'tabsize',

	transcribe: 'copy',

	ts: 'tabsize',

	unmap: function (parameter, variant){
		this.dispatch ({type: 'map', detail: { command: 'unmap', variant, lhs: parameter }});
	},

	write: function (parameter, variant){
		// unlike real ex, always writes the whole file.
		writer (this, parameter);
	},

	u: 'undo',

	undo: function (parameter, variant){
		// restores the text only, not any other aspects of state
		this.undo();
	},

	v: 'notglobal',

	version: function (parameter, variant){
		this.data.stdout(this.element[exkey]);
	},

	wq: 'xit',

	ws: 'wrapscan',

	xit: function(parameter, variant){
		writer(this, parameter).finally( ()=> {
			if (variant || this.data.savestatus == 'clean'){
				commands.quit.call(this, parameter, variant);
			}
		});
	},

	yank: function (parameter, variant){
		var match = /^([a-zA-Z]?)\s*(\d*)/.exec(parameter);
		// the regular expression will match anything (all the components are optional), so match is never false
		if (match[2]){
			// a count means we to change the range in e.g., 1,2 y 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
			var lines = this.lines();
			this.bounds('line', lines[1], lines[1]+Math.max(1, parseInt(match[2]))-1);
		}
		pushRegister(this.text(), match[1]);
	},

	'=': function (){
		let lines = this.lines();
		this.data.stdout ('['+(lines[0] == lines[1] ? lines[0] : lines[0]+', '+lines[1])+']');
	},

	'&': 'substitute',

	'~': function (parameter, variant){
		lastSubstitutionRE.source = lastRE.source;
		lastSubstitutionRE.flags = '';
		commands.substitute.call (this, parameter, variant);
	},

	'>': function (parameter, variant){
		parameter = parseInt(parameter);
		if (isNaN(parameter) || parameter < 0) parameter = 1;
		this.indent('\t'.repeat(parameter));
	},

	'<': function (parameter, variant){
		parameter = parseInt(parameter);
		if (isNaN(parameter) || parameter < 0) parameter = 1;
		this.unindent(parameter, this.data.tabsize);
	},

	'!': function (parameter, variant){
		// not a shell escape but a Javascript escape
		Function (parameter).call(this);
	}
};

/*********************** the options *********************************/

// note that this createOption is for ex options, which are bililiteRange options with added ex commands.

function createOption (name, value){
	value = bililiteRange.createOption(name, arguments.length > 1 ? {value: value} : {});
	// now create a command to set the value, based on value's type
	var constructor = value.constructor.name;
	bililiteRange.ex.commands[name] = (createOption[constructor] || createOption.generic)(name);
}

bililiteRange.ex.createOption = createOption;

createOption.generic = function (name){
	return function (parameter, variant){
		if (parameter == '?' || parameter === true || parameter == undefined){
			this.data.stdout (JSON.stringify(this.data[name]));
		}else{
			this.data[name] = parameter;
		}
	}
}

createOption.Boolean = function (name){
	return function (parameter, variant){
		const data = this.data;
		if (parameter=='?'){
			data.stdout (data[name] ? 'on' : 'off');
		}else if (parameter == 'off' || parameter == 'no' || parameter == 'false'){
			data[name] = variant;
		}else if (parameter == 'toggle'){
			data[name] = !data[name];
		}else{
			data[name] = !variant; // variant == false means take it straight and set the option
		}
	};
}

createOption.Number = function (name){
	return function (parameter, variant){
		if (parameter == '?' || parameter === true || !parameter){
			this.data.stdout ('['+this.data[name]+']');
		}else{
			var value = parseInt(parameter);
			if (isNaN(value)) throw new Error('Invalid value for '+name+': '+parameter);
			this.data[name] = value;
		}
	}
}

createOption.RegExp = function (name){
	return function (parameter, variant){
		if (parameter == '?' || parameter === true || !parameter){
			this.data.stdout (JSON.stringify(this.data[name]));
		}else{
			this.data[name] = createRE(parameter);
		}
	}
}

createOption ('autoindent');
createOption ('ignorecase');
createOption ('magic');
createOption ('tabsize');
createOption ('wrapscan');
createOption ('directory', '');
createOption ('file', 'document');

module.exports = bililiteRange;
