// editor.js 2023-03-05

// dwachss/historystack/history.js commit 806bac52
// Implements the History interface for use with things other than browser history. I don't know why they won't let us use 
'use strict';

function History (inititalstate){
	this._length = 1;
	this._index = 1;
	this._states = [undefined, inititalstate]; // easiest on the math to use 1-index array
}

History.prototype = {
	back() { return this.go(-1) },
	forward() {return this.go(1) },
	go(n) {
		this._index += n;
		if (this._index < 1 ) this._index = 1;
		if (this._index > this._length ) this._index = this._length;
		return this.state;
	},
	pushState(state) {
		this._length = ++this._index;
		return this.replaceState(state);
	},
	replaceState (state) { return this._states[this._index] = state },
	get length() { return this._length },
	get state() { return this._states[this._index] },
	// not part of the interface but useful nonetheless
	get atStart() { return this._index == 1 },
	get atEnd() { return this._index == this._length }
}



// dwachss/keymap/keymap.js commit 383f82cc
// allows mapping specific key sequences to actions

'use strict';

(()=>{
const canonicalSpellings = 'ArrowDown ArrowLeft ArrowRight ArrowUp Backspace CapsLock Delete End Enter Escape Home Insert NumLock PageDown PageUp Pause ScrollLock Space Tab'.split(' ');
const lowercaseSpellings = canonicalSpellings.map(s => new RegExp(`\\b${s}\\b`, 'gi'));
// Microsoft SendKeys notation, https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/sendkeys-statement
// 'Return' is from VIM, https://vimhelp.org/intro.txt.html#%3CReturn%3E
const alternateSpellings = 'Down Left Right Up BS CapsLock Del End Return Esc Home Ins NumLock PGDN PGUP Break ScrollLock Spacebar Tab'.split(' ').map(s => new RegExp(`\\b${s}\\b`, 'gi'));
// modifier keys. VIM uses '-', jquery.hotkeys uses '+', https://github.com/jresig/jquery.hotkeys
// Not using meta-
const modifiers = [[/s(hift)?[+-]/gi, '+'], [/c(trl)?[+-]/gi, '^'], [/a(lt)?[+-]/gi, '%']];

function normalize (keyDescriptor){
	keyDescriptor = keyDescriptor.trim().replaceAll(/ +/g, ' '); // collapse multiple spaces
	lowercaseSpellings.forEach( (re, i) => { keyDescriptor = keyDescriptor.replaceAll(re, canonicalSpellings[i]) } );
	alternateSpellings.forEach( (re, i) => { keyDescriptor = keyDescriptor.replaceAll(re, canonicalSpellings[i]) } );
	// VIM key descriptors are enclosed in angle brackets; sendkeys are enclosed in braces
	keyDescriptor = keyDescriptor.replaceAll(/(?<= |^)<([^>]+)>(?= |$)/g, '$1');
	keyDescriptor = keyDescriptor.replaceAll(/{([^}]+|})}/g, '$1');
	// uppercase function keys
	keyDescriptor = keyDescriptor.replaceAll(/f(\d+)/g, 'F$1');
	// it's easiest to turn modifiers into single keys, then reorder them and rename them
	modifiers.forEach( pair => { keyDescriptor = keyDescriptor.replaceAll(...pair) } );
	// normalize the order of ctrl-alt-shift
	keyDescriptor = keyDescriptor.replaceAll(
		/[+^%]+(?! |$)/g, // don't match a final [+^%], since that will be an actual character
		match => (/\^/.test(match) ? 'ctrl-' : '') + (/%/.test(match) ? 'alt-' : '') + (/\+/.test(match) ? 'shift-' : '')
	)
	keyDescriptor = keyDescriptor.replaceAll(/shift-([a-zA-Z])\b/g, (match, letter) => letter.toUpperCase() );
	return keyDescriptor;
}

// generates successive prefixes of lists of keyDescriptors
// turns 'alt-f x Enter' into [/^alt-f$/, /^alt-f x$/, /^alt-f x Enter$/]
// and /alt-x f\d+ (Enter|Escape)/i into [/^alt-x$/i, /^alt-x f\d+$/i, /^alt-x f\d+ (Enter|Escape)$/i]
function prefixREs(strOrRE){
	let sources, ignoreCase;
	if (!strOrRE.source){
		// escape RegExp from https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
		sources = strOrRE.toString().trim().split(/\s+/).
			map(normalize).
			map(s => s.replaceAll(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&"));
		ignoreCase = '';
	}else{
		sources = strOrRE.source.trim().split(/\s+/);
		ignoreCase = strOrRE.ignoreCase ? 'i' : '';
	}
	return sources.reduce ( (accumulator, currentValue, i) => {
		if (i == 0) return [RegExp(`^${currentValue}$`, ignoreCase)]; // ^...$ to match the entire key
		const source = accumulator[i-1].source.replaceAll(/^\^|\$$/g,''); // strip off the previous ^...$
		accumulator.push( new RegExp( `^${source} ${currentValue}$`, ignoreCase ) );
		return accumulator;
	}, []);
};

// ANSI keyboard codes
const specialKeys = {
	'Backquote': '`',
	'shift-Backquote': '~',
	'shift-1': '!',
	'shift-2': '@',
	'shift-3': '#',
	'shift-4': '$',
	'shift-5': '%',
	'shift-6': '^',
	'shift-7': '&',
	'shift-8': '*',
	'shift-9': '(',
	'shift-0': ')',
	'Minus': '-',
	'shift-Minus': '_',
	'Equal': '=',
	'shift-Equal': '+',
	'BracketRight': '[',
	'shift-BracketRight': '{',
	'BracketLeft': ']',
	'shift-BracketLeft': '}',
	'Backslash': '\\',
	'shift-Backslash': '|',
	'Semicolon': ';',
	'shift-Semicolon': ':',
	'Quote': "'",
	'shift-Quote': '"',
	'Comma': ',',
	'shift-Comma': '<',
	'Period': '.',
	'shift-Period': '>',
	'Slash': '/',
	'shift-Slash': '?',
};

function addKeyDescriptor(evt){
	// create a "keyDescriptor" field in evt that represents the keystroke as a whole: "ctrl-alt-Delete" for instance.
	const {code, shiftKey, ctrlKey, altKey} = evt;
	let key = evt.key; // needs to be variable
	if (!key || /^(?:shift|control|meta|alt)$/i.test(key)) return evt; // ignore undefined or modifier keys alone
	// we use spaces to delimit keystrokes, so this needs to be changed; use the code
	if (key == ' ') key = 'Space';
	// In general, use the key field. However, modified letters (ctrl- or alt-) use the code field
	// so that ctrl-A is the A key even on non-English keyboards.
	if (ctrlKey || altKey){
		if (/^(Key|Digit)\w$/.test(code)){
			evt.keyDescriptor = code.charAt(code.length-1)[shiftKey ? 'toUpperCase' : 'toLowerCase']();
		}else if (/^Numpad/.test(code)){
			evt.keyDescriptor = key;
		}else{
			evt.keyDescriptor = code;
		}
		if (!/^[a-zA-Z]$/.test(evt.keyDescriptor) && shiftKey) evt.keyDescriptor = 'shift-'+evt.keyDescriptor;
		if (evt.keyDescriptor in specialKeys) evt.keyDescriptor = specialKeys[evt.keyDescriptor];
	}else{
		evt.keyDescriptor = key;
		// printable characters should ignore the shift; that's incorporated into the key generated
		if (key.length !== 1 && shiftKey) evt.keymap = 'shift-'+evt.keymap;
	}
	if (altKey) evt.keyDescriptor = 'alt-'+evt.keyDescriptor;
	if (ctrlKey) evt.keyDescriptor = 'ctrl-'+evt.keyDescriptor;
	return evt;
}

function keymap (keyDescriptorTarget, handler, prefixHandler = ( evt => { evt.preventDefault() } )){
	const prefixes = prefixREs(keyDescriptorTarget);
	const prefixSymbol = Symbol();
	const newHandler = function (evt){
		const keyDescriptorSource = addKeyDescriptor(evt).keyDescriptor;
		if (!keyDescriptorSource) return; // it is a modifier key
		evt.keymapFilter = keyDescriptorTarget;
		const el = evt.currentTarget;
		let currentSequence = keyDescriptorSource;
		if (el[prefixSymbol]) currentSequence = `${el[prefixSymbol]} ${currentSequence}`;
		while (currentSequence){
			const length = currentSequence.split(' ').length;
			if ( prefixes[length-1].test(currentSequence) ){
				// we have a match
				evt.keymapSequence = el[prefixSymbol] = currentSequence;
				prefixHandler.apply(this, arguments);
				if (length == prefixes.length){
					// we have a match for the whole thing
					delete el[prefixSymbol];
					return handler.apply(this, arguments);
				}
				return;
			}
			// if we get here, then we do not have a match. Maybe we started too soon (looking for 'a b c', got 'a a b c' and matched the beginning of the 
			// sequence at the first 'a', but that was wrong, so take off the first 'a' and try again
			currentSequence = currentSequence.replace(/^\S+[ ]?/, '');
		}
		delete el[prefixSymbol]; // no matches at all. 
	};
	newHandler.keymapPrefix = prefixSymbol;
	newHandler.keymapFilter = keyDescriptorTarget;
	return newHandler;
}

globalThis.keymap = keymap;
keymap.normalize = normalize;
keymap.addKeyDescriptor = addKeyDescriptor;

})();


// dwachss/status/status.js commit 6a9da212
// Promise.alert and Promise.prompt allow for creating a "status bar" for interacting with the user

'use strict';

Promise.alert = (message, container = globalThis) => {
	return Promise.resolve(message).then( message => {
		if (message instanceof Error) throw message; 
		if (container instanceof HTMLElement){
			displayMessage(container, message, Promise.alert.classes.success);
		}else{
			(container.log ?? container.alert)(message);
		}
		return message;
	}).catch(error => {
		if (container instanceof HTMLElement){
			displayMessage(container, error, Promise.alert.classes.failure);
		}else{
			const message = container.error ? error : `\u26A0\uFE0F ${error}`; // add warning emoji
			(container.error ?? container.alert)(message);
		}
		return error; // create a fulfilled promise with the error, if the user wants to do something more
	});

	function displayMessage (container, message, classname = Promise.alert.classes.success){
		const span = document.createElement('span');
		span.classList.add(classname);
		span.textContent = message;
		span.setAttribute('role', 'alert');
		span.ontransitionend = evt => span.remove();
		container.prepend(span);
		setTimeout(()=>span.classList.add(Promise.alert.classes.hidden), 10);
	}

}

Object.defineProperty( Promise.prototype, 'alert', {
	value: function (container) { return Promise.alert(this, container) }
});

Promise.alert.classes = {
	success: 'success',
	failure: 'failure',
	hidden: 'hidden'
};

