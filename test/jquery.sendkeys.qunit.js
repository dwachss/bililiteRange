multitest("Testing bililiteRange.sendkeys", function (rng, el, text, i, assert){
	if (i == 3) return assert.expect(0); // can't set individual characters on date inputs
	rng.all(text);
	rng.bounds([1,1]).sendkeys('12{backspace}3{leftarrow}4{rightarrow}56{leftarrow}{del}');
	assert.equal(rng.all(), text.replace(/^./, '$&1435'), 'sendkeys bililiteRange');
});
multitest("Testing bililiteRange.sendkeys tab, newline", function (rng, el, text, i, assert){
	if (i == 3) return assert.expect(0); // can't set individual characters on date inputs
	rng.all(text);
	rng.bounds([1,1]).sendkeys('{tab}{newline}');
	if (el.nodeName == 'INPUT'){
		assert.equal(rng.all(), text.replace(/^./, '$&\t'), 'sendkeys tab/newline');
	}else{
		assert.equal(rng.all(), text.replace(/^./, '$&\t\n'), 'sendkeys tab/newline');
	}
});

multitest("Testing sendkeys mark/selection", function (rng, el, text, i, assert){
	if (i == 3) return assert.expect(0); // can't set individual characters on date inputs
	rng.all('abc');
	rng.bounds([1,2]).sendkeys('<a href="{mark}">x{selection}</a>');
	rng.sendkeys('url');
	assert.equal(rng.all(), 'a<a href="url">xb</a>c', 'sendkeys mark/selection');
});
multitest("Testing jquery.sendkeys", function (rng, el, text, i, assert){
	if (i == 3) return assert.expect(0); // can't set individual characters on date inputs
	rng.all(text);
	rng.bounds([1,1]).select();
	if (el.nodeName.toLowerCase() == 'input'){
		$(el).sendkeys('12{backspace}3{leftarrow}4{rightarrow}56{leftarrow}{del}');
		assert.equal(rng.all(), text.replace(/^./, '$&1435'), 'sendkeys jquery');
	}else{
		$(el).sendkeys('12{backspace}3{leftarrow}\n4{rightarrow}56{leftarrow}{del}');
		assert.equal(rng.all(), text.replace(/^./, '$&1\n435'), 'sendkeys jquery');
	}
});