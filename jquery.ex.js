(function(){
const editorkey = Symbol(); // marker

bililiteRange.prototype.exEditor = function($toolbar, $statusbar){
	if (this.data[editorkey]) return; // only set this up once
	this.data[editorkey] = bililiteRange.version;
	const $element = $(this.element);
	const toolbar = new Toolbar ($toolbar[0], this.element, this.executor(), 'extoolbar');
	
	[this.data.stdout, this.data.stderr] = $statusbar.statusDisplayer();
	this.data.autoindent = true;
	this.data.global = true;
	
	$element.on('map', evt => {
		const {command, variant, lhs, rhs} = evt.detail;
		if (variant){
			if (command == 'map'){
				let button;
				const parsedrhs = parseToolbarCommand(rhs);
				const toggle = /(?:set\s+)?([a-zA-Z]+)\s+toggle/.exec(parsedrhs.command);
				if (toggle){
					button = toolbar.toggleButton(lhs, parsedrhs.command);
					button.setAttribute('aria-pressed', this.data[toggle[1]] ? 'true' : 'false');
				}else{
					button = toolbar.button(lhs, parsedrhs.command);
					if (parsedrhs.observe) toolbar.observerElement(button, 'data-'+parsedrhs.observe);
				}
				if (parsedrhs.title) button.setAttribute('title', parsedrhs.title);
			}else if (command == 'unmap'){
				$(`button[name=${JSON.stringify(lhs)}]`, $toolbar).remove();
			}
		}else{
			// hotkey
			if (command == 'map'){
				$element.off('keydown', {keys: lhs});
				$element.on('keydown', {keys: lhs}, this.executor(rhs, false));
			}else if (command == 'unmap'){
				$element.off('keydown', {keys: lhs});
			}
		}
	});
	
	$element.on('keydown', {keys: 'ctrl-o :'}, evt => {
		$statusbar.prompt(':').then( this.executor() ).
		 then(...$statusbar.statusDisplayer()).
		 finally(() => $element.focus());
		return false;
	});
	
	// A variation on VIM keys, in evim mode (starts with ctrl-o)
	const vimobjects = {
		w: 'word',
		W: 'bigword',
		s: 'sentence',
		p: 'paragraph',
		'[': 'section',
		'"': '"',
		"'": "'",
		'(': '()'
	}
	const vimverbs = {
		// [ verb, outer, bounds to set ]
		'': ['to', true, 'endbounds'],
		B: ['from', true, 'startbounds'],
		a: ['whole', true, undefined],
		b: ['from', false, 'startbounds'],
		i: ['whole', false, undefined],
		t: ['to', false, 'endbounds'],
	};
	
	const evim = RegExp (`ctrl-o ([${Object.keys(vimverbs).join('')}]) ([${Object.keys(vimobjects).join('')}])`);
	$element.on('keydown', {keys: evim}, evt => {
		const match = evim.exec(evt.hotkeys);
		const verb = vimverbs[match[1]];
		this.bounds('selection').bounds(verb[0], vimobjects[match[2]], verb[1]);
		this.bounds(verb[2]);
		this.select();
		return false;
	});
	const evim2 = RegExp (`ctrl-o ([${Object.keys(vimobjects).join('')}])`);
	// no verb; means move to next 
	$element.on('keydown', {keys: evim2}, evt => {
		const match = evim2.exec(evt.hotkeys);
		const verb = vimverbs[''];
		this.bounds('selection').bounds(verb[0], vimobjects[match[1]], verb[1]);
		this.bounds(verb[2]);
		this.select();
		return false;
	});
	const evim3 = /ctrl-o ([fF]) (.)/;
	$element.on('keydown', {keys: evim3}, evt => {
		const match = evim3.exec(evt.hotkeys);
		const flags = match[1] == 'F' ? 'b' : '';
		this.bounds('selection').bounds('find', match[2], flags);
		this.select();
		return false;
	});
	
	
	this.ex('%%source .exrc');
	
	return this;
};

bililiteRange.ex.createAttributeOption = function (name, states, attrname = name){
	bililiteRange.createOption(name, {monitored: true});
	bililiteRange.ex.commands[name] = function (parameter, variant){
		const el = this.element;
		if (parameter=='?'){
			data.stdout (Toolbar.getAttribute(el, attrname));
		}else if (parameter == 'toggle'){
			console.log(`setting ${attrname} to ${states[0]} or ${states[1]}`); 
			Toolbar.toggleAttribute (el, attrname, states);
		}else{
			Toolbar.setAttribute (el, attrname, parameter);
		}
	};
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