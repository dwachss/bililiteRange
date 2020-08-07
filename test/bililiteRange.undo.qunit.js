multitest("Testing bililiteRange undo", function (rng, el, text, i, assert){
	if (i == 3) {
		text = '2020-07-26';
	}
	rng.all(text);
	rng.initUndo();
	rng.bounds([5, 7]).text(i == 3 ? '11' : 'foo'); // have to keep dates legal
	var  newtext = rng.all();
	rng.undo();
	assert.equal(rng.all(), text, 'undo');
	rng.undo();
	assert.equal(rng.all(), text, 'undo does nothing at start of history');
	rng.redo();
	assert.equal(rng.all(), newtext, 'redo');
	rng.redo();
	assert.equal(rng.all(), newtext, 'redo does nothing at end of history');
	rng.dispatch({type: 'keydown', ctrlKey: true, code: 'KeyZ'});
	assert.equal(rng.all(), text, 'control z')
	rng.dispatch({type: 'keydown', ctrlKey: true, code: 'KeyY'});
	assert.equal(rng.all(), newtext, 'control y');
});
