multitest("Testing bililiteRange undo", function (rng, el, text, i, assert, done){
	if (i == 3) {
		text = '2020-07-26';
	}
	assert.expect(6);
	rng.all(text);
	rng.initUndo();
	// undo uses input events, so we have to test asynchronously
	async(function(){
		rng.bounds([5, 7]).text(i == 3 ? '11' : 'foo'); // have to keep dates legal
		var  newtext = rng.all();
		async(function(){
			rng.undo();
			assert.equal(rng.all(), text, 'undo');
			rng.undo();
			assert.equal(rng.all(), text, 'undo does nothing at start of history');
			rng.redo();
			assert.equal(rng.all(), newtext, 'redo');
			rng.redo();
			assert.equal(rng.all(), newtext, 'redo does nothing at end of history');
			rng.dispatch({type: 'keydown', ctrlKey: true, code: 'KeyZ'});
			setTimeout( ()=> assert.equal(rng.all(), text, 'control z') ); // have to look for the new text *after* the event is processed
			rng.dispatch({type: 'keydown', ctrlKey: true, code: 'KeyY'});
			setTimeout( ()=> assert.equal(rng.all(), newtext, 'control y') );
			done();
		})();
	})();
}, true);