Promise.prompt = (promptMessage = '', container = globalThis, defaultValue = '') => {
	if (container instanceof HTMLElement){
		return new Promise ((resolve, reject) => displayPrompt(resolve, reject)).
			finally( () => container.querySelectorAll('label.prompt').forEach( el => el.remove() ) );
	}else{
		return new Promise ((resolve, reject) => {
			const response = container.prompt(promptMessage, defaultValue);
			if (response === null) reject (new Error(Promise.prompt.cancelMessage));
			resolve(response);
		});
	}
					
	function history(){
		const key = Symbol.for('Promise.prompt.history');
		if (key in container) return container[key];
		try{
			return container[key] = new History(defaultValue);
		}catch{
			// if my history stack is not implemented, the original History constructor will throw a TypeError
			return null;
		}
	}

	function displayPrompt(resolve, reject){
		container.querySelectorAll('label.prompt').forEach( el => el.remove() ); // remove any old elements
		const label = document.createElement('label');
		label.className = 'prompt';
		label.append(document.createElement('strong'), document.createElement('input'));
		label.querySelector('strong').textContent = promptMessage;
		label.querySelector('input').value = defaultValue;
		label.querySelector('input').addEventListener('keydown', function(evt) {
			switch (evt.key){
			case 'Enter':
				evt.preventDefault();
				resolve(this.value);
				break;
			case 'Escape':
				evt.preventDefault();
				reject (new Error(Promise.prompt.cancelMessage));
				break;
			}
		});
		const h = history();
		if (h) label.querySelector('input').addEventListener('keydown', function(evt) {
			switch (evt.key){
			case 'Enter':
				h.pushState(this.value);
				break;
			case 'ArrowUp':
				if (h.atEnd){
					h.pushState(this.value);
					h.back();
				}
				this.value = h.state;
				h.back();
				evt.preventDefault();
				break;
			case 'ArrowDown':
				this.value = h.forward();
				evt.preventDefault();
			break;
			}
		});
		container.prepend(label);
		label.querySelector('input').focus();
	}

}

Promise.prompt.cancelMessage = "User Cancelled";


// dwachss/toolbar/toolbar.js commit 0164cf02
'use strict';

function Toolbar (container, target, func, label){
	this._container = container;
	this._func = func.bind(target);
	container.setAttribute('role', 'toolbar');
	if (label) container.setAttribute('aria-label', label);
	// use ARIA (https://www.w3.org/TR/wai-aria-practices/examples/toolbar/toolbar.html ) to
	// tie the toolbar to the target
	let id = target.getAttribute('id');
	if (!id) {
		id = 'toolbar-target-'+Math.random().toString(36).slice(2); // random enough string
		target.setAttribute('id', id);
	}
	let otherToolbar = document.querySelector(`[aria-controls=${id}]`);
	container.setAttribute('aria-controls', id);
	// only have one toolbar capturing the context menu
	if (!otherToolbar){
		target.addEventListener('keyup', evt => {
			if (evt.key == 'ContextMenu'){
				if ( container.children.length == 0 ) return;
				container.querySelector('[tabindex="0"]').focus();
				evt.preventDefault();
				return false;
			}
		});
		container.addEventListener('contextmenu', evt => {
			// Firefox fires the context menu on the *container* when focused with the event listener above.
			// Just disable the keyboard menu button (right-click works fine)
			if (evt.button == 0) evt.preventDefault();
		});
		container.classList.add('capturing-menu');
	}
	container.addEventListener('keydown', evt => {
		if (evt.key == 'Escape') target.focus();
		if (/^Key[A-Z]$/.test(evt.code)){
			const index = evt.code.charCodeAt(3) - 'A'.charCodeAt(0) + 1;
			const button = container.querySelector(`button:nth-of-type(${index})`);
			if (button) {
				button.dispatchEvent (new MouseEvent('click'));
				button.classList.add('highlight');
				setTimeout( ()=> button.classList.remove('highlight'), 400);
			}
		}
		// https://www.w3.org/TR/wai-aria-practices/#kbd_roving_tabindex
		let focusedButton = container.querySelector('[tabindex="0"]');
		if (!focusedButton) return;
		let tabbables = container.querySelectorAll('[tabindex]');
		let i = [].indexOf.call(tabbables, focusedButton);
		if (evt.key == 'ArrowRight') {
			++i;
			if (i >= tabbables.length ) i = 0; // ahould be at least one element, the focused one
			focusedButton.setAttribute ('tabindex', -1);
			tabbables[i].setAttribute ('tabindex', 0);
			tabbables[i].focus();
		}
		if (evt.key == 'ArrowLeft') {
			--i;
			if (i < 0 ) i = tabbables.length - 1; // ahould be at least one element, the focused one
			focusedButton.setAttribute ('tabindex', -1);
			tabbables[i].setAttribute ('tabindex', 0);
			tabbables[i].focus();
		}
		// Firefox wants to insert the key into the *target*
		// So any printable character (length == 1) is to be ignored.
		if (evt.key.length == 1) evt.preventDefault(); 
	});
}

Toolbar.for = function(el){
	const id = el.getAttribute('id');
	if (!id) return null;
	return document.querySelector(`[aria-controls=${id}]`);
}

Toolbar.getAttribute = function (el, attr) {
	if (/^style\./.test(attr)){
		attr = attr.slice(6).replace (/-[a-z]/g, x => x.toUpperCase() ); // make sure it's camel case
		return el.ownerDocument.defaultView.getComputedStyle(el)[attr];
	}else{
		return el.getAttribute(attr);
	}
}

Toolbar.setAttribute = function (el, attr, state) {
	if (/^style\./.test(attr)){
		attr = attr.slice(6).replace (/-[a-z]/g, x => x.toUpperCase() ); // make sure it's camel case
		el.style[attr] = state;
	}else{
		el.setAttribute(attr, state);
	}
};

Toolbar.toggleAttribute = function (el, attr, states){
	Toolbar.setAttribute (el, attr, Toolbar.getAttribute(el, attr) == states[0] ? states[1] : states[0])
};

Toolbar.prototype = {
	button(name, command = name, title) {
		let button = this._container.querySelector(`button[name=${JSON.stringify(name)}]`);
		if (!button){
			this._container.insertAdjacentHTML('beforeend', '<button>');
			button = this._container.lastChild;
		}
		button.setAttribute('name', name);
		button.classList.add(name.replace(/\s/g,''));
		button.setAttribute('title', title ?? name);
		button.setAttribute('data-command', command);
		let focusedButton = this._container.querySelector('[tabindex="0"]');
		button.setAttribute('tabindex', focusedButton ? -1 : 0 ); // roving tab index. https://www.w3.org/TR/wai-aria-practices/#kbd_roving_tabindex
		button.addEventListener ('click', evt => {
			this._container.querySelector('[tabindex="0"]').setAttribute('tabindex', -1);
			button.setAttribute ('tabindex', 0);
			this._func(button.getAttribute('data-command'));
		});
		return button;
	},
	toggleButton(){
		const button = this.button(...arguments);
		button.addEventListener('click', 
			evt => Toolbar.toggleAttribute (evt.target, 'aria-pressed', ['true', 'false'])
		);
		return button;
	},
	observerButton (name, command = name, attr, title){
		return this.observerElement (this.button(name, command, title), attr);
	},
	buttons (buttons){
		return buttons.forEach(button => this.button(...button));
	},
	element (el) {
		if (el.nodeType){
			this._container.appendChild(el);
		}else{
			this._container.insertAdjacentHTML('beforeend', el);
			el = this._container.lastChild;
		}
		return el;
	},
	observerElement (el, attr){
		el = this.element(el);
		let styleRE = undefined;
		if (/^style\./.test(attr)){
			// keeping track of what needs camel case and what needs snake case is hard!
			attr = attr.slice(6).replace (/-[a-z]/g, x => x.toUpperCase() );
			// the existence of styleRE is a flag that we are looking for styles.
			styleRE = new RegExp (`${attr.replace (/[A-Z]/g, x => '-' + x.toLowerCase() )}:\\s*([^;]+)\\s*;`);
		}
		const observer = new MutationObserver( mutations => {
			mutations.forEach ( mutation => {
				let newValue = mutation.target.getAttribute(attr);
				if (styleRE) newValue = mutation.target.style[attr];
				let oldValue = mutation.oldValue;
				if (styleRE) {
					oldValue = styleRE.exec(mutation.oldValue);
					if (oldValue) oldValue = oldValue[1];
				}
				// if we are observing 'style', then *any* change to inline styles will trigger this.
				// we only want to do anything if *our* CSS property changed.
				if (newValue == oldValue) return;
				el.classList.remove (oldValue);
				if (newValue) el.classList.add (newValue.replace(/\s/g,''));
			});
		});
		observer.observe (
			document.querySelector(`#${this._container.getAttribute('aria-controls')}`),
			{ attribute: true, attributeOldValue: true, attributeFilter: [ styleRE ? 'style' : attr ] }		
		);
		return el;
	}
};


// bililiteRange.js commit ef1c276
'use strict';

let bililiteRange; // create one global variable

