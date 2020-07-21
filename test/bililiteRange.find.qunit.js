multitest("Testing bililiteRange find", function (rng, el, text, i, assert){
	if (el.nodeName.toLowerCase() == 'input'){
		// no lines
		text = '2020-07-04';
		var bounds = [5,7];
	}else{
		text = 'one\n007\n\tthree';
		bounds = [5,7];
	}
	rng.all(text).bounds(/07/);
	assert.deepEqual(rng.bounds(), bounds, 'sinple RegExp search');
	assert.equal (rng.match[0], '07', 'match recorded');
	if (i === 3) return; // not too much we can do with NothingRange
	
	rng.all('abc def abc def');
	rng.bounds('start').bounds(/def/).bounds(/abc/);
	assert.deepEqual(rng.bounds(), [8,11], 'forward RegExp search');
	rng.bounds('start').bounds(/def/).bounds(rng.re(/abc/, 'b'));
	assert.deepEqual(rng.bounds(), [0,3], 'backward RegExp search');
	rng.bounds('start').bounds(/DEF/i).bounds(rng.re('ABC', 'i'));
	assert.deepEqual(rng.bounds(), [8,11], 'ignorecase search');
	rng.bounds('start').bounds([8,11]).bounds(rng.re(/abc/));
	assert.deepEqual(rng.bounds(), [0,3], 'search wraps');
	rng.bounds('start').bounds([8,11]).bounds(rng.re(/abc/, 'W'));
	assert.deepEqual(rng.bounds(), [8,11], 'no wrap search leaves bounds unchanged');
	assert.equal(rng.match, false, 'match is false on failed search');
});
multitest("Testing bililiteRange replace", function (rng, el, text, i, assert){
	if (i === 3) return assert.expect(0); // not too much we can do with NothingRange
	text = '01234567890123456789';
	rng.all(text);
	rng.bounds('all').replace(/0/g, '$&!');
	assert.equal(rng.all(), text.replace(/0/g, '$&!'), 'replace with global RegExp, string replacement');
	assert.equal(rng.all(), '0!1234567890!123456789', 'replace with global RegExp, string replacement');
	rng.all(text);
	rng.bounds('all').replace(/0(1)/, '$&$0!');
	assert.equal(rng.all(), text.replace(/0(1)/, '$&$0!'), 'replace with nonglobal RegExp, string replacement');
	rng.all(text);
	rng.bounds('all').replace('01', 'aa');
	assert.equal(rng.all(), text.replace('01', 'aa'), 'replace with string, string replacement');
	assert.equal(rng.all(), 'aa234567890123456789', 'replace with string, string replacement');
	rng.all(text);
	rng.bounds([9,15]).replace('01', 'aa');
	assert.equal(rng.all(), '0123456789aa23456789', 'replace with string, string replacement, limited bounds');
	rng.all(text);
	rng.bounds([9,15]).replace(/\d/g, match => match * 2);
	assert.equal(rng.all(), '012345678180246856789', 'replace with global RegExp, function replacement, limited bounds');
	rng.all(text);
	rng.bounds([9,15]).replace(rng.re('\\d'), match => match * 2);
	assert.equal(rng.all(), '012345678180246856789', 'replace with bililiteRange.RegExp, function replacement, limited bounds');
});
