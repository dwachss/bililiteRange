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
	
	// TODO: evim mapping
	const vimobjects = {
		w: 'words',
		W: 'bigwords',
		s: 'sentences',
		p: 'paragraphs',
		'[': 'sections',
		'"': /"/,
		"'": /;/
	}
	const evim = /ctrl-o v ([ai]) ([wWsp'"])/;
	$element.on('keydown', keys: evim, evt => {
		const match = evim.exec(evt.hotkeys);
		const outer = match[1] == 'a';
		const item = vimobjects[match[2]];
		if (item) this.bounds('selection').bounds('whole', item, outer).select();
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