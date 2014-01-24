// moving toward an implementation of vi for jQuery
// (http://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)

// depends: jquery.js, bililiteRange.js, bililiteRange.util.js, bililiteRange.ex.js, jquery.keymap.js

(function($){

$.event.fixHooks.exstate = { props:['detail'] }; // make sure it's copied over

function executeCommand (rng, command, defaultAddress){
	// returns a function that will run command (if not defined, then will run whatever command is passed in when executed)
	return function (text){
		rng.bounds('selection').ex(command || text, defaultAddress).select().scrollIntoView();
		rng.exState().count = 0; // reset
		rng.exState().register = undefined;
		return rng.exMessage;
	};
}

$.fn.exmap = function(opts, defaults){
	if ($.isArray(opts)){
		var self = this;
		opts.forEach(function(opt) {self.exmap(opt, defaults)});
		return self;
	}
	opts = $.extend({}, opts, defaults);
	if (!opts.name && typeof opts.command == 'string') opts.name = opts.command;
	if (!opts.name && opts.monitor) opts.name = opts.monitor;
	if (!opts.name && opts.keys) opts.name = opts.keys;
	if (!opts.name) opts.name = opts.prefix+Math.random().toString(); // need something!
	if (!opts.command && opts.monitor) opts.command = 'toggle '+JSON.stringify(opts.monitor);
	if (!opts.command) opts.command = 'sendkeys '+JSON.stringify(opts.name);
	if ($.isFunction(opts.command)){
		var commandName = bililiteRange.ex.toID(opts.name);
		bililiteRange.ex.commands[commandName] = opts.command;
		opts.command = commandName;
	}
	function run(event){
		var rng = bililiteRange(event.target), mode = rng.exState().vimode;
		if (opts.mode && opts.mode != mode) return;
		$($.data(event.target, 'vi.statusbar')).status({
			run: executeCommand(rng, opts.command, '%%')
		});
		event.preventDefault();
	}
	if (opts.buttonContainer){
		var button = $('button[name='+JSON.stringify(opts.name)+']', opts.buttonContainer);
		if (button.length == 0) button = $('<button>').appendTo(opts.buttonContainer);
		button.attr({
			name: opts.name,
			'class': opts.name.replace(/~/g,'-'),
			title: opts.title
		}).click(run);
	}
	if (opts.keys){
		this.on('keydown', {keys: opts.keys}, function(event){
			if (button){
			  // simulate a click
				button.addClass('highlight')
				setTimeout(function(){ button.removeClass('highlight') }, 400);
			}
			run(event);
		});
	}
	if (opts.monitor) {
		this.each(function(){
			bililiteRange(this).exState().monitor(opts.monitor);
		});
		if (!opts.monitoringFunction) opts.monitoringFunction = function(option, value){
			// assume we're looking at a binary option
			this.removeClass('on off').addClass(value ? 'on' : 'off');
		}
		this.on('exstate', function(evt){
			if (evt.detail.option != opts.monitor) return;
			opts.monitoringFunction.call(button, evt.detail.option, evt.detail.value);			
		})
	}
	return this;
};

$.fn.vi = function(statusbar){
	return this.each(function(){
		bililiteRange(this).exState().vimode = 'INSERT'; // unlike real vi, start in insert mode since that is more "natural" for a GUI
		$(this).data('vi.statusbar', statusbar);
		vicommands(this);
	});
}

function vicommands(el){
	var state = bililiteRange(el).exState();

	state.privatize('count'); // a number preceding vi commands
	state.privatize('oldtext'); // for repeated insertions, this is the original text to compare to
	state.privatize('repeatcount'); // this is the number of times to repeat insertions
	state.count = 0;
	$(el).on('keydown', {keys: /\d/}, function (evt){
		if (state.vimode != 'VISUAL') return;
		if (state.count == 0 && evt.hotkeys == '0') return; // has a different meaning
		state.count = state.count * 10 + parseInt(evt.hotkeys);
		evt.preventDefault();
		evt.stopImmediatePropagation();
	});
	
	state.privatize('register'); // a register letter (with "a) preceding vi commands
	state.register = undefined;
	$(el).on('keydown', {keys: /" [A-Za-z]/}, function (evt){
		if (state.vimode != 'VISUAL') return;
		state.register = evt.hotkeys.charAt(2);
		evt.preventDefault();
		evt.stopImmediatePropagation();
	});

	$(el).exmap([
	{
		name: 'console',
		command: function (parameter, variant){
			console.log(executeCommand(this)(parameter));
		}
	},{
		name: 'map',
		command: function (parameter, variant){
			// The last word (either in a string or not containing spaces) is the replacement; the rest of
			// the string at the beginning are the mapped key(s)
			var match = /^(.+?)([^"\s]+|"(?:[^"]|\\")+")$/.exec(parameter);
			if (!match) throw {message: 'Bad syntax in map: '+parameter};
			var keys = match[1].trim();
			var command = bililiteRange.ex.string(match[2]);
			// TODO: remove any old key handlers
			$(el).exmap({
				keys: keys,
				command: command,
				mode: variant ? 'INSERT' : 'VISUAL'
			});
		}
	},{
		name: 'repeat',
		command: function (parameter, variant){
			for (var i = state.count || 1; i > 0; --i){
				var result = executeCommand(this)(parameter);
			}
			return result;
		}
	},{
		name: 'select',
		command: function (parameter, variant){
			this.bounds(parameter).select();
		}
	},{
		name: 'sendkeys',
		command: function (parameter, variant){
			$(el).sendkeys(parameter);
			this.bounds('selection');
		}
	},{
		name: 'vi',
		keys: '{esc}',
		command: function (parameter, variant){
			parameter = parameter || 'VISUAL';
			// an insertion with a count just repeat the insertion when we return to visual mode
			if (parameter == 'INSERT'){
				state.repeatcount = Math.max(state.count - 1, 0); // -1 since we've done one insertion already
				state.oldtext = this.all();
			}else if (parameter == 'VISUAL' && state.repeatcount){
				var text = bililiteRange.diff(state.oldtext, this.all()).data;
				for (var i = state.repeatcount, ret = ''; i > 0; --i) ret += text;
				this.bounds('endbounds').text(ret, 'end');
				state.repeatcount = 0;
			}
			state.vimode = parameter;
		}
	},{
		keys: ':',
		mode: 'VISUAL',
		command: function (){
			var statusbar = $.data(el, 'vi.statusbar');
			$(statusbar).status({
				prompt: ':',
				run: executeCommand(this),
				returnPromise: true
			}).then( // make sure we return focus to the text! It would be nice to have a finally method
				function(e) {$(el).focus()},
				function(e) {$(el).focus()}
			);
		}
	},{
		keys: 'a',
		mode: 'VISUAL',
		command : "select endbounds | vi INSERT"
	},{
		keys: 'h',
		mode: 'VISUAL',
		command: "repeat sendkeys {leftarrow}"
	},{
		keys: 'i',
		mode: 'VISUAL',
		command: "select startbounds | vi INSERT"
	},{
		keys: 'l',
		mode: 'VISUAL',
		command: "repeat sendkeys {rightarrow}"
	},{
		keys: 'o',
		mode: 'VISUAL',
		command: ".a | vi INSERT"
	},{
		keys: '0',
		mode: 'VISUAL',
		command: "select BOL" // if part of a number, should have been handled above
	}
	]);
}


})(jQuery);