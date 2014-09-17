multitest("Testing bililiteRange selection", function (rng, el, text, i){
	rng.all(text);
	el.focus();
	equal (rng.bounds('selection').length(), text.length, "initial selection is empty");
});
multitest("Testing bililiteRange", function (rng, el, text, i){
	rng.all('');
	equal (rng.text(), '' , "element should be empty" );
	rng.text(text, 'all');
	equal (rng.text(), text, 'text set');
	equal (rng.length(), text.length, 'length calculated');
	var b = [1, 10];
	rng.bounds(b);
	deepEqual (rng.bounds(), b, 'bounds set');
	equal (rng.text(), text.substring.apply(text, b), 'bounds correspond to the correct text');
	equal (rng.all(), text, 'all retains correct text');
	rng.select();
	rng.bounds('selection');
	deepEqual (rng.bounds(), b, 'selection recorded');
	rng.element().blur();
	rng.element().focus();
	rng.bounds('selection');
	deepEqual (rng.bounds(), b, 'selection retained');
	if (el.nodeName.toLowerCase() == 'input') return; // insertEOL irrelevant on input elements
	b = [1,1];
	rng.bounds(b).insertEOL();
	equal (rng.length(), text.length+1, 'EOL inserted');
	deepEqual (rng.bounds(), [b[0]+1, b[0]+1], 'EOL moved bounds');
});
multitest("Testing bililiteRange scrolling", function (rng, el, text, i){
	rng.all('');
	rng.text(text, 'end'); // range at bottom of text
	el.scrollTop = 0; // scroll to top
	var top = rng.scrollIntoView().top();
	ok (el.scrollTop <= top && el.scrollTop+el.clientHeight >= top, 'scrolled');
});
multitest("Testing bililiteRange event handling", function (rng, el, text, i){
	expect(1);
	rng.text(text);
	function listen(evt) { ok(true, evt.type+' event fired') }
	rng.listen('click',listen);
	rng.dontlisten('click', listen);
	rng.listen('click',listen); // should only have one listener active
	rng.listen('click', start);
	rng.dispatch({type: 'click'});
}, true);
multitest("Testing bililiteRange data", function (rng, el, text, i){
	bililiteRange.data('n', {value: 1});
	equal (rng.data().n, 1, 'default data added');
	equal (JSON.stringify(rng.data()), JSON.stringify({}),'default data not stringified');
	ok (rng.data().all.hasOwnProperty('n'),'all data set');
	rng.data().n = 2;
	equal (JSON.stringify(rng.data()), JSON.stringify({n: 2}),'data set and stringified');
	bililiteRange.data('bool', {value: true, enumerable: false});
	equal (rng.data().bool, true, 'private data added');
	rng.data().bool = false;
	equal (rng.data().bool, false, 'private data changed added');
	equal (JSON.stringify(rng.data()), JSON.stringify({n: 2}),'privatized data not enumerated');
});
multitest ('Testing monitored data', function (rng, el, text, i){
	expect(4);
	equal(rng.data().sourceRange, rng, 'sourceRange set');
	bililiteRange.data('monitored~value', {monitored: true});
	ok(rng.data().monitored['monitored~value'], 'monitor created');
	rng.listen('bililiteRangeData', function(evt){
		equal (evt.detail.name, 'monitored~value');
		equal (evt.detail.value, 1);
		start();
	});
	rng.data()['monitored~value'] = 1;
}, true);
multitest ('Testing bililiteRange wrap', function (rng, el, text, i){
	try {
		rng.all(text).bounds([1,2]).wrap(document.createElement('em'));
		equal (el.innerHTML, text.slice(0,1)+'<em>'+text.slice(1,2)+'</em>'+text.slice(2), 'wrap');
	}catch(e){
		ok(el.nodeName == 'INPUT' || el.nodeName == 'TEXTAREA', 'wrap throws in text-only elements');
	}
});