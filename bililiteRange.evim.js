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