(function(){
	
const datakey = Symbol(); // use as the key to modify elements.

bililiteRange = function(el){
	var ret;
	if (el.setSelectionRange){
		// Element is an input or textarea 
		// note that some input elements do not allow selections
		try{
			el.selectionStart = el.selectionStart;
			ret = new InputRange();
		}catch(e){
			ret = new NothingRange();
		}
	}else{
		// Standards, with any other kind of element
		ret = new W3CRange();
	}
	ret._el = el;
	// determine parent document, as implemented by John McLear <john@mclear.co.uk>
	ret._doc = el.ownerDocument;
	ret._win = ret._doc.defaultView;
	ret._bounds = [0, ret.length];
	

	if (!(el[datakey])){ // we haven't processed this element yet	
		const data = createDataObject (el);
		startupHooks.forEach ( hook => hook (el, ret, data) );
	}	
	return ret;
}

bililiteRange.version = 3.2;

const startupHooks = new Set();
bililiteRange.addStartupHook = fn => startupHooks.add(fn);
startupHooks.add (trackSelection);
startupHooks.add (fixInputEvents);
startupHooks.add (correctNewlines);

// selection tracking. We want clicks to set the selection to the clicked location but tabbing in or element.focus() should restore
// the selection to what it was.
// There's no good way to do this. I just assume that a mousedown (or a drag and drop
// into the element) within 100 ms of the focus event must have caused the focus, and
// therefore we should not restore the selection.
function trackSelection (element, range, data){
	data.selection = [0,0];
	range.listen('focusout', evt => data.selection = range._nativeSelection() );	
	range.listen('mousedown', evt => data.mousetime = evt.timeStamp );
	range.listen('drop', evt => data.mousetime = evt.timeStamp );
	range.listen('focus', evt => {
		if ('mousetime' in data && evt.timeStamp - data.mousetime < 100) return;
		range._nativeSelect(range._nativeRange(data.selection))
	});
}

function fixInputEvents (element, range, data){
	// DOM 3 input events, https://www.w3.org/TR/input-events-1/
	// have a data field with the text inserted, but that isn't enough to fully describe the change;
	// we need to know the old text (or at least its length)
	// and *where* the new text was inserted.
	// So we enhance input events with that information. 
	// the "newText" should always be the same as the 'data' field, if it is defined
	data.oldText = range.all();
	data.liveRanges = new Set();
	range.listen('input', evt => {
		const newText = range.all();
		if (!evt.bililiteRange){
			evt.bililiteRange = diff (data.oldText, newText);
			if (evt.bililiteRange.unchanged){
				// no change. Assume that whatever happened, happened at the selection point (and use whatever data the browser gives us).
				evt.bililiteRange.start = range.clone().bounds('selection')[1] - (evt.data || '').length;
			}
		}
		data.oldText = newText;
		
		// Also update live ranges on this element
		data.liveRanges.forEach( rng => {
			const start = evt.bililiteRange.start;
			const oldend = start + evt.bililiteRange.oldText.length;
			const newend = start + evt.bililiteRange.newText.length;
			// adjust bounds; this tries to emulate the algorithm that Microsoft Word uses for bookmarks
			let [b0, b1] = rng.bounds();
			if (b0 <= start){
				// no change
			}else if (b0 > oldend){
				b0  += newend - oldend;
			}else{
				b0  = newend;
			}
			if (b1 < start){
				// no change
			}else if (b1 >= oldend){
				b1 += newend - oldend;
			}else{
				b1 = start;
			}
			rng.bounds([b0, b1]);				
		})
	});
}

function diff (oldText, newText){
	// Try to find the changed text, assuming it was a continuous change
	if (oldText == newText){
		return {
			unchanged: true,
			start: 0,
			oldText,
			newText
		}
	}

	const oldlen = oldText.length;
	const newlen = newText.length;
	for (var i = 0; i < newlen && i < oldlen; ++i){
		if (newText.charAt(i) != oldText.charAt(i)) break;
	}
	const start = i;
	for (i = 0; i < newlen && i < oldlen; ++i){
		let newpos = newlen-i-1, oldpos = oldlen-i-1;
		if (newpos < start || oldpos < start) break;
		if (newText.charAt(newpos) != oldText.charAt(oldpos)) break;
	}
	const oldend = oldlen-i;
	const newend = newlen-i;
	return {
		start,
		oldText: oldText.slice(start, oldend),
		newText: newText.slice(start, newend)
	}
};
bililiteRange.diff = diff; // expose

function correctNewlines (element, range, data){
	// we need to insert newlines rather than create new elements, so character-based calculations work
	range.listen('paste', evt => {
		if (evt.defaultPrevented) return;
		// windows adds \r's to clipboard!
		range.clone().bounds('selection').
			text(evt.clipboardData.getData("text/plain").replace(/\r/g,''), {inputType: 'insertFromPaste'}).
			bounds('endbounds').
			select().
			scrollIntoView();
		evt.preventDefault();
	});
	range.listen('keydown', function(evt){
		if (evt.ctrlKey || evt.altKey || evt.shiftKey || evt.metaKey) return;
		if (evt.defaultPrevented) return;
		if (evt.key == 'Enter'){
			range.clone().bounds('selection').
				text('\n', {inputType: 'insertLineBreak'}).
				bounds('endbounds').
				select().
				scrollIntoView();
			evt.preventDefault();
		}
	});
}

// convenience function for defining input events
function inputEventInit(type, oldText, newText, start, inputType){
	return {
		type,
		inputType,
		data: newText,
		bubbles: true,
		bililiteRange: {
			unchanged: (oldText == newText),
			start,
			oldText,
			newText
		}
	};
}

// base class
function Range(){}
Range.prototype = {
	 // allow use of range[0] and range[1] for start and end of bounds 
	get 0(){
		return this.bounds()[0];
	},
	set 0(x){
		this.bounds([x, this[1]]);
		return x;
	},
	get 1(){
		return this.bounds()[1];
	},
	set 1(x){
		this.bounds([this[0], x]);
		return x;
	},
	all: function(text){
		if (arguments.length){
			return this.bounds('all').text(text, {inputType: 'insertReplacementText'});
		}else{
			return this._el[this._textProp];
		}
	},
	bounds: function(s){
		if (typeof s === 'number'){
			this._bounds = [s,s];
		}else if (bililiteRange.bounds[s]){
			this.bounds(bililiteRange.bounds[s].apply(this, arguments));
		}else if (s && s.bounds){
			this._bounds = s.bounds(); // copy bounds from an existing range
		}else if (s){
			this._bounds = s; // don't do error checking now; things may change at a moment's notice
		}else{
			// constrain bounds now
			var b = [
				Math.max(0, Math.min (this.length, this._bounds[0])),
				Math.max(0, Math.min (this.length, this._bounds[1]))
			];
			b[1] = Math.max(b[0], b[1]);
			return b;
		}
		return this; // allow for chaining
	},
	clone: function(){
		return bililiteRange(this._el).bounds(this.bounds());
	},
	get data(){
		return this._el[datakey];
	},
	dispatch: function(opts = {}){
		var event = new Event (opts.type, opts);
		event.view = this._win;
		for (let prop in opts) try { event[prop] = opts[prop] } catch(e){}; // ignore read-only errors for properties that were copied in the previous line
		this._el.dispatchEvent(event); // note that the event handlers will be called synchronously, before the "return this;"
		return this;
	},
	get document() {
		return this._doc;
	},
	dontlisten: function (type, func = console.log, target){
		target ??= this._el;
		target.removeEventListener(type, func);
		return this;
	},
	get element() {
		return this._el
	},
	get length() {
		return this._el[this._textProp].length;
	},
	live (on = true){
		this.data.liveRanges[on ? 'add' : 'delete'](this);
		return this;
	},
	listen: function (type, func = console.log, target){
		target ??= this._el;
		target.addEventListener(type, func);
		return this;
	},
	scrollIntoView() {
		var top = this.top();
		// note that for TEXTAREA's, this.top() will do the scrolling and the following is irrelevant.
		// scroll into position if necessary
		if (this._el.scrollTop > top || this._el.scrollTop+this._el.clientHeight < top){
			this._el.scrollTop = top;
		}
		return this;
	},
	select: function(){
		var b = this.data.selection = this.bounds();
		if (this._el === this._doc.activeElement){
			// only actually select if this element is active!
			this._nativeSelect(this._nativeRange(b));
		}
		this.dispatch({type: 'select', bubbles: true});
		return this; // allow for chaining
	},
	selection: function(text){
		if (arguments.length){
			return this.bounds('selection').text(text).bounds('endbounds').select();
		}else{
			return this.bounds('selection').text();
		}
	},
	sendkeys: function (text){
		this.data.sendkeysOriginalText = this.text();
		this.data.sendkeysBounds = undefined;
		function simplechar (rng, c){
			if (/^{[^}]*}$/.test(c)) c = c.slice(1,-1);	// deal with unknown {key}s
			rng.text(c).bounds('endbounds');
		}
		text.replace(/{[^}]*}|[^{]+|{/g, part => (bililiteRange.sendkeys[part] || simplechar)(this, part, simplechar) );
		this.bounds(this.data.sendkeysBounds);
		this.dispatch({type: 'sendkeys', detail: text});
		return this;
	},
	text: function(text, {inputType = 'insertText'} = {}){
		if ( text !== undefined ){
			let eventparams = [this.text(), text, this[0], inputType];
			this.dispatch (inputEventInit('beforeinput',...eventparams));
			this._nativeSetText(text, this._nativeRange(this.bounds()));
			this[1] = this[0]+text.length;
			this.dispatch (inputEventInit('input',...eventparams));
			return this; // allow for chaining
		}else{
			return this._nativeGetText(this._nativeRange(this.bounds()));
		}
	},
	top: function(){
		return this._nativeTop(this._nativeRange(this.bounds()));
	},
	get window() {
		return this._win;
	},
	wrap: function (n){
		this._nativeWrap(n, this._nativeRange(this.bounds()));
		return this;
	},
};

// allow extensions ala jQuery
bililiteRange.prototype = Range.prototype;
bililiteRange.extend = function(fns){
	Object.assign(bililiteRange.prototype, fns);
};

bililiteRange.override = (name, fn) => {
	const oldfn = bililiteRange.prototype[name];
	bililiteRange.prototype[name] = function(){
		const oldsuper = this.super;
		this.super = oldfn;
		const ret = fn.apply(this, arguments);
		this.super = oldsuper;
		return ret;
	};
}

//bounds functions
bililiteRange.bounds = {
	all: function() { return [0, this.length] },
	start: function() { return 0 },
	end: function() { return this.length },
	selection: function() {
		if (this._el === this._doc.activeElement){
			this.bounds ('all'); // first select the whole thing for constraining
			return this._nativeSelection();
		}else{
			return this.data.selection;
		}
	},
	startbounds: function() { return  this[0] },
	endbounds: function() { return  this[1] },
	union: function (name,...rest) {
		const b = this.clone().bounds(...rest);
		return [ Math.min(this[0], b[0]), Math.max(this[1], b[1]) ];
	},
	intersection: function (name,...rest) {
		const b = this.clone().bounds(...rest);
		return [ Math.max(this[0], b[0]), Math.min(this[1], b[1]) ];
	}
};

// sendkeys functions
bililiteRange.sendkeys = {
	'{tab}': function (rng, c, simplechar){
		simplechar(rng, '\t'); // useful for inserting what would be whitespace
	},
	'{newline}': function (rng){
		rng.text('\n', {inputType: 'insertLineBreak'}).bounds('endbounds');
	},
	'{backspace}': function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) rng.bounds([b[0]-1, b[0]]); // no characters selected; it's just an insertion point. Remove the previous character
		rng.text('', {inputType: 'deleteContentBackward'}); // delete the characters and update the selection
	},
	'{del}': function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) rng.bounds([b[0], b[0]+1]); // no characters selected; it's just an insertion point. Remove the next character
		rng.text('', {inputType: 'deleteContentForward'}).bounds('endbounds'); // delete the characters and update the selection
	},
	'{rightarrow}':  function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) ++b[1]; // no characters selected; it's just an insertion point. Move to the right
		rng.bounds([b[1], b[1]]);
	},
	'{leftarrow}': function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) --b[0]; // no characters selected; it's just an insertion point. Move to the left
		rng.bounds([b[0], b[0]]);
	},
	'{selectall}': function (rng){
		rng.bounds('all');
	},
	'{selection}': function (rng){
		// insert the characters without the sendkeys processing
		rng.text(rng.data.sendkeysOriginalText).bounds('endbounds');
	},
	'{mark}': function (rng){
		rng.data.sendkeysBounds = rng.bounds();
	},
	'{ctrl-Home}': (rng, c, simplechar) => 	rng.bounds('start'),
	'{ctrl-End}': (rng, c, simplechar) => 	rng.bounds('end')
};
// Synonyms from the DOM standard (http://www.w3.org/TR/DOM-Level-3-Events-key/)
bililiteRange.sendkeys['{Enter}'] = bililiteRange.sendkeys['{enter}'] = bililiteRange.sendkeys['{newline}'];
bililiteRange.sendkeys['{Backspace}'] = bililiteRange.sendkeys['{backspace}'];
bililiteRange.sendkeys['{Delete}'] = bililiteRange.sendkeys['{del}'];
bililiteRange.sendkeys['{ArrowRight}'] = bililiteRange.sendkeys['{rightarrow}'];
bililiteRange.sendkeys['{ArrowLeft}'] = bililiteRange.sendkeys['{leftarrow}'];

