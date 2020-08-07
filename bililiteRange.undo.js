(function(){

bililiteRange.extend({
	initUndo (attachKeys = true) {
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
		if (attachKeys){
			this.listen('keydown', evt => {
				if (!evt.ctrlKey || evt.altKey || evt.shiftKey || evt.metaKey) return;
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
		return this;
	},
	undo(select = true) {
		const undos = this.data.undos;
		if (undos.atStart) return this; // silently do nothing
		const state = undos.state;
		undos.back();
		this.bounds([state.start, state.start+state.newText.length]).text(state.oldText, {select: 'end', inputType: 'historyUndo'});
		if (select) this.select();
		return this;
	},
	redo(select = true) {
		const undos = this.data.undos;
		if (undos.atEnd) return this; // silently do nothing
		const state = undos.forward();
		this.bounds([state.start, state.start+state.oldText.length]).text(state.newText, {select: 'end', inputType: 'historyRedo'});
		if (select) this.select();
		return this;
	}
});

})();
