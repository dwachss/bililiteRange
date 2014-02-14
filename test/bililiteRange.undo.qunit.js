multitest("Testing bililiteRange undo", function (rng, el, text, i){
	expect(2);
	rng.undo(0); // init
	rng.all(text);
	// undo uses input events, so we have to test asynchronously
	async(function(){
		rng.bounds([5, 7]).text('foo');
		var  newtext = rng.all();
		async(function(){
			rng.undo();
			equal(rng.all(), text, 'undo');
			rng.undo(-1);
			equal(rng.all(), newtext, 'redo');
			QUnit.start();
		})();
	})();
}, true);