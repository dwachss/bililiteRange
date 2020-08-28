(function($){
const editorkey = Symbol(); // marker

$.fn.ex = function($toolbar, $statusbar){
	return this.each( function() {
		const rng = bililiteRange(this);
		const data = rng.data;
		if (data[editorkey]) return; // only set this up once
		data[editorkey] = bililiteRange.version;
		const $element = $(this);
		const toolbar = new Toolbar ($toolbar[0], this, rng.executor(), 'extoolbar');
		
		[data.stdout, data.stderr] = $statusbar.statusDisplayer();
		data.autoindent = true;
		data.global = true;
		
		$element.on('map', evt => {
			const {command, variant, lhs, rhs} = evt.detail;
			if (variant){
				if (command == 'map'){
					let button;
					const parsedrhs = parseToolbarCommand(rhs);
					const toggle = /(?:set\s+)?([a-zA-Z]+)\s+toggle/.exec(parsedrhs.command);
					if (toggle){
						button = toolbar.toggleButton(lhs, parsedrhs.command);
						button.setAttribute('aria-pressed', data[toggle[1]] ? 'true' : 'false');
					}else{
						button = toolbar.button(lhs, parsedrhs.command);
						if (parsedrhs.observe) toolbar.observerElement(button, parsedrhs.observe);
					}
					if (parsedrhs.title) button.setAttribute('title', parsedrhs.title);
				}else if (command == 'unmap'){
					$(`button[name=${JSON.stringify(lhs)}]`, $toolbar).remove();
				}
			}else{
				// hotkey
				if (command == 'map'){
					$element.off('keydown', {keys: lhs});
					$element.on('keydown', {keys: lhs}, rng.executor({command: rhs, returnvalue: false}));
				}else if (command == 'unmap'){
					$element.off('keydown', {keys: lhs});
				}
			}
		});
		
		$element.on('keydown', {keys: 'ctrl-o :'}, evt => {
			$statusbar.prompt(':').then( rng.executor({defaultaddress: '.'}) ).
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
			rng.bounds('selection').bounds(verb[0], vimobjects[match[2]], verb[1]);
			rng.bounds(verb[2]);
			rng.select().scrollIntoView();
			return false;
		});
		const evim2 = RegExp (`ctrl-o ([${Object.keys(vimobjects).join('')}])`);
		// no verb; means move to next 
		$element.on('keydown', {keys: evim2}, evt => {
			const match = evim2.exec(evt.hotkeys);
			const verb = vimverbs[''];
			rng.bounds('selection').bounds(verb[0], vimobjects[match[1]], verb[1]);
			rng.bounds(verb[2]);
			rng.select().scrollIntoView();
			return false;
		});
		const evim3 = /ctrl-o ([fF]) (.)/;
		$element.on('keydown', {keys: evim3}, evt => {
			const match = evim3.exec(evt.hotkeys);
			const flags = match[1] == 'F' ? 'b' : '';
			rng.bounds('selection').bounds('find', match[2], flags);
			rng.select().scrollIntoView();
			return false;
		});
		
		
		rng.ex('%%source .exrc');
		
	});
};

bililiteRange.ex.createAttributeOption = function (name, states, attrname = name){
	bililiteRange.createOption(name, {monitored: true});
	bililiteRange.ex.commands[name] = function (parameter, variant){
		const el = this.element;
		if (parameter=='?'){
			data.stdout (Toolbar.getAttribute(el, attrname));
		}else if (parameter == 'toggle'){
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

})(jQuery);