// an input element in a standards document. "Native Range" is just the bounds array
function InputRange(){}
InputRange.prototype = new Range();
InputRange.prototype._textProp = 'value';
InputRange.prototype._nativeRange = function(bounds) {
	return bounds || [0, this.length];
};
InputRange.prototype._nativeSelect = function (rng){
	this._el.setSelectionRange(rng[0], rng[1]);
};
InputRange.prototype._nativeSelection = function(){
	return [this._el.selectionStart, this._el.selectionEnd];
};
InputRange.prototype._nativeGetText = function(rng){
	return this._el.value.substring(rng[0], rng[1]);
};
InputRange.prototype._nativeSetText = function(text, rng){
	var val = this._el.value;
	this._el.value = val.substring(0, rng[0]) + text + val.substring(rng[1]);
};
InputRange.prototype._nativeEOL = function(){
	this.text('\n');
};
InputRange.prototype._nativeTop = function(rng){
	if (rng[0] == 0) return 0; // the range starts at the top
	const el = this._el;
	if (el.nodeName == 'INPUT') return 0; 
	const text = el.value;
	const selection = [el.selectionStart, el.selectionEnd];
	// hack from https://code.google.com/archive/p/proveit-js/source/default/source, highlightLengthAtIndex function
	// note that this results in the element being scrolled; the actual number returned is irrelevant
	el.value = text.slice(0, rng[0]);
	el.scrollTop = Number.MAX_SAFE_INTEGER;
	el.value = text;
	el.setSelectionRange(...selection);
	return el.scrollTop;
}
InputRange.prototype._nativeWrap = function() {throw new Error("Cannot wrap in a text element")};

function W3CRange(){}
W3CRange.prototype = new Range();
W3CRange.prototype._textProp = 'textContent';
W3CRange.prototype._nativeRange = function (bounds){
	var rng = this._doc.createRange();
	rng.selectNodeContents(this._el);
	if (bounds){
		w3cmoveBoundary (rng, bounds[0], true, this._el);
		rng.collapse (true);
		w3cmoveBoundary (rng, bounds[1]-bounds[0], false, this._el);
	}
	return rng;					
};
W3CRange.prototype._nativeSelect = function (rng){
	this._win.getSelection().removeAllRanges();
	this._win.getSelection().addRange (rng);
};
W3CRange.prototype._nativeSelection = function (){
	// returns [start, end] for the selection constrained to be in element
	var rng = this._nativeRange(); // range of the element to constrain to
	if (this._win.getSelection().rangeCount == 0) return [this.length, this.length]; // append to the end
	var sel = this._win.getSelection().getRangeAt(0);
	return [
		w3cstart(sel, rng),
		w3cend (sel, rng)
	];
};
W3CRange.prototype._nativeGetText = function (rng){
	return rng.toString();
};
W3CRange.prototype._nativeSetText = function (text, rng){
	rng.deleteContents();
	rng.insertNode (this._doc.createTextNode(text));
	// Lea Verou's "super dirty fix" to #31
	if(text == '\n' && this[1]+1 == this._el.textContent.length) {
		// inserting a newline at the end
		this._el.innerHTML = this._el.innerHTML + '\n';
	}
	this._el.normalize(); // merge the text with the surrounding text
	};
W3CRange.prototype._nativeEOL = function(){
	var rng = this._nativeRange(this.bounds());
	rng.deleteContents();
	var br = this._doc.createElement('br');
	br.setAttribute ('_moz_dirty', ''); // for Firefox
	rng.insertNode (br);
	rng.insertNode (this._doc.createTextNode('\n'));
	rng.collapse (false);
};
W3CRange.prototype._nativeTop = function(rng){
	if (this.length == 0) return 0; // no text, no scrolling
	if (rng.toString() == ''){
		var textnode = this._doc.createTextNode('X');
		rng.insertNode (textnode);
	}
	var startrng = this._nativeRange([0,1]);
	var top = rng.getBoundingClientRect().top - startrng.getBoundingClientRect().top;
	if (textnode) textnode.parentNode.removeChild(textnode);
	return top;
}
W3CRange.prototype._nativeWrap = function(n, rng) {
	rng.surroundContents(n);
};

// W3C internals
function nextnode (node, root){
	//  in-order traversal
	// we've already visited node, so get kids then siblings
	if (node.firstChild) return node.firstChild;
	if (node.nextSibling) return node.nextSibling;
	if (node===root) return null;
	while (node.parentNode){
		// get uncles
		node = node.parentNode;
		if (node == root) return null;
		if (node.nextSibling) return node.nextSibling;
	}
	return null;
}
function w3cmoveBoundary (rng, n, bStart, el){
	// move the boundary (bStart == true ? start : end) n characters forward, up to the end of element el. Forward only!
	// if the start is moved after the end, then an exception is raised
	if (n <= 0) return;
	var node = rng[bStart ? 'startContainer' : 'endContainer'];
	if (node.nodeType == 3){
	  // we may be starting somewhere into the text
	  n += rng[bStart ? 'startOffset' : 'endOffset'];
	}
	while (node){
		if (node.nodeType == 3){
			var length = node.nodeValue.length;
			if (n <= length){
				rng[bStart ? 'setStart' : 'setEnd'](node, n);
				// special case: if we end next to a <br>, include that node.
				if (n == length){
					// skip past zero-length text nodes
					for (var next = nextnode (node, el); next && next.nodeType==3 && next.nodeValue.length == 0; next = nextnode(next, el)){
						rng[bStart ? 'setStartAfter' : 'setEndAfter'](next);
					}
					if (next && next.nodeType == 1 && next.nodeName == "BR") rng[bStart ? 'setStartAfter' : 'setEndAfter'](next);
				}
				return;
			}else{
				rng[bStart ? 'setStartAfter' : 'setEndAfter'](node); // skip past this one
				n -= length; // and eat these characters
			}
		}
		node = nextnode (node, el);
	}
}
var     START_TO_START                 = 0; // from the w3c definitions
var     START_TO_END                   = 1;
var     END_TO_END                     = 2;
var     END_TO_START                   = 3;
// from the Mozilla documentation, for range.compareBoundaryPoints(how, sourceRange)
// -1, 0, or 1, indicating whether the corresponding boundary-point of range is respectively before, equal to, or after the corresponding boundary-point of sourceRange. 
    // * Range.END_TO_END compares the end boundary-point of sourceRange to the end boundary-point of range.
    // * Range.END_TO_START compares the end boundary-point of sourceRange to the start boundary-point of range.
    // * Range.START_TO_END compares the start boundary-point of sourceRange to the end boundary-point of range.
    // * Range.START_TO_START compares the start boundary-point of sourceRange to the start boundary-point of range. 
function w3cstart(rng, constraint){
	if (rng.compareBoundaryPoints (START_TO_START, constraint) <= 0) return 0; // at or before the beginning
	if (rng.compareBoundaryPoints (END_TO_START, constraint) >= 0) return constraint.toString().length;
	rng = rng.cloneRange(); // don't change the original
	rng.setEnd (constraint.endContainer, constraint.endOffset); // they now end at the same place
	return constraint.toString().length - rng.toString().length;
}
function w3cend (rng, constraint){
	if (rng.compareBoundaryPoints (END_TO_END, constraint) >= 0) return constraint.toString().length; // at or after the end
	if (rng.compareBoundaryPoints (START_TO_END, constraint) <= 0) return 0;
	rng = rng.cloneRange(); // don't change the original
	rng.setStart (constraint.startContainer, constraint.startOffset); // they now start at the same place
	return rng.toString().length;
}

function NothingRange(){}
NothingRange.prototype = new Range();
NothingRange.prototype._textProp = 'value';
NothingRange.prototype._nativeRange = function(bounds) {
	return bounds || [0,this.length];
};
NothingRange.prototype._nativeSelect = function (rng){ // do nothing
};
NothingRange.prototype._nativeSelection = function(){
	return [0,0];
};
NothingRange.prototype._nativeGetText = function (rng){
	return this._el[this._textProp].substring(rng[0], rng[1]);
};
NothingRange.prototype._nativeSetText = function (text, rng){
	var val = this._el[this._textProp];
	this._el[this._textProp] = val.substring(0, rng[0]) + text + val.substring(rng[1]);
};
NothingRange.prototype._nativeEOL = function(){
	this.text('\n');
};
NothingRange.prototype._nativeTop = function(){
	return 0;
};
NothingRange.prototype._nativeWrap = function() {throw new Error("Wrapping not implemented")};


// data for elements, similar to jQuery data, but allows for monitoring with custom events
const monitored = new Set();

function signalMonitor(prop, value, element){
	const attr = `data-${prop}`;
	element.dispatchEvent(new CustomEvent(attr, {bubbles: true, detail: value}));
	try{
		element.setAttribute (attr, value); // illegal attribute names will throw. Ignore it			
	} finally { /* ignore */ }
}

function createDataObject (el){
	return el[datakey] = new Proxy(new Data(el), {
		set(obj, prop, value) {
			obj[prop] = value;
			if (monitored.has(prop)) signalMonitor(prop, value, obj.sourceElement);
			return true; // in strict mode, 'set' returns a success flag 
		}
	});
}

var Data = function(el) {
	Object.defineProperty(this, 'sourceElement', {
		value: el
	});
}

Data.prototype = {};
// for use with ex options. JSON.stringify(range.data) should return only the options that were
// both defined with bililiteRange.option() *and* actually had a value set on this particular data object.
// JSON.stringify (range.data.all) should return all the options that were defined.
Object.defineProperty(Data.prototype, 'toJSON', {
	value: function(){
		let ret = {};
		for (let key in Data.prototype) if (this.hasOwnProperty(key)) ret[key] = this[key];
		return ret;
	}
});
Object.defineProperty(Data.prototype, 'all', {
	get: function(){
		let ret = {};
		for (let key in Data.prototype) ret[key] = this[key];
		return ret;
	}
});
Object.defineProperty(Data.prototype, 'trigger', {
	value: function(){
		monitored.forEach(prop => signalMonitor (prop, this[prop], this.sourceElement));
	}
});

bililiteRange.createOption = function (name, desc = {}){
	desc = Object.assign({
		enumerable: true, // use these as the defaults
		writable: true,
		configurable: true
	}, Object.getOwnPropertyDescriptor(Data.prototype, name), desc);
	if ('monitored' in desc) monitored[desc.monitored ? 'add' : 'delete'](name);
	Object.defineProperty(Data.prototype, name, desc);
	return Data.prototype[name]; // return the default value
}

})();

// bililiteRange.undo.js commit ef1c276
'use strict';
(function(){

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

})();

// bililiteRange.lines.js commit ef1c276
'use strict';

