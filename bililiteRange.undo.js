(function(){

bililiteRange.extend({
	initUndo (attachKeys = true) {
		if (this.data.undos) return;
		this.data.undos = new History({inputType: 'initial'});
		setTimeout( ()=> { // put this on the event queue, so any pre-existing events are processed first
			this.listen('input', evt => {
				if (evt.inputType == 'historyUndo' || evt.inputType == 'historyRedo') return;
				if (evt.inputType == 'insertText' && evt.bililiteRange.oldText == '' && evt.bililiteRange.newText.length == 1){
					// single characters typed should accumulate in the last undo state, so they are all undone at once
					const laststate = this.data.undos.state;
					if (laststate.inputType == 'insertText' && laststate.start + laststate.newText.length == evt.bililiteRange.start){
						// the last insert ended where the new one began
						laststate.newText += evt.bililiteRange.newText;
						return;
					}
				}
				this.data.undos.pushState(Object.assign({inputType: evt.inputType}, evt.bililiteRange));
			});
			if (attachKeys){
				this.listen('keydown', evt => {
					if (!evt.ctrlKey) return;
					if (evt.code == 'KeyZ'){
						this.undo();
						evt.preventDefault();
					}
					if (evt.code == 'KeyY'){
						this.redo();
						evt.preventDefault();
					}
				});
			}
		});
		return this;
	},
	undo(select = true) {
		const undos = this.data.undos;
		if (undos.atStart) return; // silently do nothing
		const state = undos.state;
		undos.back();
		this.bounds([state.start, state.start+state.newText.length]).text(state.oldText, {select: 'end', inputType: 'historyUndo'});
		if (select) this.select();
		return this;
	},
	redo(select = true) {
		const undos = this.data.undos;
		if (undos.atEnd) return; // silently do nothing
		const state = undos.forward();
		this.bounds([state.start, state.start+state.oldText.length]).text(state.newText, {select: 'end', inputType: 'historyRedo'});
		if (select) this.select();
		return this;
	}
});


//TODO: this!

function setuplisteners (rng){
	var _callback = function(){
		var state = getundostate(rng), el = rng.element, lastevent = state.lastevent;
		delete state.lastevent;
		switch (lastevent){
			//  catch input events that we should not save  (resulting from undo, redo and keypress events that are contiguous)
			case 'undo': case 'redo':
				return; // don't record the current input
			case 'keypress':
				// if the last event was also a keypress, drop that one (so we would undo back to the beginning of the typing)
				if (state.penultimateevent == 'keypress') rng.data.undos = state.undo;
		}
		(new undostate(rng)).penultimateevent = lastevent; // record so we can check for keypress sequences
	};
	
	rng.listen('input', _callback) /* `input` event is for IE >= 10 */
		.listen('textinput', _callback) /* `textinput` event is for IE 9 */
		.listen('keypress', function(evt){
		// key presses replace each other, which means that undo will undo all of them, unless the previous event was not a keypress (meaning we are starting a
		// new series of typing) or we type a carriage return, which starts a new series of typing, or the new keypress is in a different place than the old one
		if (evt.which < 32) return; // nonprinting characters; Firefox tends to send them all. We want them all undone individually
		if (evt.altKey || evt.altGraphKey || evt.ctrlKey || evt.metaKey) return;
		var bounds = rng.bounds('selection').bounds();
		if (bounds[0] != bounds[1]) return; // about to erase a selection; start a new undo sequence
		var state = getundostate(rng);
		// only mark this if the previous event was in the same place
		if (state.bounds[0] != bounds[0]) return;
		state.lastevent = 'keypress';
	});	
}

// for use as an event handler
bililiteRange.undo = function (event){
	bililiteRange(event.target).undo();
	event.preventDefault();
}
bililiteRange.redo = function (event){
	bililiteRange(event.target).undo(-1);
	event.preventDefault();
}

// for debugging
function getstack(state, dir){
	dir = dir || 'undo';
	for (var ret = []; ret.push(state), state[dir] != state; state = state[dir]);
	return ret;
}

})();
