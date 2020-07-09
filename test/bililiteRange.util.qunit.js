multitest("Testing bililiteRange utilities", function (rng, el, text, i, assert){
	if (el.nodeName.toLowerCase() == 'input'){
		// no lines
		text = 'onetwo\tthree';
		var line = 1;
		var bounds = [text.length, text.length];
	}else{
		text = 'one\ntwo\n\tthree'; // hard wire it here since we are counting lines
		line = 2;
		bounds = [7,7];
	}
	rng.all(text).bounds('start');
	rng.find(/two/);
	assert.equal(rng.line(), line, 'find correct line');
	rng.bounds('EOL');
	assert.deepEqual(rng.bounds(), bounds, 'bounds (EOL)');
});
multitest("Testing bililiteRange live", function (rng, el, text, i,assert, done){
	assert.expect (2);
	rng.all(text).bounds([7,7]).text('foo', 'all').live();
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
	rng.text(insert, 'all', null, true);
	assert.equal (rng.text(), insert.replace(/\n/g, '\n\t\t'), 'text autoindented');
	rng.all('one\n\ttwo\nthree').find(/two/).indent('\t');
	assert.equal(rng.all(), 'one\n\t\ttwo\nthree', 'text indented');
	assert.equal(rng.text(), 'two', 'indented text bounds set');
	rng.all('\tone\n    two\n\t\tthree\nfour').bounds('all').unindent(1,4);
	assert.equal (rng.text(), 'one\ntwo\n\tthree\nfour', 'text unindented');
	rng.all('\tone\n    two\n\t\tthree\nfour').find(/two/).unindent(2,4);
	assert.equal (rng.text(), 'two', 'unindented text preserves bounds');
	assert.equal (rng.bounds('line').text(), 'two', 'unindent removes whitespace from beginning of line');
});