(function(){
// a line goes from after the newline to before the next newline. The newline is not included in that line! It's
// a separator only.
bililiteRange.bounds.EOL = function () {
	const nextnewline = this.all().indexOf('\n', this[1]);
	if (nextnewline != -1) return nextnewline;
	return this.bounds('end'); // no newline
};
bililiteRange.bounds.BOL = function(){
	if (this[0] == 0) return 0;
	const prevnewline = this.all().lastIndexOf('\n', this[0]-1);
	if (prevnewline != -1) return prevnewline + 1;
	return 0; // no newline
};
bililiteRange.bounds.line = function (name, n, n2){
	if (n == null){
		// select the entire line or lines including the newline
		return this.bounds('union', 'BOL').bounds('union', 'EOL');
	}else if (n2 == null){
		// select one line. Note that it is 1-indexed, the way ex does it!
		n = parseInt(n);
		if (isNaN(n)) return this.bounds();
		if (n < 1) return [0,0];
		const mynewline = (new RegExp(`^(.*\n){${n}}`)).exec(this.all()); // find the nth newline
		if (mynewline == null){
			this.bounds('end');
			// if this is the last line but it doesn't end with a newline, then accept the whole line
			if (this.all().split('\n').length == n) this.bounds('line');
			return this;
		}
		return this.bounds(mynewline[0].length-1).bounds('line');
	}else{
		return this.bounds('line', n).bounds('union', 'line', n2);
	}
};
bililiteRange.bounds.andnewline = function(){
	// if we want a "line" to include the following newline, use this
	if (this.all().charAt(this[1]) == '\n') return this.bounds('union', this[1]+1);
}
bililiteRange.bounds.char = function (name, n){
	// move to character position n in the line of the start of this range.
	this.bounds('EOL');
	this.bounds('BOL').bounds('line');
	if (this.bounds('BOL').bounds('line').text().length < n){
		return this.bounds('EOL');
	}else{
		return this[0] + n;
	}
};

bililiteRange.createOption ('autoindent', {value: false});
bililiteRange.override ('text', function (text, opts = {}){
	if ( text === undefined ) return this.super();
	if (opts.ownline && text[0] != '\n' && this[1] > 0) text = `\n${text}`;
	if (opts.ownline && this.all().charAt(this[1]) != '\n') text = `${text}\n`;
	if (opts.autoindent == 'invert') opts.autoindent = !this.data.autoindent;
	if (opts.autoindent || (opts.autoindent == null && this.data.autoindent && opts.inputType == 'insertLineBreak')){
		text = indent(text, this.indentation());
	}
	return this.super(text, opts);
});

bililiteRange.createOption ('tabsize', { value: 2, monitored: true }); // 8 is the browser default
bililiteRange.addStartupHook ( (element, range, data) => {
	element.style.tabSize = element.style.MozTabSize = data.tabsize; // the initial value will be set before we start listening
	range.listen('data-tabsize', evt => element.style.tabSize = element.style.MozTabSize = evt.detail);
});

bililiteRange.extend({
	char: function(){
		return this[0] - this.clone().bounds('BOL')[0];
	},
	indent: function (tabs){
		// tabs is the string to insert before each line of the range
		this.bounds('union', 'BOL');
		// need to make sure we add the tabs at the start of the line in addition to after each newline
		return this.text(tabs + indent (this.text(), tabs), {select: 'all', inputType: 'insertReplacementText'});
	},
	indentation: function(){
		// returns the whitespace at the start of this line
		return /^\s*/.exec(this.clone().bounds('line').text())[0];
	},
	line: function(){
		// return the line number of the *start* of the bounds. Note that it is 1-indexed, the way ex writes it!
		// just count newlines before this.bounds
		return this.all().slice(0, this[0]).split('\n').length;
	},
	lines: function(){
		const start = this.line();
		const end = this.clone().bounds('endbounds').line();
		return [start, end];
	},
	unindent: function (n, tabsize){
		// remove n tabs or sets of tabsize spaces from the beginning of each line
		tabsize = tabsize || this.data.tabsize;
		return this.bounds('line').text(unindent(this.text(), n, tabsize), {select: 'all', inputType: 'insertReplacementText'});
	},
});

bililiteRange.sendkeys['{ArrowUp}'] = bililiteRange.sendkeys['{uparrow}'] = function (rng){
	const c = rng.char();
	rng.bounds('line', rng.line()-1).bounds('char', c);
};
bililiteRange.sendkeys['{ArrowDown}'] = bililiteRange.sendkeys['{downarrow}'] = function (rng){
	const c = rng.char();
	rng.bounds('line', rng.line()+1).bounds('char', c);
};
bililiteRange.sendkeys['{Home}'] =  function (rng){
	rng.bounds('BOL');
};
bililiteRange.sendkeys['{End}'] =  function (rng){
	rng.bounds('EOL');
};

// utilities

function indent(text, tabs){
	return text.replace(/\n/g, '\n' + tabs);
}
function unindent(str, count, tabsize){
	// count can be an integer >= 0 or Infinity.
	// (We delete up to 'count' tabs at the beginning of each line.)
	// If invalid, defaults to 1.
	//
	// tabsize can be an integer >= 1.
	// (The number of spaces to consider a single tab.)
	tabsize = Math.round(tabsize);
	count = Math.round(count);
	if (!isFinite(tabsize) || tabsize < 1) tabsize = 4;
	if (isNaN(count) || count < 0) count = 1;
	if (!isFinite(count)) count = '';
	const restart = new RegExp(`^(?:\t| {${tabsize}}){1,${count}}`, 'g');
	const remiddle = new RegExp(`(\\n)(?:\t| {${tabsize}}){1,${count}}`, 'g');
	return str.replace(restart, '').replace(remiddle, '$1');
}

})();

// bililiteRange.find.js commit ef1c276
'use strict';

