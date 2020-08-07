multitest("Testing bililiteRange", function (rng, el, text, i, assert){
	rng.all('');
	assert.equal (rng.text(), '' , "element should be empty" );
	rng.text(text);
	assert.equal (rng.text(), text, 'text set');
	assert.equal (rng.length, text.length, 'length calculated');
	assert.equal (rng.all(), text, 'all retains correct text');
	rng.bounds([1,3]).text('123'); // replace 2 characters with three
	assert.deepEqual(rng.bounds(), [1,4], 'text changes bounds');
});
multitest ("Testing bililiteRange bounds", function (rng, el, text, i, assert){
	rng.text(text);
	var b = [1, 10];
	assert.deepEqual (rng.bounds(b).bounds(), b, 'bounds set');
	assert.equal (rng.text(), text.substring(...b), 'bounds correspond to the correct text');
	rng.select();
	rng.bounds([0,0]); // changing bounds should not change selection
	rng.bounds('selection');
	assert.deepEqual (rng.bounds(), b, 'selection recorded');
	const rng2 = rng.clone();
	assert.deepEqual (rng2.bounds(), b, 'clone bounds set');
	assert.equal (rng.element, rng2.element, 'clone element set');
	assert.deepEqual (rng.bounds('all').bounds(), [0, rng.length], 'bounds "all"');
	assert.deepEqual (rng2.bounds(), b, 'clone bounds not changed');
	rng.bounds(rng2);
	assert.deepEqual (rng2.bounds(), rng.bounds(), 'bounds copied');
	assert.deepEqual (rng.bounds('start').bounds(), [0,0], 'bounds "start"');
	assert.deepEqual (rng.bounds('end').bounds(), [rng.length,rng.length], 'bounds "end"');
	rng.bounds(b);
	assert.deepEqual (rng.bounds('startbounds').bounds(), [b[0],b[0]], 'bounds "startbounds"');
	rng.bounds(b);
	assert.deepEqual (rng.bounds('endbounds').bounds(), [b[1],b[1]], 'bounds "endbounds"');
	rng.bounds([2,4]).bounds('union', [5,6]);
	assert.deepEqual (rng.bounds(), [2,6], 'bounds "union"');
	rng.bounds([2,5]).bounds('intersection', [4,6]);
	assert.deepEqual (rng.bounds(), [4,5], 'bounds "intersection"');
	rng.bounds([2,4]).bounds('intersection', [5,6]);
	assert.deepEqual (rng.text().length, 0, 'bounds "null intersection has length 0"');
	rng.bounds(b).bounds('union', 'union', 'start'); // One would never do this but it's legal; make sure the syntax works
	assert.deepEqual (rng.bounds(), [0,b[1]], 'recursive "union"');
});
multitest("Testing bililiteRange blur/focus selection", function (rng, el, text, i, assert){
	if (i == 3) return assert.expect(0); // no selection on NothingRange
	rng.all(text);
	var b = [1, 10];
	rng.bounds(b);
	rng.select();
	document.querySelector('#qunit-header a').focus();
	rng.element.focus();
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
	assert.equal (rng.bounds('selection').length, text.length, "initial selection is empty");
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
	assert.equal(rng.data.sourceElement, rng.element, 'sourceElement set');
	bililiteRange.createOption('monitoredValue', {monitored: true});
	rng.listen('data-monitoredValue', function(evt){
		assert.equal (evt.detail, 1, 'monitor event triggered');
		done();
	});
	rng.data.monitoredValue = 1;
	assert.equal (rng.element.getAttribute('data-monitoredValue'), '1', 'monitor attribute set');
}, true);
multitest ('Testing bililiteRange wrap', function (rng, el, text, i, assert){
	try {
		rng.all(text).bounds([1,2]).wrap(document.createElement('em'));
		assert.equal (el.innerHTML, text.slice(0,1)+'<em>'+text.slice(1,2)+'</em>'+text.slice(2), 'wrap');
	}catch(e){
		assert.ok(el.nodeName == 'INPUT' || el.nodeName == 'TEXTAREA', 'wrap throws in text-only elements');
	}
});
multitest ('Testing bililiteRange bounds custom functions', function (rng, el, text, i, assert){
	bililiteRange.bounds.firstchar = () => [0,1];
	rng.all(text).bounds('firstchar');
	assert.ok(rng[0] == 0 && rng[1] == 1, 'custom bounds set');
	assert.equal(rng.text(), text[0], 'custom bounds have correct text');
	if (i == 3) return; // can't selectively change text in NothingRange
	bililiteRange.bounds.andmore = function (name,...rest){
		const s = rest.join('');
		this.clone().bounds('endbounds').text(s);
		return [this[0], this[1]+s.length];
	};
	rng.all(text).bounds('start').bounds('andmore', 'foo', 'bar', 'baz');
	assert.ok(rng[0] == 0 && rng[1] == 'foobarbaz'.length, 'custom bounds set');
	assert.equal(rng.all(), 'foobarbaz'+text, 'custom bounds have correct text');	
});
multitest ('Testing bililiteRange bounds examples', function (range, el, text, i, assert){
	if (i == 3) return assert.expect(0); // can't select in NothingRange
	bililiteRange.bounds.firstchar = () => [0,1];
	assert.equal(range.all('ABCDE').bounds('firstchar').text(),'A', 'first example');
	bililiteRange.bounds.nthchar = (name, n) => [+n, n+1];
	assert.equal(range.all('ABCDE').bounds('nthchar', 2).text(), 'C', 'second example');
	bililiteRange.bounds.wrap = function (name, before, after) {
		return this.text(before + this.text() + after).bounds();
	}
	assert.equal(range.all('ABCDE').bounds('firstchar').bounds('wrap', 'foo', 'bar').text(), 'fooAbar', 'third example');
	bililiteRange.bounds.endofline = function () {
		if (this.text()[this.length-1] == '\n') return [this[1], this[1]]; // range ends with a newline
		const nextnewline = this.all().indexOf('\n', this[1]);
		if (nextnewline != -1) return [nextnewline + 1, nextnewline +1];
		return this.bounds('end').bounds(); // no newline
	}
	if (i == 2) return; // no newlines in <input>
	assert.equal(range.all('Hello\nWorld').bounds('start').bounds('endofline').text('Wonderful ').all(), 'Hello\nWonderful World', 'fourth example');
});