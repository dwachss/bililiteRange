multitest("Testing bililiteRange", function (rng, el, text, i, assert){
	rng.all('');
	assert.equal (rng.text(), '' , "element should be empty" );
	rng.text(text, 'all');
	assert.equal (rng.text(), text, 'text set');
	assert.equal (rng.length(), text.length, 'length calculated');
	var b = [1, 10];
	rng.bounds(b);
	assert.deepEqual (rng.bounds(), b, 'bounds set');
	assert.equal (rng.text(), text.substring.apply(text, b), 'bounds correspond to the correct text');
	assert.equal (rng.all(), text, 'all retains correct text');
	rng.select();
	rng.bounds('selection');
	assert.deepEqual (rng.bounds(), b, 'selection recorded');
	rng.element().blur();
	rng.element().focus();
	rng.bounds('selection');
	assert.deepEqual (rng.bounds(), b, 'selection retained');
	if (el.nodeName.toLowerCase() == 'input') return; // insertEOL irrelevant on input elements
	b = [1,1];
	rng.bounds(b).insertEOL();
	assert.equal (rng.length(), text.length+1, 'EOL inserted');
	assert.deepEqual (rng.bounds(), [b[0]+1, b[0]+1], 'EOL moved bounds');
});
multitest("Testing bililiteRange selection", function (rng, el, text, i, assert){
	rng.all(text);
	el.focus();
	assert.equal (rng.bounds('selection').length(), text.length, "initial selection is empty");
});
multitest("Testing bililiteRange scrolling", function (rng, el, text, i, assert){
	rng.all('');
	rng.text(text, 'end'); // range at bottom of text
	el.scrollTop = 0; // scroll to top
	var top = rng.scrollIntoView().top();
	assert.ok (el.scrollTop <= top && el.scrollTop+el.clientHeight >= top, 'scrolled');
});
multitest("Testing bililiteRange event handling", function (rng, el, text, i, assert, done){
	assert.expect(1);
	rng.text(text);
	function listen(evt) { assert.ok(true, evt.type+' event fired') }
	rng.listen('click',listen);
	rng.dontlisten('click', listen);
	rng.listen('click',listen); // should only have one listener active
	rng.listen('click', done);
	rng.dispatch({type: 'click'});
}, true);
multitest("Testing bililiteRange data", function (rng, el, text, i, assert){
	bililiteRange.data('n', {value: 1});
	assert.equal (rng.data().n, 1, 'default data added');
	assert.equal (JSON.stringify(rng.data()), JSON.stringify({}),'default data not stringified');
	assert.ok (rng.data().all.hasOwnProperty('n'),'all data set');
	rng.data().n = 2;
	assert.equal (JSON.stringify(rng.data()), JSON.stringify({n: 2}),'data set and stringified');
	bililiteRange.data('bool', {value: true, enumerable: false});
	assert.equal (rng.data().bool, true, 'private data added');
	rng.data().bool = false;
	assert.equal (rng.data().bool, false, 'private data changed added');
	assert.equal (JSON.stringify(rng.data()), JSON.stringify({n: 2}),'privatized data not enumerated');
});
multitest ('Testing monitored data', function (rng, el, text, i, assert, done){
	assert.expect(4);
	assert.equal(rng.data().sourceRange, rng, 'sourceRange set');
	bililiteRange.data('monitored~value', {monitored: true});
	assert.ok(rng.data().monitored['monitored~value'], 'monitor created');
	rng.listen('bililiteRangeData', function(evt){
		assert.equal (evt.detail.name, 'monitored~value');
		assert.equal (evt.detail.value, 1);
		done();
	});
	rng.data()['monitored~value'] = 1;
}, true);
multitest ('Testing bililiteRange wrap', function (rng, el, text, i, assert){
	try {
		rng.all(text).bounds([1,2]).wrap(document.createElement('em'));
		assert.equal (el.innerHTML, text.slice(0,1)+'<em>'+text.slice(1,2)+'</em>'+text.slice(2), 'wrap');
	}catch(e){
		assert.ok(el.nodeName == 'INPUT' || el.nodeName == 'TEXTAREA', 'wrap throws in text-only elements');
	}
});