(function(){

bililiteRange.bounds.EOL = function(){
	// set the range to the end of this line
	// if we start at the end of a line, find will go to the next line! Check for that case first
	this.bounds('startbounds');
	if (this.findprimitive (/$/mg, this.bounds())) return this.bounds();
	return this.find(/$/m, true).bounds(); // don't wrap
};
bililiteRange.bounds.BOL = function(){
	// set the range to the beginning of this line
	// if we start at the beginning of a line, findBack will go to the previous line! Check for that case first
	this.bounds('startbounds');
	if (this.findprimitive (/^/mg, this.bounds())) return this.bounds();
	return this.findBack(/^/m, true).bounds(); // don't wrap
};
bililiteRange.bounds.line = function(){
	this.bounds('BOL');
	var start = this[0];
	this.bounds('EOL');
	return [start, this[1]];
};
bililiteRange.bounds.startbounds = function(){
	return [this[0], this[0]];
};
bililiteRange.bounds.endbounds = function(){
	return [this[1], this[1]];
};

// add autoindent option
bililiteRange.override ('text', function (text, opts = {}){
	if ( text === undefined ) return this.super();
	if (opts.autoindent) text = indent(text, this.indentation());
	return this.super(text, opts);
});

bililiteRange.extend({
	
	indentation: function(){
		// returns the whitespace at the start of this line
		return /^\s*/.exec(this.clone().bounds('line').text())[0];
	},
	
	indent: function (tabs){
		// tabs is the string to insert before each line of the range
		var oldtext = this.text(), newtext = indent(oldtext, tabs), b = this.bounds();
		this.text(newtext);
		// Need to indent the line containing the start of the range (indent only adds the tabs after newlines)
		this.clone().bounds('BOL').text(tabs);
		// Adjust bounds
		return this.bounds([b[0]+tabs.length, b[1]+tabs.length+newtext.length-oldtext.length]);
	},
	
	unindent: function (n, tabSize){
		// remove n tabs or sets of tabSize spaces from the beginning of each line
		tabSize = tabSize || this.data().tabSize || 8; // 8 is the browser default
		// remove internal tabs
		var oldtext = this.text(), newtext = unindent(oldtext, n, tabSize, false), b = this.bounds();
		var diffInternal = newtext.length-oldtext.length;
		this.text(newtext).bounds([b[0], b[1]+diffInternal]);
		// remove initial tabs
		var line = this.clone().bounds('line');
		oldtext = line.text();
		newtext = unindent(oldtext, n, tabSize, true);
		line.text(newtext);
		var diffStart = newtext.length-oldtext.length;
		return this.bounds([Math.max(line.bounds()[0], b[0]+diffStart), b[1]+diffInternal+diffStart]);
	},
			
	line:function(n){
		// set the bounds to the nth line or
		// return the line number of the start of the bounds. Note that it is 1-indexed, the way ex writes it!
		if (arguments.length){
			n =  parseInt(n);
			if (isNaN(n)) return this;
			// if n is too large,set the bounds to the end; if too small, to the beginning
			if (n > this.all().split('\n').length) return this.bounds('end');
			if (n < 1) return this.bounds([0,0]);
			// move to the given line number, at same character number as the initial bounds.
			var start = this.bounds();
			this.bounds('BOL');
			var c = start[0] - this[0]; // character number
			// so find n-1 newlines to get to the correct line, then c characters over (if we don't have that many, go to the end of the line)
			var re = new RegExp('(.*\\n){'+(n-1)+'}(.{'+c+'}|.*$)', 'm');
			return this.bounds('all').find(re).bounds('endbounds');
		}else{
			// just count newlines before this.bounds
			// If we are on the boundary between lines (i.e. after the newline), this counts the next line
			return this.all().slice(0, this[0]).split('\n').length;
		}
	},
		
});

// utilities

function indent(text, tabs){
	return text.replace(/\n/g, '\n'+tabs);
}
function unindent(str, count, tabwidth, start){
	// count can be an integer >= 0 or Infinity.
	// (We delete up to 'count' tabs at the beginning of each line.)
	// If invalid, defaults to 1.
	//
	// tabwidth can be an integer >= 1.
	// (The number of spaces to consider a single tab.)
	// If invalid, defaults to 4.
	//
	// Either can also be a string or number that rounds to that.
	//
	// start=true: unindent only the first line of the string.
	// start=false: unindent any line in the string except the first.
	tabwidth = Math.round(tabwidth);
	count = Math.round(count);
	if (!isFinite(tabwidth) || tabwidth < 1) tabwidth = 4;
	if (isNaN(count) || count < 0) count = 1;
	if (!isFinite(count)) count = '';
	var re = new RegExp((start ? '(^)' : '(\\n)') + `(?:\t| {${tabwidth}}){1,${count}}`, 'g');
	return str.replace(re, '$1');
}

})();