(function(bililiteRange){

bililiteRange.createOption('dotall', {value: false});
bililiteRange.createOption('global', {value: false});
bililiteRange.createOption('ignorecase', {value: false});
bililiteRange.createOption('magic', {value: true});
bililiteRange.createOption('multiline', {value: false});
bililiteRange.createOption('unicode', {value: false});
bililiteRange.createOption('wrapscan', {value: true});

bililiteRange.bounds.find = function (name, restring, flags = ''){
	return find (this, restring, 'V'+flags);
};

bililiteRange.override('bounds', function (re, flags = ''){
	// duck typed RegExps are OK, allows for flags to be part of re
	if (!(re instanceof Object && 'source' in re && 'flags' in re)) return this.super(...arguments);
	return find (this, re.source, flags + re.flags);
});

bililiteRange.prototype.replace = function (search, replace, flags = ''){
	if (search instanceof Object && 'source' in search && 'flags' in search){
		// a RegExp or similar
		flags = flags + search.flags;
		search = search.source;
	}else{
		search = search.toString();
		flags = 'V' + flags;
	}
	return this.text(
		replaceprimitive (search, parseFlags(this, flags), this.all(), replace, this[0], this[1]),
		{ inputType: 'insertReplacementText' }
	);
}		

bililiteRange.createOption ('word', {value: /\b/});
bililiteRange.createOption ('bigword', {value: /\s+/});
bililiteRange.createOption ('sentence', {value: /\n\n|\.\s/});
bililiteRange.createOption ('paragraph', {value: /\n\s*\n/});
bililiteRange.createOption ('section', {value: /\n(<hr\/?>|(-|\*|_){3,})\n/i});
bililiteRange.createOption ('()', {value: [/\(/, /\)/] });
bililiteRange.createOption ('[]', {value: [/\[/, /]/] });
bililiteRange.createOption ('{}', {value: [/{/, /}/] });
bililiteRange.createOption ('"', {value: [/"/, /"/] });
bililiteRange.createOption ("'", {value: [/'/, /'/] });

bililiteRange.bounds.to = function(name, separator, outer = false){
	if (separator in this.data) separator = this.data[separator];
	if (separator.length == 2) separator = separator[1];
	if (!(separator instanceof RegExp)) separator = new RegExp (quoteRegExp (separator));
	// end of text counts as a separator
	const match = findprimitive(`(${separator.source})|$`, 'g'+separator.flags, this.all(), this[1],  this.length);
	return this.bounds('union', outer ? match.index + match[0].length : match.index);
};

bililiteRange.bounds.from = function(name, separator, outer = false){
	if (separator in this.data) separator = this.data[separator];
	if (separator.length == 2) separator = separator[0];
	if (!(separator instanceof RegExp)) separator = new RegExp (quoteRegExp (separator));
	// start of text counts as a separator
	const match = findprimitiveback(`(${separator.source})|^`, 'g'+separator.flags, this.all(), 0,  this[0]);
	return this.bounds('union', outer ? match.index : match.index + match[0].length);
};

bililiteRange.bounds.whole = function(name, separator, outer = false){
	if (separator in this.data) separator = this.data[separator];
	// if it's a two-part separator (like parentheses or quotes) then "outer" should include both.
	return this.bounds('union', 'from', separator, outer && separator?.length == 2).bounds('union', 'to', separator, outer);
};

//------- private functions -------

function find (range, source, sourceflags){
	const {
		backward,
		magic,
		restricted,
		sticky,
		wrapscan,
		flags
	} = parseFlags (range, sourceflags + 'g');
	if (!magic) source = quoteRegExp (source);
	const findfunction = backward ? findprimitiveback : findprimitive;
	let from, to;
	if (restricted){
		from = range[0];
		to = range[1];
	}else if (backward){
		from = 0;
		to = range[0];
	}else{
		from = range[1];
		to = range.length;
	}
	let match = findfunction (source, flags, range.all(), from, to);
	if (!match && wrapscan && !sticky && !restricted){
		match = findfunction(source, flags, range.all(), 0, range.length);
	}
	range.match = match || false; // remember this for the caller
	if (match) range.bounds([match.index, match.index+match[0].length]); // select the found string
	return range;
}

function parseFlags (range, flags){
	let flagobject = {
		b: false,
		g: range.data.global,
		i: range.data.ignorecase,
		m: range.data.multiline,
		r: false,
		s: range.data.dotall,
		u: range.data.unicode,
		v: range.data.magic,
		w: range.data.wrapscan,
		y: false
	};
	flags.split('').forEach( flag => flagobject[flag.toLowerCase()] = flag === flag.toLowerCase() );
	return {
		// these are the "real" flags
		flags: (flagobject.g ? 'g' : '') + (flagobject.i ? 'i' : '') + (flagobject.m ? 'm' : '') +
			(flagobject.s ? 's' : '') + (flagobject.u ? 'u' : '') + (flagobject.y ? 'y' : ''),
		backward: flagobject.b,
		global: flagobject.g,
		magic: flagobject.v,
		restricted: flagobject.r,
		wrapscan: flagobject.w,
		sticky: flagobject.y
	};
}

function quoteRegExp (source){
	// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
	return source.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

function findprimitive (source, flags, text, from, to){
	// code from https://github.com/idupree/bililiteRange/tree/findback-greedy-correctness
	if (to < text.length){
		// make sure that there are at least length-to characters after the match
		source = `(?:${source})(?=[^]{${text.length-to}})`;
	}
	const re = new RegExp (source, flags);
	re.lastIndex = from;
	return re.exec(text);
}

function findprimitiveback (source, flags, text, from, to){
	// code from https://github.com/idupree/bililiteRange/tree/findback-greedy-correctness
	if (to < text.length){
		// make sure that there are at least length-to characters after the match
		source = `(?:${source})(?=[^]{${text.length-to}})`;
	}
	if (/y/.test(flags)){
		// sticky. Only match the end of the string.
		flags = flags.replace('y','');
		source = `(?:${source})(?![^]{${text.length-to+1}})`; // *don't* match too many characters
		// this works even if $ won't, if multiline is true
		const re = new RegExp (source, flags);
		re.lastIndex = from;
		return re.exec(text);
	}else{
		// no way to search backward; have to search forward until we fail
		const re = new RegExp (source, flags);
		re.lastIndex = from;
		let match = false;
		do {
			var lastmatch = match;
			match = re.exec(text);
			if (match && re.lastIndex == match.index) ++re.lastIndex; // beware zero-length matches and infinite loops
		}while (match);
		return lastmatch;
	}
}

function replaceprimitive (search, flagobject, text, replace, from, to){
	if (!flagobject.magic) search = quoteRegExp (search);
	if (from > 0){
		// make sure we have at least (from) characters before the match
		search = `(?<=[^]{${from}})(?:${search})`;
	}
	if (to < text.length){
		// make sure we have at least (length - to) characters after the match
		search = `(?:${search})(?=[^]{${text.length - to}})`;
	}
	if (flagobject.sticky && flagobject.backward){
		flagobject.flags = flagobject.flags.replace(/[gy]/g, '');
		// make sure we don't have too many characters after the match
		search = `(?:${search})(?![^]{${text.length - to + 1}})`;
	}else if (flagobject.backward && ! flagobject.global){
		// would anyone ever do this? Replace only the last match?
		const match = findprimitiveback (search, flagobject.flags+'g', text, from, to);
		if (!match) return text.slice (from, to); // no match, no change
		search = `(?<=[^]{${match.index}})(?:${search})`;
	}
	const re = new RegExp (search, flagobject.flags);
	re.lastIndex = from; // only relevant for sticky && !backward
	// if to == length, then go to the end of the string,not to position 0!
	return text.replace (re, replace).slice(from, to-text.length || undefined);
}

})(bililiteRange);

// bililiteRange.ex.js commit ef1c276
'use strict';

(function(undefined){

/*********************** the actual ex plugin *********************************/
bililiteRange.ex = {}; // namespace for exporting utility functions

const exkey = Symbol(); // marker that an element has been processed already

bililiteRange.createOption ('stdout', {value: console.log, enumerable: false});
bililiteRange.createOption ('stderr', {value: console.error, enumerable: false});
bililiteRange.createOption ('reader', {
	value: async (file, dir) => localStorage.getItem(file)
});
bililiteRange.createOption ('writer', {
	value: async (text, file, dir) => localStorage.setItem(file, text)
});
// to use AJAX (you would probably want to handle HTTP errors, which still resolve, with response.ok != true):
// range.data.reader = async (file, dir) => (await fetch(file)).text();
// range.data.writer = async (text, file, dir) => await fetch(file, {method: 'POST', body: text});
// to use jQuery:
// range.data.reader = async (file, dir) => $.get(file);
// range.data.writer = async (text, file, dir) => $.post(file, {text: text});
bililiteRange.createOption ('savestatus', { monitored: true, value: 'clean', enumerable: false });
bililiteRange.createOption ('confirm', { enumerable: false, value: false });

bililiteRange.prototype.executor = function ({command, defaultaddress = '%%'} = {}){
	// returns a function that will run commandstring (if not defined, then will run whatever command is passed in when executed)
	const el = this.element;
	return text => {
		el.focus();
		bililiteRange(el).bounds('selection').
		 ex(command ?? text, defaultaddress).
		 select().
		 scrollIntoView();
	}
};

bililiteRange.prototype.ex = function (commandstring = '', defaultaddress = '.'){
	const data = this.data;
	if (!this.element[exkey]){
		this.element[exkey] = new Set(); // for storing all the event handlers that need to be removed at quit

		this.initUndo(false); // ex shouldn't affect key strokes

		data.directory ??= this.window.location.origin;
		data.file ??= this.window.location.pathname; // if this is set to the empty string, then don't save anything.
		
		addListener (this, 'visibilitychange', evt => {
			if (document.visibilityState == 'hidden') preserve(this);
		}, document);
		const unloadhandler = evt => {
			evt.preventDefault();
			return evt.returnValue = 'not saved'; // any nonempty string
		};
		addListener (this, 'input', evt => data.savestatus = 'dirty');
		addListener(this, 'beforeunload', unloadhandler, window);
		addListener (this, 'data-savestatus', evt => {
			// from https://developer.chrome.com/blog/page-lifecycle-api/
			if (data.savestatus == 'clean' || !data.confirm){
				this.dontlisten('beforeunload', unloadhandler, window);
			}else{
				this.listen('beforeunload', unloadhandler, window);
			}
		});
		data.savestatus = 'clean';
		data.marks = {
			"'": this.clone().live(), // this will record the last position in the text
			"''": this.clone().live() // this records the current position; just so it can be copied into ' above
		};
	}else{
		// update the marks
		let b = this.bounds(), lastb = data.marks["''"].bounds();
		if (b[0] != lastb[0] || b[1] != lastb[1]){
			data.marks["'"].bounds(lastb);
			data.marks["''"].bounds(b);
		}
	}
	// actually do the command
	commandstring = commandstring.replace(/^:+/,''); // ignore initial colons that were likely accidentally typed.
	try{
		splitCommands(commandstring, '|').forEach(function(command){
			let parsed = parseCommand(command, defaultaddress);
			interpretAddresses(this, parsed.addresses, data);
			parsed.command.call(this, parsed.parameter, parsed.variant);
		}, this);	
		this.dispatch({type: 'excommand', command: commandstring, range: this});
	}catch(err){
		this.data.stderr(err);
	}
	return this; // allow for chaining
};

var registers = bililiteRange.ex.registers = []; // the delete register is a stack, with 0 the most recent (use shift rather than pop)

/*********************** command completion *********************************/

function commandCompletion(command){
	var ret = (function(){
		if (commands[command]) return commands[command];
		command = command.toLowerCase();
		for (var trialCommand in commands){
			if (trialCommand.substr(0,command.length) == command) return commands[trialCommand];
		}
		throw new Error(command+" not defined");
	})();
	if (typeof ret == 'string') return commandCompletion(ret); // look for synonyms; beware of infinite loops!
	return ret;
}

/*********************** separating a command line into individual commands *********************************/
function splitCommands(commandLine, splitter = '|'){
	// need to be fancy about the | in regexps and strings; rather than try to make a monster regexp, use a simple parser
	var commands = [];
	var delims = /[/"]/; // regular expressions and strings
	var escaper = /\\/;
	for (var i = 0; i < commandLine.length; ++i){
		if (commandLine.substr(i, splitter.length) == splitter){
			commands.push (commandLine.slice(0, i));
			commandLine = commandLine.slice(i+splitter.length);
			i = -1; // restart the loop
			continue;
		}
		var c = commandLine.charAt(i);
		if (escaper.test(c)) ++i;
		if (delims.test(c)){
			// scan forward until the end of the string
			for (var j = i+1; j <= commandLine.length; ++j){
				var d = commandLine.charAt(j);
				if (d === '') {
					// fell off the end; we will close the string
					commandLine += c;
					d = c;
				}
				if (escaper.test(d)) ++j;
				if (c == d){
					i = j;
					break;
				}
			}
		}
	}
	commands.push(commandLine); // the rest of the line
	commands = commands.filter ( item => item ); // remove empty strings
	return commands;
}

bililiteRange.ex.splitCommands = splitCommands;

/*********************** parsing individual commands *********************************/
// create a regular expression to cover all possible address indicators.
// Rather than write the whole ugly thing out, synthesize it.
const addressRE = new RegExp('^\\s*' + // allow whitespace at the beginning
	'('+[
		'%%', // my extension to mean "current range"
		String.raw`[.\$%]`, // single character addresses
		String.raw`\d+`, // line numbers
		"'['a-z]", // marks
		// regular expressions. Allow any letters as flags
		String.raw`/(?:\\.|[^/])*/[a-zA-Z]*`
	].join('|')+')'
);

// command names. Technically multiple >>> and <<< are legal, but we will treat them as parameters
const idRE = /^\s*([!=&~><]|[a-zA-Z]+)/; 

function parseCommand(command, defaultaddress){
	return {
		addresses: parseAddresses(),
		command: commandCompletion(parseCommandWord()),
		variant: parseVariant(),
		parameter: parseParameter()
	};
	
	function parseAddresses(){
		var addresses = [defaultaddress];
		// basic addresses
		command = command.replace(addressRE, function(match, c){
			addresses = [c];
			return '';
		});
		// relative addresses
		command = command.replace(/^\s*[-+\d]+/, function (match){
			addresses[0] += match;
			return '';
		});
		// a comma separates addresses
		if (/^\s*[,;]\s*/.test(command)){
			if (/^\s*;/.test(command)) addresses.push(';'); // need to track semicolons since they change the value of '.'
			command = command.replace(/^\s*[,;]\s*/, '');
			addresses.push.apply(addresses, parseAddresses()); // recursively parse the whole list
		}
		return addresses;
	}

	function parseCommandWord(){
		if (/^\s*$/.test(command)) return 'print'; // blank line just goes to the addressed line, which is what we do with print
		var ret;
		command = command.replace(idRE, function (match, c){
			ret = c;
			return '';
		});
		if (!ret) throw new Error("No command string");
		return ret;
	}
	function parseVariant(){
		var variant = false;
		command = command.replace(/^\s*!/, function (){
			variant = true;
			return '';
		});
		return variant;
	}
	function parseParameter(){
		return (string(command));
	}
}

function string(text){
	// we use JSON strings if it is necessary to include special characters
	if (text === undefined) return '';
	text = text.trim();
	if (text.startsWith('"')){
		try{
			text = JSON.parse(text);
		}catch (err){
			// nothing; it's not a JSON string
		}
	}
	return text;
}
bililiteRange.ex.string = string; // export it

/*********************** turn an array of address descriptions into an actual range *********************************/
var lastRE = /(?:)/; // blank RE's refer to this
var lastSubstitutionRE = /(?:)/; // & command uses this
function interpretAddresses (rng, addresses){
	// %% is the current range. If it is used by itself, don't change the range (or use line-based addressing)
	if (addresses.length == 1 && addresses[0] == "%%") return;
	const data = rng.data;
	var lines = [];
	var currLine = rng.line();
	addresses.forEach(function(s){
		var offset = 0;
		s = s.replace(/[-+\d]+$/, function (match){
			offset = interpretOffset(match);
			return '';
		});
		if (s.charAt(0) == '/'){
			var re = createRE(s);
			let line = rng.bounds(re).line()+offset;
			lines.push(line);
		}else if (s.charAt(0) == "'"){
			var mark = data.marks[s.slice(1)];
			if (mark){
				var these = mark.lines();
				lines.push(these[0]);
				if (these[0] != these[1]) lines.push(these[1]);
			}else{
				throw new Error('Mark '+s.slice(1)+' not defined');
			}
		}else if (/\d+/.test(s)){
			lines.push(rng.bounds('line', s).bounds('EOL').line()+offset); // make sure we go to the end of the line
		}else if (s == '.'){
			lines.push(currLine+offset);
		}else if (s == '%%'){
			var rnglines = rng.lines();
			lines.push(rnglines[0]);
			lines.push(rnglines[1]+offset);
		}else if (s == '$'){
			lines.push (rng.bounds('end').line()+offset);
		}else if (s == '%'){
			lines.push(0);
			lines.push (rng.bounds('end').line()+offset);
		}else if (s == ';'){
			if (lines.length > 0)	currLine = lines[lines.length-1];
		}else if (s == ''){
			lines.push(offset);
		}
	});
	rng.bounds('line', lines.pop(), lines.pop());
}

// we want to be able to list RegExp's with set, which uses JSON.stringify. This function lets us to that.
function REtoJSON() { return '/' + this.source + '/' + (this.flags || '') }
function createRE(s, substitute = false){
	// create a pseudo RegExp from a string (with an aribitrary delimiter, no \w characters or special RegExp characters).
	// if substitute is true, of the form /source/(replacement/)?flags?/?
	// otherwise /source/flags?/?
	// note that it may end with a delimiter, which may be added by the parser in splitCommands
	// as with splitCommands above, easier to scan with a simple parser than to use RegExps
	const delim = s.charAt(0);
	if (/[\w\\|"]/.test(delim)) throw new Error(`Illegal delimiter in regular expression: ${delim}`);
	const escaper = /\\/;
	let source, replacement, flags;
	let i;
	for (i = 1; i < s.length; ++i){
		let c = s.charAt(i);
		if (escaper.test(c)) ++i;
		if (c == delim) break;
	}
	source = s.substring(1, i);
	s = s.substring(i+1);
	if (substitute) {
		for (i = 0; i < s.length; ++i){
			let c = s.charAt(i);
			if (escaper.test(c)) ++i;
			if (c == delim) break;
		}
		replacement = s.substring(0, i);
		s = s.substring(i+1);
	}else{
		replacement = '';
	}
	// flags may end with a delimiter, put in by the parser in splitCommands
	s = s.replace(RegExp('([a-zA-Z]*)\\'+delim+'?'), function(match, p1){
		flags = p1;
		return '';
	});
	if (source == ''){
		// blank string means use last regular expression
		source = lastRE.source;
	}
	lastRE = {source, replacement, flags, rest: s, toJSON: REtoJSON};
	return lastRE;
}
bililiteRange.ex.createRE = createRE;

function interpretOffset(s){
	var re = /([-+]\d*)|\d+/g, ret = 0, match;
	while(match = re.exec(s)){
		switch (match[0]){
			case '+' : ++ret; break;
			case '-' : --ret; break;
			default: ret += parseInt(match[0]);
		}
	}
	return ret;
}

/*********************** the registers *********************************/

function pushRegister(text, register){
	if (register){
		if (/^[A-Z]/.test(register)){
			// uppercase means append
			registers[register.toLowerCase()] += text;
		}else{
			registers[register] = text;
		}
	}else{
		// unnamed register is the delete stack
		registers.unshift(text);
	}		
}

function popRegister (register){
	return register ? registers[register.toLowerCase()] : registers.shift();
}

/*********************** save and quit *********************************/

function preserve (rng) {
	const data = rng.data;
	localStorage.setItem(`ex-${data.directory}/${data.file}`, rng.all());
}

function recover (rng) {
	const data = rng.data;
	rng.all(localStorage.getItem(`ex-${data.directory}/${data.file}`));
}

function writer (rng, parameter) {
	const file = parameter || rng.data.file;
	return rng.data.writer (rng.all(), file, rng.data.directory).then( () => {
		rng.data.savestatus = 'clean';
		if (parameter) rng.data.file = parameter;
		rng.data.stdout (file + ' saved');
	}).catch( err => {
		rng.data.savestatus = 'failed';
		rng.data.stderr(new Error (file + ' not saved'));
	});
};

function addListener (rng, ...handler){
	rng.element[exkey].add(handler);
	rng.listen(...handler);
}

function removeListeners (rng){
	rng.element[exkey].forEach( handler => rng.dontlisten(...handler) );
}
	
/*********************** the actual editing commands *********************************/

// a command is a function (parameter {String}, variant {Boolean})
// 'this' is the bililiteRange; or a string that marks a synonym
var commands = bililiteRange.ex.commands = {
	a: 'append',

	ai: 'autoindent',

	append: function (parameter, variant){
		this.bounds('EOL').text(parameter, {
			ownline: true,
			autoindent: variant ? 'invert' : undefined
		}).bounds('endbounds');
	},

	c: 'change',
	
	cd: 'directory',

	change: function (parameter, variant){
		pushRegister (this.text());
		const indentation = this.indentation();
		this.text(parameter, {
			inputType: 'insertReplacementText'
		}).bounds('endbounds');
		// the test is variant XOR autoindent. the !'s turn booleany values to boolean, then != means XOR
		if (!variant != !this.data.autoindent) this.indent(indentation);
	},
	
	chdir: 'directory',

	copy: function (parameter, variant){
		var targetrng = this.clone();
		var parsed = parseCommand(parameter, '.');
		interpretAddresses(targetrng, parsed.addresses);
		targetrng.bounds('endbounds').text(this.text(), {
			ownline: true,
			inputType: 'insertFromPaste'
		}).bounds('endbounds');
		this.bounds(targetrng.bounds());
	},

	del: function (parameter, variant){
		var match = /^([a-zA-Z]?)\s*(\d*)/.exec(parameter);
		// the regular expression will match anything (all the components are optional), so match is never false
		if (match[2]){
			// a count means we to change the range in e.g., 1,2 d 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
			var lines = this.lines();
			this.bounds('line', lines[1], lines[1]+Math.max(1, parseInt(match[2]))-1);
		}
		pushRegister(this.text(), match[1]);
		this.bounds('andnewline').text('', {inputType: 'deleteContent'}).bounds('endbounds');
	},

	'delete': 'del',
	
	dir: 'directory',
	
	edit: function (parameter, variant){
		if (this.data.confirm && this.data.savestatus == 'dirty' && !variant){
			throw new Error (this.data.file + ' not saved. Use edit! to force reloading');
		}
		const file = parameter || this.data.file;
		this.data.reader(file, this.data.directory).then( text => {
			if (parameter) this.data.file = parameter;
			this.all(text).bounds('end');
			this.data.savestatus = 'clean';
			this.data.stdout (file + ' loaded');
		}).catch(
			err => this.data.stderr (new Error (file + ' not loaded'))
		);
	},

	global: function (parameter, variant){
		if (parameter == '?' || /^[a-z]/.test(parameter)){
			// we are referring to the global option, not the command
			createOption.Boolean('global').call(this, parameter, variant);
			return;
		}
		// TODO: make this work correctly, even with multiple added lines.
		var re = createRE(parameter);
		re.flags += 'r'; // search within the line
		var commands = string(re.rest);
		var line = this.clone();
		var lines = this.lines();
		for (var i = lines[0]; i <= lines[1]; ++i){
			line.bounds('line', i).bounds(re);
			if (!line.match == variant){ // !match means match is not defined.
				const oldlines = this.all().split('\n').length;
				line.ex(commands);
				const addedlines = this.all().split('\n').length - oldlines;
				lines[1] += addedlines;
				i += addedlines;
				// note that this assumes the added lines are all  before or immediately after the current line. If not, we will skip the wrong lines			
			}
		}
		this.bounds(line).bounds('EOL'); // move to the end of the last modified line
	},

	i: 'insert',

	insert: function (parameter, variant){
		// go to right before the beginning of this line
		this.bounds('BOL').bounds(this[0]-1).text(parameter, {
			ownline: true,
			autoindent: variant ? 'invert' : undefined
		}).bounds('endbounds');
	},

	ic: 'ignorecase',

	join: function (parameter, variant){
		var lines = this.lines();
		var match = /^\d+/.exec(parameter);
		if (match){
			// a count means we to change the range in e.g., 1,2 d 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
			lines = [lines[1], lines[1]+parseInt(match[0])-1];
		}
		if (lines[0] == lines[1]) ++lines[1]; // join at least 2 lines
		var re = variant ? /\n/g : /\s*\n\s*/g;
		var replacement = variant ? '' : ' '; // just one space. Doesn't do what the ex manual says about not inserting a space before a ')'
		this.bounds('line', lines[0], lines[1]);
		this.text(this.text().replace(re, replacement), {
			inputType: 'insertReplacementText'
		}).bounds('startbounds');
	},

	k: 'mark',

	m: 'move',
	
	map: function (parameter, variant){
		const parameters = splitCommands (parameter, ' ');
		const lhs = string(parameters.shift());
		const rhs = string(parameters.join(' '));
		this.dispatch ({type: 'map', detail: { command: 'map', variant, rhs, lhs }});
	},

	mark: function (parameter, variant){
		const mark = this.clone();
		this.data.marks[parameter] = mark.live();
	},

	move: function (parameter, variant){
		const text = this.text();
		const parsed = parseCommand(parameter, '.');
		const targetrng = this.clone();
		interpretAddresses(targetrng, parsed.addresses);
		if (targetrng[0] >= this[0] && targetrng[0] <= this[1]) return; // if target is inside the current range, don't do anything
		targetrng.bounds('endbounds');
		this.bounds('andnewline').text('', {inputType: 'deleteByDrag'});
		targetrng.text(text, {
			ownline: true,
			inputType: 'insertFromDrop'
		}).bounds('startbounds');
		if (targetrng[0] >= this[0]) targetrng[0] -= text.length; // account for the removed text
		this.bounds(targetrng[0]);
	},

	notglobal: function (parameter, variant){
		commands.global.call (this, parameter, !variant);
	},

	print: function() { this.select() },
	
	preserve () { preserve(this) },

	put: function (parameter, variant){
		this.bounds('EOL').text(popRegister(parameter), {
			inputType: 'insertFromYank',
			ownline: true
		}).bounds('endbounds');
	},
	
	quit (parameter, variant){
		const data = this.data;
		if (!variant && data.savestatus != 'clean' && data.confirm){
			if (!data.confirm(`${data.file} not saved. Do you want to leave?`)) return;
		}
		preserve(this);
		removeListeners (this);
		delete this.element[exkey];
		Object.values(data.marks).forEach( rng => rng.live(false) );
		data.marks = {};
		this.window.dispatchEvent( new CustomEvent('quit', { detail: this.element }) );
	},
	
	read: function (parameter, variant){
		if (variant) {
			this.text(Function (parameter).call(this));
		}else{
			const file = parameter || this.data.file;
			this.data.reader(file, this.data.directory).then( text => {
				this.bounds('EOL').text(text, {
					ownline: true
				}).bounds('endbounds');
				this.data.stdout(file + ' read');
			}).catch(
				err => this.data.stderr(new Error (file + ' not read'))
			);
		}
	},
	
	recover () { recover(this) },

	redo: function (parameter, variant){
		// restores the text only, not any other aspects of state
		this.redo();
	},

	s: 'substitute',
	
	sendkeys: function (parameter, variant){
		this.sendkeys(parameter);
	},

	set: function (parameter, variant){
		if (!parameter){
			this.data.stdout (JSON.stringify(this.data));
		}else if(parameter == 'all'){
			this.data.stdout (JSON.stringify (this.data.all));
		}else{
			var self = this;
			splitCommands(parameter, ' ').forEach(function(command){
				var match = /(no)?([^=?]+)(\?|=(.+)|)/.exec(command);
				if (!match && command.trim()) throw new Error('Bad syntax in set: '+command);
				var func = match[2];
				if (match[1]){
					var value = 'off';
				}else if (!match[3]){
					value = 'on';
				}else if (match[3] == '?'){
					value = '?';
				}else{
					value = string(match[4]);
				}
				commandCompletion(func).call(self, value, variant); // each option takes care of its own setting
			});
		}
	},

	shiftwidth: "tabsize",
	
	source: function (parameter, variant){
		if (!parameter) throw new Error ('No file named in source');
		this.data.reader(parameter, this.data.directory).then( sourcefile => {
			// blank lines should be ignored, not interpreted as print
			sourcefile.split('\n').filter( line => line.trim() ).forEach ( line => this.ex(line) );
		}).catch(
			err => this.data.stderr(new Error (parameter + ' not read in source'))
		);
	},

	substitute: function (parameter, variant){
		// we do not use the count parameter (too hard to interpret s/(f)oo/$1 -- is that last 1 a count or part of the replacement?
		// easy enough to assume it's part of the replacement but that's probably not what we meant)
		var re = parameter ? createRE(parameter, true) : lastSubstitutionRE;
		if (re.source == '' && re.replacement == '') re = lastSubstitutionRE;
		if (re.source == '') re.source = lastRE.source;
		this.replace(re, string(re.replacement)).bounds('EOL');
		lastSubstitutionRE = Object.assign({}, re); // clone, so 
	},

	sw: 'tabsize',

	t: 'copy',
	
	tabstop: 'tabsize',

	transcribe: 'copy',

	ts: 'tabsize',
	
	unmap: function (parameter, variant){
		this.dispatch ({type: 'map', detail: { command: 'unmap', variant, lhs: parameter }});
	},

	write: function (parameter, variant){
		// unlike real ex, always writes the whole file.
		writer (this, parameter);
	},

	u: 'undo',

	undo: function (parameter, variant){
		// restores the text only, not any other aspects of state
		this.undo();
	},

	v: 'notglobal',
	
	version: function (parameter, variant){
		this.data.stdout(this.element[exkey]);
	},
	
	wq: 'xit',

	ws: 'wrapscan',
	
	xit: function(parameter, variant){
		writer(this, parameter).finally( ()=> {
			if (variant || this.data.savestatus == 'clean'){
				commands.quit.call(this, parameter, variant);
			}
		});
	},

	yank: function (parameter, variant){
		var match = /^([a-zA-Z]?)\s*(\d*)/.exec(parameter);
		// the regular expression will match anything (all the components are optional), so match is never false
		if (match[2]){
			// a count means we to change the range in e.g., 1,2 y 3 from [1,2] to [2,2+3-1] (3 lines from the end of the range, inclusive)
			var lines = this.lines();
			this.bounds('line', lines[1], lines[1]+Math.max(1, parseInt(match[2]))-1);
		}
		pushRegister(this.text(), match[1]);
	},

	'=': function (){
		let lines = this.lines();
		this.data.stdout ('['+(lines[0] == lines[1] ? lines[0] : lines[0]+', '+lines[1])+']');
	},
	
	'&': 'substitute',

	'~': function (parameter, variant){
		lastSubstitutionRE.source = lastRE.source;
		lastSubstitutionRE.flags = '';
		commands.substitute.call (this, parameter, variant);
	},
	
	'>': function (parameter, variant){
		parameter = parseInt(parameter);
		if (isNaN(parameter) || parameter < 0) parameter = 1;
		this.indent('\t'.repeat(parameter));
	},
	
	'<': function (parameter, variant){
		parameter = parseInt(parameter);
		if (isNaN(parameter) || parameter < 0) parameter = 1;
		this.unindent(parameter, this.data.tabsize);
	},
	
	'!': function (parameter, variant){
		// not a shell escape but a Javascript escape
		Function (parameter).call(this);
	}
};

/*********************** the options *********************************/

// note that this createOption is for ex options, which are bililiteRange options with added ex commands.

function createOption (name, value){
	value = bililiteRange.createOption(name, arguments.length > 1 ? {value: value} : {});
	// now create a command to set the value, based on value's type
	var constructor = value.constructor.name;
	bililiteRange.ex.commands[name] = (createOption[constructor] || createOption.generic)(name);
}

bililiteRange.ex.createOption = createOption;

createOption.generic = function (name){
	return function (parameter, variant){
		if (parameter == '?' || parameter === true || parameter == undefined){
			this.data.stdout (JSON.stringify(this.data[name]));
		}else{
			this.data[name] = parameter;
		}
	}
}

createOption.Boolean = function (name){
	return function (parameter, variant){
		const data = this.data;
		if (parameter=='?'){
			data.stdout (data[name] ? 'on' : 'off');
		}else if (parameter == 'off' || parameter == 'no' || parameter == 'false'){
			data[name] = variant;
		}else if (parameter == 'toggle'){
			data[name] = !data[name];
		}else{
			data[name] = !variant; // variant == false means take it straight and set the option
		}
	};
}

createOption.Number = function (name){
	return function (parameter, variant){
		if (parameter == '?' || parameter === true || !parameter){
			this.data.stdout ('['+this.data[name]+']');
		}else{
			var value = parseInt(parameter);
			if (isNaN(value)) throw new Error('Invalid value for '+name+': '+parameter);
			this.data[name] = value;
		}
	}
}

createOption.RegExp = function (name){
	return function (parameter, variant){
		if (parameter == '?' || parameter === true || !parameter){
			this.data.stdout (JSON.stringify(this.data[name]));
		}else{
			this.data[name] = createRE(parameter);
		}
	}
}

createOption ('autoindent');
createOption ('ignorecase');
createOption ('magic');
createOption ('tabsize');
createOption ('wrapscan');
createOption ('directory', '');
createOption ('file', 'document');

})();

// bililiteRange.evim.js commit ef1c276
'use strict';

(function(){
const editorKey = Symbol(); // marker


bililiteRange.prototype.evim = function (toolbarContainer, statusbar){
	const {data, element} = this;
	if (data[editorKey]) return; // only set this up once
	const rng = this;
	const keymaps = data[editorKey] = new Map(); // keystroke map
	const toolbar = toolbarContainer ? new Toolbar (toolbarContainer, element, rng.executor(), 'extoolbar') : undefined;
	data.stdout = message => Promise.alert(message, statusbar);
	data.stderr = error => Promise.alert(error, statusbar);
	data.confirm = window.confirm.bind(window);
	data.autoindent = true;
	data.global = true;

	this.listen('map', evt =>{
		const {command, variant, lhs, rhs} = evt.detail;
		if (variant && toolbar){
			if (command == 'map'){
				const parsedrhs = parseToolbarCommand(rhs);
				const button = toolbar.button(lhs, parsedrhs.command);
				if (parsedrhs.observe) toolbar.observerElement(button, parsedrhs.observe);
				if (parsedrhs.title) button.setAttribute('title', parsedrhs.title);
			}else if (command == 'unmap'){
				toolbarContainer.querySelector(`button[name=${JSON.stringify(lhs)}]`).remove();
			}
		}else if (!variant){
			// hotkey
			if (command == 'map'){
				rng.dontlisten('keydown', keymaps.get(lhs));
				keymaps.set(lhs,
					keymap( lhs, rng.executor({command: rhs}) )
				);
				rng.listen('keydown', keymaps.get(lhs));
			}else if (command == 'unmap'){
				rng.dontlisten('keydown', keymaps.get(lhs));
				keymaps.delete(lhs);
			}
		}
	});
	
	// A variation on VIM keys, in visual mode, as evim (every command starts with ctrl-o then goes back to insert mode)
	this.listen('keydown', keymap(/ctrl-o (?:ctrl-)?[:;]/, evt => {
		Promise.prompt(':', statusbar).
		 then( command => {
			 // debugger;
			 return command;
		 }).
		 then( rng.executor({defaultaddress: '.'}) ).
		 alert(statusbar). // to display errors
		 finally(() => element.focus());
	}));

	const vimobjects = {
		w: 'word',
		W: 'bigword',
		s: 'sentence',
		p: 'paragraph',
		'[': 'section',
		'"': '"',
		"'": "'",
		'(': '()',
		'<':  [/</, />/]
	};
	const vimverbs = {
		// [ verb, outer, bounds to set ]
		'': ['to', true, 'endbounds'],
		B: ['from', true, 'startbounds'],
		a: ['whole', true, undefined],
		b: ['from', false, 'startbounds'],
		i: ['whole', false, undefined],
		t: ['to', false, 'endbounds'],
	};
		
	const evim1 = RegExp (`ctrl-o ([${Object.keys(vimverbs).join('')}]) ([${Object.keys(vimobjects).join('')}])`);
	const handler1 = keymap(evim1, evt => {
		const match = evim1.exec(evt.keymapSequence);
		const verb = vimverbs[match[1]];
		rng.bounds('selection').bounds(verb[0], vimobjects[match[2]], verb[1]);
		rng.bounds(verb[2]);
		rng.select().scrollIntoView();
	});
	this.listen('keydown', handler1);

	const evim2 = RegExp (`ctrl-o ([${Object.keys(vimobjects).join('')}])`);
	// no verb; means move to next Object
	const handler2 = keymap(evim2, evt => {
		const match = evim2.exec(evt.keymapSequence);
		const verb = vimverbs[''];
		rng.bounds('selection').bounds(verb[0], vimobjects[match[1]], verb[1]);
		rng.bounds(verb[2]);
		rng.select().scrollIntoView();
	});
	this.listen('keydown', handler2);

	const evim3 = /ctrl-o ([fF]) (.)/;
	const handler3 = keymap(evim3, evt => {
		const match = evim3.exec(evt.keymapSequence);
		const flags = match[1] == 'F' ? 'b' : '';
		rng.bounds('selection').bounds('find', match[2], flags);
		rng.select().scrollIntoView();
	});
	this.listen('keydown', handler3);
	
	
		
	this.ex('%%source .exrc');
	this.initUndo(true); // attach the ctrl-z, ctrl-y handlers
};

bililiteRange.ex.createAttributeOption = function (name, [on, off] = [true, false], attrname = name){
	bililiteRange.createOption(name, {monitored: true, value: off});
	if (!bililiteRange.ex.commands[name]) bililiteRange.ex.commands[name] = function (parameter, variant){
		const el = this.element;
		if (parameter=='?'){
			this.data.stdout (Toolbar.getAttribute(el, attrname));
			return;
		}else if (parameter == 'toggle'){
			Toolbar.toggleAttribute (el, attrname, [on, off]);
		}else if (parameter == on || parameter == 'on' || parameter == ''){
			Toolbar.setAttribute (el, attrname, on);
		}else if (parameter == off || parameter == 'off'){
			Toolbar.setAttribute (el, attrname, off);
		}else{
			throw new Error (`${name}: Invalid value '${parameter}'`);
		}
		this.data[name] = Toolbar.getAttribute(el, attrname);
	};
	document.body.addEventListener(`data-${name}`, evt => {
		const targetid = evt.target.getAttribute('id');
		const buttons = document.querySelectorAll(`button[data-command^=${JSON.stringify(name)}]`);
		const button = [...buttons].filter( element => element.parentNode.getAttribute('aria-controls') == targetid )[0];
		button?.setAttribute('aria-pressed', evt.detail == on ? 'true' : 'false');
	});
}

function parseToolbarCommand(string){
	let ret = {};
	try {
		bililiteRange.ex.splitCommands(string, ' ').forEach(function(item){
			var match = /(\w+)=(.+)/.exec(item);
			if (!match) throw new Error();
			ret[match[1]] = bililiteRange.ex.string(match[2]);
		});
	}catch (err){
		ret.command = string;
	}
	if (!ret.command) throw new Error (`map: No command in "${string}"`);
	return ret;
}

})();
