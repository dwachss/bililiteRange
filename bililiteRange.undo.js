const { bililiteRange } = require('./bililiteRange.js');

function keyhandler(evt){
	if (!evt.ctrlKey || evt.altKey || evt.shiftKey || evt.metaKey) return;
	if (evt.code == 'KeyZ'){
		bililiteRange(evt.target).undo();
		evt.preventDefault();
	}
	if (evt.code == 'KeyY'){
		bililiteRange(evt.target).redo();
		evt.preventDefault();
	}
}

bililiteRange.extend({
	initUndo (attachKeys = true) {
		this[attachKeys ? 'listen' : 'dontlisten']('keydown', keyhandler);
		if (this.data.undos) return;
		this.data.undos = new History({inputType: 'initial'});
		this.listen('input', evt => {
			if (evt.bililiteRange.unchanged) return;
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
		return this;
	},
	undo(select = true) {
		const undos = this.data.undos;
		if (undos.atStart) return this; // silently do nothing
		const state = undos.state;
		undos.back();
		this.bounds([state.start, state.start+state.newText.length]).text(state.oldText, {inputType: 'historyUndo'});
		this.bounds(state.start+state.oldText.length);
		if (select) this.select();
	return this;
	},
	redo(select = true) {
		const undos = this.data.undos;
		if (undos.atEnd) return this; // silently do nothing
		const state = undos.forward();
		this.bounds([state.start, state.start+state.oldText.length]).text(state.newText, {inputType: 'historyRedo'});
		this.bounds(state.start+state.newText.length);
		if (select) this.select();
		return this;
	}
});

module.exports = bililiteRange;
