multitest("Testing bililiteRange utilities", function (rng, el, text, i, assert){
	if (el.nodeName.toLowerCase() == 'input'){
		// no lines
		text = '2020-07-04';
		var line = 1;
		var endbounds = [text.length, text.length];
		var startbounds = [0, 0];
	}else{
		text = 'one\n007\n\tthree'; // hard wire it here since we are counting lines
		line = 2;
		endbounds = [7,7];
		startbounds = [4,4];
	}
	rng.all(text).bounds('start');
	rng.bounds(/07/);
	assert.equal(rng.line(), line, 'find correct line');
	rng.bounds('EOL');
	assert.deepEqual(rng.bounds(), endbounds, 'bounds (EOL)');
	rng.bounds('find', '07', 'w').bounds('BOL');
	assert.deepEqual(rng.bounds(), startbounds, 'bounds (BOL) (with wrapping search)');
	if (el.nodeName.toLowerCase() == 'input') return; // don't test newlines
	rng.bounds([7,8]).bounds('BOL');
	assert.deepEqual(rng.bounds(), startbounds, 'bounds (BOL) for range that include newline');
	rng.bounds('start').bounds(/07\n/).bounds('EOL');
	assert.deepEqual(rng.bounds(), [14,14], 'bounds (EOL with newline)');
	rng.bounds(text.length-1).bounds('EOL');
	assert.deepEqual(rng[0], text.length, 'bounds (EOL at end with no newline)');
});
multitest("Testing bililiteRange line[s]", function (rng, el, text, i, assert){
	if (el.nodeName.toLowerCase() == 'input') return assert.expect(0); // don't test newlines
	text = 'one\n007\n\tthree'; // hard wire it here since we are counting lines
	rng.all(text).bounds('all');
	assert.equal(rng.line(), 1, 'line returned');
	assert.deepEqual(rng.lines(), [1,3], 'lines returned');	
	rng.bounds([1,3]).bounds('line', 2);
	assert.deepEqual(rng.bounds(), [4,7], 'select line');
	rng.bounds(0).bounds('line', 3);
	assert.deepEqual(rng.bounds(), [8,14], 'select line with no newline');
	assert.equal(rng.bounds('line', 3).text(), '\tthree', 'select whole line');
	rng.bounds(0).bounds('line', 4);
	assert.deepEqual(rng.bounds(), [14,14], 'line after the text is empty');
	rng.bounds('all');
	assert.deepEqual(rng.lines(), [1,3], 'lines returned');
	rng.bounds('line', 2, 3);
	assert.deepEqual(rng.lines(), [2,3], 'lines set');
	assert.equal(rng.text(), '007\n\tthree', 'whole lines set');
});
multitest("Testing bililiteRange live", function (rng, el, text, i, assert, done){
	// this belongs in bililiteRange.qunit.js
	if (i == 3) {
		assert.expect(0);
		done();
		return; // can't change text on date inputs
	}
	assert.expect (2);
	rng.all(text).bounds([7,7]).text('foo', {select: 'all'}).live();
	rng.clone().bounds('start').text('bar'); // insert text before the original range
	async(function(){
		assert.equal(rng.text(), 'foo', 'live range text remains the same');
		var b = rng.bounds();
		rng.live(false);
		rng.clone().bounds('start').text('bar'); // insert text before the original range
		assert.equal(rng.text(), rng.all().substring.apply(rng.all(), b), 'non-live range text changes');			
		done();
	})(); // input events are async, so the live happens after the test
}, true);
multitest("Testing autoindent", function (rng, el, text, i, assert){
	if (el.nodeName.toLowerCase() == 'input'){
		assert.expect(0); // autoindent only applies to elements with newlines
		return;
	}
	text = '\t\tone';
	rng.all(text).bounds('end');
	var insert = '\nnew\n lines\n';
	rng.text(insert, {select: 'all', autoindent: true});
	assert.equal (rng.text(), insert.replace(/\n/g, '\n\t\t'), 'text autoindented');
	rng.all('one\n\ttwo\nthree').bounds(/two/).indent('\t');
	assert.equal(rng.all(), 'one\n\t\ttwo\nthree', 'text indented');
	assert.equal(rng.text(), '\t\ttwo', 'indented text bounds set');
	rng.all('one\n\ttwo\nthree').bounds('all').indent('>');
	assert.equal(rng.all(), '>one\n>\ttwo\n>three', 'text ">" indented');
	rng.all('\tone\n    two\n\t\tthree\nfour').bounds('all').unindent(1,4);
	assert.equal (rng.text(), 'one\ntwo\n\tthree\nfour', 'text unindented');
	rng.all('\tone\n    two\n\t\tthree\nfour').bounds(/two/).unindent(2,4);
	assert.equal (rng.text(), 'two', 'unindented text preserves bounds');
	assert.equal (rng.bounds('line').text(), 'two', 'unindent removes whitespace from beginning of line');
});
multitest ("Testing character placement",  function (rng, el, text, i, assert){
	if (i === 3) return assert.expect(0);
	rng.all('abcdef');
	rng.bounds('char', 3);
	assert.deepEqual(rng.bounds(), [3,3], 'char set on single-line range');
	if (i === 2) return;
	rng.all('abc\ndef\nghij').bounds('line', 2).bounds('char', 2);
	assert.deepEqual(rng.bounds(), [6,6], 'char set on multi-line range');
	assert.equal(rng.char(), 2, 'char returns correct character');
	rng.bounds ([5, 10]);
	assert.equal(rng.char(), 1, 'char returns character of start of range');
	assert.equal(rng.line(), 2, 'line returns line of start of range');
	rng.bounds('line', 2).bounds('char', 2).sendkeys('{ArrowUp}');
	assert.deepEqual(rng.bounds(), [2,2], 'up arrow sendkeys');	
	rng.sendkeys('{ArrowUp}');
	assert.deepEqual(rng.bounds(), [2,2], 'up arrow sendkeys stays unchanged at top');	
	rng.sendkeys('{ArrowRight}').sendkeys('{ArrowDown}');
	assert.deepEqual(rng.bounds(), [7,7], 'right arrow then down arrow sendkeys');	
	rng.sendkeys('{ArrowDown}');
	assert.deepEqual(rng.bounds(), [11,11], 'down arrow sendkeys');	
	rng.sendkeys('{ArrowDown}');
	assert.deepEqual(rng.bounds(), [11,11], 'down arrow sendkeys stays unchanged at bottom');	
});
multitest("Testing sendkeys home/end lines", function (rng, el, text, i, assert){
	if (el.nodeName.toLowerCase() == 'input') return assert.expect(0); // don't test newlines
	rng.all('ab\ncd\nef');
	rng.bounds([4,4]).sendkeys('{Home}');
	assert.ok(rng[0] == 3 && rng[1] == 3, 'sendkeys Home');
	rng.bounds([4,4]).sendkeys('{End}');
	assert.ok(rng[0] == 5 && rng[1] == 5, 'sendkeys End');
});
