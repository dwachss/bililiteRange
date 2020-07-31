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
	assert.deepEqual(rng.bounds(), bounds, 'simple RegExp search');
	assert.equal (rng.match[0], '07', 'match recorded');
	if (i === 3) return; // not too much we can do with NothingRange
	
	rng.all('abc def abc def');
	rng.bounds('start').bounds(/def/).bounds(/abc/);
	assert.deepEqual(rng.bounds(), [8,11], 'forward RegExp search');
	rng.bounds('start').bounds(/def/).bounds(/abc/, 'b');
	assert.deepEqual(rng.bounds(), [0,3], 'backward RegExp search');
	rng.bounds('start').bounds(/DEF/i).bounds('find', 'ABC', 'i');
	assert.deepEqual(rng.bounds(), [8,11], 'ignorecase search');
	rng.bounds('start').bounds([8,11]).bounds(/abc/);
	assert.deepEqual(rng.bounds(), [0,3], 'search wraps');
	rng.bounds('start').bounds([8,11]).bounds(/abc/, 'W');
	assert.deepEqual(rng.bounds(), [8,11], 'no wrap search leaves bounds unchanged');
	assert.equal(rng.match, false, 'match is false on failed search');
	
	rng.all('test [a-z]');
	rng.bounds('start').bounds('find', '[a-z]', 'v');
	assert.equal(rng.text(), 't', 'magic option uses special characters');
	rng.bounds('start').bounds('find', '\\[a-z\\]', 'v');
	assert.equal(rng.text(), '[a-z]', 'magic option does not use escaped special characters');
	rng.bounds('start').bounds('find', '[a-z]', 'V');
	assert.equal(rng.text(), '[a-z]', 'nomagic option does not use special characters');
});
multitest("Testing bililiteRange find restricted/sticky bounds", function (rng, el, text, i, assert){
	if (i === 3) return assert.expect(0);
	rng.all('abc def abc def');
	rng.bounds([4,7]).bounds(/def/);
	assert.deepEqual(rng.bounds(), [12,15], 'search forward');
	rng.bounds([4,7]).bounds(/e/, 'r');
	assert.deepEqual(rng.bounds(), [5,6], 'search forward restricted');
	rng.bounds([8,11]).bounds(/def/);
	assert.deepEqual(rng.bounds(), [12,15], 'search forward (again)');
	rng.bounds([8,11]).bounds(/def/, 'b');
	assert.deepEqual(rng.bounds(), [4,7], 'search backward');
	rng.bounds([4,7]).bounds(/e/, 'ry');
	assert.deepEqual(rng.match, false, 'search forward sticky restricted fails');
	rng.bounds([4,7]).bounds(/d/, 'ry');
	assert.deepEqual(rng.bounds(), [4,5], 'search forward sticky restricted');
	rng.bounds([4,7]).bounds(/ef/, 'bry');
	assert.deepEqual(rng.bounds(), [5,7], 'search backward sticky restricted');
	assert.ok(rng.match, 'search backward sticky restricted succeeds');
	rng.bounds([4,7]).bounds(/ abc/y);
	assert.deepEqual(rng.bounds(), [7,11], 'search sticky forward');
	rng.bounds([4,7]).bounds(/def/y);
	assert.deepEqual(rng.match, false, 'search sticky forward fails');
	rng.bounds('end').bounds(/def/y, 'b');
	assert.deepEqual(rng.bounds(), [12,15], 'search sticky backward from end');
	rng.bounds([4,7]).bounds(/c /y, 'b');
	assert.deepEqual(rng.bounds(), [2,4], 'search sticky backward');
});
multitest("Testing bililiteRange find greedy correctness", function (rng, el, text, i, assert){
	if (i === 3) return assert.expect(0);
	rng.all ('aaaaa').bounds(3).bounds(/a+/);
	assert.equal(rng.text(), 'aa', 'greedy bounds found forwards correctly');
	rng.all ('aaaaaa').bounds(3).bounds(/a+/, 'b');
	assert.equal(rng.text(), 'aaa', 'greedy bounds found backward correctly');
});
multitest("Testing bililiteRange from/to/whole paragraphs", function (rng, el, text, i, assert){
	return assert.expect(0);
	if (i == 2 || i == 3) return assert.expect(0);
	text = '123\n567\n\n012\n\n567';
	rng.all(text);
	rng.bounds('start').bounds('to', 'paragraphs');
	assert.deepEqual(rng.bounds(), [0,7],'to paragraphs');
	rng.bounds('endbounds').bounds('to', 'paragraphs');
	assert.deepEqual(rng.bounds(), [7,7],'at end of paragraph, to paragraphs doesn\'t move');
	rng.bounds('from', 'paragraphs');
	assert.deepEqual(rng.bounds(), [0,7],'from paragraphs');
	rng.bounds(1).bounds('whole', 'paragraphs');
	assert.equal(rng.text(), '123\n567', 'whole paragraph');
	rng.bounds('end').bounds('to', 'paragraphs');
	assert.deepEqual(rng.bounds(), [17,17],'to paragraphs from end');
	rng.bounds('endbounds').bounds('to', 'paragraphs');
	assert.deepEqual(rng.bounds(), [17,17],'from end to end');
	rng.bounds('end').bounds('from', 'paragraphs');
	assert.deepEqual(rng.bounds(), [14,17],'from paragraphs, last paragraph');
	rng.bounds(11).bounds('whole', 'paragraphs');
	assert.equal(rng.text(), '012', 'whole paragraph');
	rng.bounds([2,3]).bounds('whole', /1/);
	assert.equal(rng.text(), '23\n567\n\n0', 'whole with arbitrary separator');
});
multitest("Testing bililiteRange from/to/whole paragraphs with outer", function (rng, el, text, i, assert){
	return assert.expect(0);
	if (i == 2 || i == 3) return assert.expect(0);
	text = '123\n567\n\n012\n\n567';
	rng.all(text);
	rng.bounds('start').bounds('to', 'paragraphs', true);
	assert.deepEqual(rng.bounds(), [0,9],'to paragraphs');
	rng.bounds('endbounds').bounds('to', 'paragraphs', true);
	assert.deepEqual(rng.bounds(), [9,14],'after end of paragraph, to paragraphs');
	rng.bounds('from', 'paragraphs', true);
	assert.deepEqual(rng.bounds(), [7,14],'from paragraphs');
	rng.bounds(1).bounds('whole', 'paragraphs', true);
	assert.equal(rng.text(), '123\n567\n\n', 'whole paragraph');
	rng.bounds(11).bounds('whole', 'paragraphs', true);
	assert.equal(rng.text(), '012\n\n', 'whole paragraph (includes separator after, not before');
	rng.bounds([2,3]).bounds('whole', /1/, true);
	assert.equal(rng.text(), '23\n567\n\n01', 'whole with arbitrary separator');
});
multitest("Testing bililiteRange words and sentences", function (rng, el, text, i, assert){
	return assert.expect(0);
	if (i == 3) return assert.expect(0);
	text = 'Hello, world. This is a   test';
	rng.all(text);
	rng.bounds(1).bounds('whole', 'words');
	assert.equal(rng.text(), 'Hello', 'whole word');
	rng.bounds('whole', 'sentences');
	assert.equal(rng.text(), 'Hello, world', 'whole sentence');
	rng.bounds(/,/);
	rng.bounds('whole', 'words');
	assert.equal (rng.text(), ', ', 'nonwords are selected with word separator');
	rng.bounds(/This/).bounds('whole', 'words');
	assert.equal(rng.text(), 'This', 'whole word remains whole');
	rng.bounds('whole', 'sentences');
	assert.equal(rng.text(), 'This is a   test', 'whole sentence without period');
	text = 'ב◌ּ◌ְר◌ֵאש◌ׁ◌ִית, ב◌ּ◌ָר◌ָא';
	rng.all(text);
	rng.bounds(1).bounds('whole', 'bigwords');
	assert.equal(rng.text(), 'ב◌ּ◌ְר◌ֵאש◌ׁ◌ִית,', 'bigword matches arbitrary unicode');
});
multitest("Testing bililiteRange whole sections", function (rng, el, text, i, assert){
	return assert.expect(0);
	if (i == 2 || i == 3) return assert.expect(0);
	text = '123\n----\n5678\n<hr/>\n012\n\n567';
	rng.all(text);
	rng.bounds('start').bounds('whole', 'sections');
	assert.equal(rng.text(), '123','whole sections --- ');
	rng.bounds('end').bounds('whole', 'sections');
	assert.equal(rng.text(), '012\n\n567','whole sections <hr>');
	rng.bounds('line', 3).bounds('whole', 'sections');
	assert.equal(rng.text(), '5678','whole sections between --- and <HR> (uppercase works)');
});