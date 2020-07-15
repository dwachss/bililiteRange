multitest("Testing bililiteRange", function (rng, el, text, i, assert){
	rng.all('');
	assert.equal (rng.text(), '' , "element should be empty" );
	rng.text(text, {select: 'all'});
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
});
multitest("Testing bililiteRange blur/focus selection", function (rng, el, text, i, assert){
	if (i == 3) return assert.expect(0); // no selection on NothingRange
	rng.all(text);
	var b = [1, 10];
	rng.bounds(b);
	rng.select();
	document.querySelector('#qunit-header a').focus();
	rng.element().focus();
	rng.bounds('selection');
	assert.deepEqual (rng.bounds(), b, 'selection retained');
});
multitest("Testing bililiteRange bounds array notation", function (rng, el, text, i, assert){
	rng.all(text).bounds('all'); // assumes text.length > 2!
	var oldbounds = rng.bounds();
	var b = [1, 2];
	rng[0] = b[0];
	assert.deepEqual (rng.bounds(), [b[0], oldbounds[1]], 'bounds start set');
	rng[1] = b[1];
	assert.deepEqual (rng.bounds(), b, 'bounds end set');
	assert.ok (rng[0] == b[0] && rng[1] == b[1], 'bounds in array style gettable');
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
	bililiteRange.createOption('n', {value: 1});
	assert.equal (rng.data.n, 1, 'default data added');
	assert.equal (JSON.stringify(rng.data), JSON.stringify({}),'default data not stringified');
	assert.ok (rng.data.all.hasOwnProperty('n'),'all data set');
	rng.data.n = 2;
	assert.equal (JSON.stringify(rng.data), JSON.stringify({n: 2}),'data set and stringified');
	bililiteRange.createOption('bool', {value: true, enumerable: false});
	assert.equal (rng.data.bool, true, 'private data added');
	rng.data.bool = false;
	assert.equal (rng.data.bool, false, 'private data changed added');
	assert.equal (JSON.stringify(rng.data), JSON.stringify({n: 2}),'privatized data not enumerated');
});
multitest ('Testing monitored data', function (rng, el, text, i, assert, done){
	assert.expect(3);
	assert.equal(rng.data.sourceElement, rng.element(), 'sourceElement set');
	bililiteRange.createOption('monitoredValue', {monitored: true});
	rng.listen('data-monitoredValue', function(evt){
		assert.equal (evt.detail, 1, 'monitor event triggered');
		done();
	});
	rng.data.monitoredValue = 1;
	assert.equal (rng.element().getAttribute('data-monitoredValue'), '1', 'monitor attribute set');
}, true);
multitest ('Testing bililiteRange wrap', function (rng, el, text, i, assert){
	try {
		rng.all(text).bounds([1,2]).wrap(document.createElement('em'));
		assert.equal (el.innerHTML, text.slice(0,1)+'<em>'+text.slice(1,2)+'</em>'+text.slice(2), 'wrap');
	}catch(e){
		assert.ok(el.nodeName == 'INPUT' || el.nodeName == 'TEXTAREA', 'wrap throws in text-only elements');
	}
});