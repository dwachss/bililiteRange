'use strict';

(function(){
// a line goes from after the newline to before the next newline. The newline is not included in that line! It's
// a separator only.
bililiteRange.bounds.EOL = function () {
	const nextnewline = this.all().indexOf('\n', this[1]);
	if (nextnewline != -1) return nextnewline;
	return this.bounds('end'); // no newline
};
bililiteRange.bounds.BOL = function(){
	if (this[0] == 0) return 0;
	const prevnewline = this.all().lastIndexOf('\n', this[0]-1);
	if (prevnewline != -1) return prevnewline + 1;
	return 0; // no newline
};
bililiteRange.bounds.line = function (name, n, n2){
	if (n == null){
		// select the entire line or lines including the newline
		return this.bounds('union', 'BOL').bounds('union', 'EOL');
	}else if (n2 == null){
		// select one line. Note that it is 1-indexed, the way ex does it!
		n = parseInt(n);
		if (isNaN(n)) return this.bounds();
		if (n < 1) return [0,0];
		const mynewline = (new RegExp(`^(.*\n){${n}}`)).exec(this.all()); // find the nth newline
		if (mynewline == null){
			this.bounds('end');
			// if this is the last line but it doesn't end with a newline, then accept the whole line
			if (this.all().split('\n').length == n) this.bounds('line');
			return this;
		}
		return this.bounds(mynewline[0].length-1).bounds('line');
	}else{
		return this.bounds('line', n).bounds('union', 'line', n2);
	}
};
bililiteRange.bounds.andnewline = function(){
	// if we want a "line" to include the following newline, use this
	if (this.all().charAt(this[1]) == '\n') return this.bounds('union', this[1]+1);
}
bililiteRange.bounds.char = function (name, n){
	// move to character position n in the line of the start of this range.
	this.bounds('EOL');
	this.bounds('BOL').bounds('line');
	if (this.bounds('BOL').bounds('line').text().length < n){
		return this.bounds('EOL');
	}else{
		return this[0] + n;
	}
};

bililiteRange.createOption ('autoindent', {value: false});
bililiteRange.override ('text', function (text, opts = {}){
	if ( text === undefined ) return this.super();
	if (opts.ownline && text[0] != '\n' && this[1] > 0) text = `\n${text}`;
	if (opts.ownline && this.all().charAt(this[1]) != '\n') text = `${text}\n`;
	if (opts.autoindent == 'invert') opts.autoindent = !this.data.autoindent;
	if (opts.autoindent || (opts.autoindent == null && this.data.autoindent && opts.inputType == 'insertLineBreak')){
		text = indent(text, this.indentation());
	}
	return this.super(text, opts);
});

bililiteRange.createOption ('tabsize', { value: 2, monitored: true }); // 8 is the browser default
bililiteRange.addStartupHook ( (element, range, data) => {
	element.style.tabSize = element.style.MozTabSize = data.tabsize; // the initial value will be set before we start listening
	range.listen('data-tabsize', evt => element.style.tabSize = element.style.MozTabSize = evt.detail);
});

bililiteRange.extend({
	char: function(){
		return this[0] - this.clone().bounds('BOL')[0];
	},
	indent: function (tabs){
		// tabs is the string to insert before each line of the range
		this.bounds('union', 'BOL');
		// need to make sure we add the tabs at the start of the line in addition to after each newline
		return this.text(tabs + indent (this.text(), tabs), {select: 'all', inputType: 'insertReplacementText'});
	},
	indentation: function(){
		// returns the whitespace at the start of this line
		return /^\s*/.exec(this.clone().bounds('line').text())[0];
	},
	line: function(){
		// return the line number of the *start* of the bounds. Note that it is 1-indexed, the way ex writes it!
		// just count newlines before this.bounds
		return this.all().slice(0, this[0]).split('\n').length;
	},
	lines: function(){
		const start = this.line();
		const end = this.clone().bounds('endbounds').line();
		return [start, end];
	},
	unindent: function (n, tabsize){
		// remove n tabs or sets of tabsize spaces from the beginning of each line
		tabsize = tabsize || this.data.tabsize;
		return this.bounds('line').text(unindent(this.text(), n, tabsize), {select: 'all', inputType: 'insertReplacementText'});
	},
});

bililiteRange.sendkeys['{ArrowUp}'] = bililiteRange.sendkeys['{uparrow}'] = function (rng){
	const c = rng.char();
	rng.bounds('line', rng.line()-1).bounds('char', c);
};
bililiteRange.sendkeys['{ArrowDown}'] = bililiteRange.sendkeys['{downarrow}'] = function (rng){
	const c = rng.char();
	rng.bounds('line', rng.line()+1).bounds('char', c);
};
bililiteRange.sendkeys['{Home}'] =  function (rng){
	rng.bounds('BOL');
};
bililiteRange.sendkeys['{End}'] =  function (rng){
	rng.bounds('EOL');
};

// utilities

function indent(text, tabs){
	return text.replace(/\n/g, '\n' + tabs);
}
function unindent(str, count, tabsize){
	// count can be an integer >= 0 or Infinity.
	// (We delete up to 'count' tabs at the beginning of each line.)
	// If invalid, defaults to 1.
	//
	// tabsize can be an integer >= 1.
	// (The number of spaces to consider a single tab.)
	tabsize = Math.round(tabsize);
	count = Math.round(count);
	if (!isFinite(tabsize) || tabsize < 1) tabsize = 4;
	if (isNaN(count) || count < 0) count = 1;
	if (!isFinite(count)) count = '';
	const restart = new RegExp(`^(?:\t| {${tabsize}}){1,${count}}`, 'g');
	const remiddle = new RegExp(`(\\n)(?:\t| {${tabsize}}){1,${count}}`, 'g');
	return str.replace(restart, '').replace(remiddle, '$1');
}

})();