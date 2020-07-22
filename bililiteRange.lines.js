(function(){
// a line goes from after the newline to after a newline. The newline is included in that line!
bililiteRange.bounds.EOL = function () {
	if (this.text()[this.text().length-1] == '\n') return [this[1], this[1]]; // range ends with a newline
	const nextnewline = this.all().indexOf('\n', this[1]);
	if (nextnewline != -1) return nextnewline + 1;
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
		return this.bounds('union', 'BOL').bounds('union', 'EOL').bounds();
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

// add autoindent option
bililiteRange.createOption ('autoindent', {value: false});
bililiteRange.override ('text', function (text, opts = {}){
	if ( text === undefined ) return this.super();
	// use the data option only if doing ordinary text.
	if (opts.autoindent || (opts.autoindent == null && opts.inputType == 'insertLineBreak')){
		text = indent(text, this.indentation());
	}
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

	line:function(n){
		// set the bounds to the nth line or
		// return the line number of the *start* of the bounds. Note that it is 1-indexed, the way ex writes it!
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
			return this.bounds('all').bounds(re).bounds('endbounds');
		}else{
			// just count newlines before this.bounds
			// If we are on the boundary between lines (i.e. after the newline), this counts the next line
			return this.all().slice(0, this[0]).split('\n').length;
		}
	},

	lines: function(i, j){
		if (arguments.length){
			// selects the entire lines between i and j. 
			if (i === undefined) i = j;
			if (j === undefined) j = i;
			if (i > j) [j,i] =[i,j]; // destructuring assignment for the win!
			if (j <= 0) return this.bounds('start');
			var totallines = this.all().split('\n').length;
			if (i > totallines) return this.bounds('end');
			var start = this.line(i).bounds('BOL')[0];
			var end = this.line(j).bounds('EOL')[1];
			return this.bounds([start, end]);
		}else{
			const start = this.line();
			const end = this.clone().bounds('endbounds').line();
			return [start, end];
		}
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

});

// utilities

function indent(text, tabs){
	return text.replace(/\n/g, '\n' + tabs);
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