// moving toward an implementation of vi for jQuery
// (http://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)

// depends: jquery.js, bililiteRange.js, bililiteRange.util.js, bililiteRange.ex.js, jquery.keymap.js

(function($){

function executeCommand (rng, command, defaultAddress){
	// returns a function that will run command (if not defined, then will run whatever command is passed in when executed)
	return function (text){
		rng.bounds('selection').ex(command || text, defaultAddress).scrollIntoView();
		return rng.exMessage;
	};
}

$.fn.exmap = function(opts, defaults){
	var self = this;
	if ($.isArray(opts)){
		opts.forEach(function(opt) {self.exmap(opt, defaults)});
		return self;
	}
	opts = $.extend({}, opts, defaults);
	if (!opts.name && typeof opts.command == 'string') opts.name = opts.command;
	if (!opts.name && opts.monitor) opts.name = opts.monitor;
	if (!opts.name && opts.keys) opts.name = opts.prefix+opts.keys;
	if (!opts.name) opts.name = opts.prefix+Math.random().toString(); // need something!
	if (!opts.command && opts.monitor) opts.command = 'toggle '+JSON.stringify(opts.monitor);
	if (!opts.command) opts.command = 'sendkeys '+JSON.stringify(opts.name);
	if ($.isFunction(opts.command)){
		var commandName = bililiteRange.ex.toID(opts.name);
		bililiteRange.ex.commands[commandName] = opts.command;
		opts.command = commandName;
	}
	function run(){
		var ret; // if any targeted element is in the right state,  prevent default.
		self.each(function(){
			var rng = bililiteRange(this), mode = rng.exState().vimode;
			if (opts.mode && opts.mode != mode) return;
			$($.data(this, 'vi.statusbar')).status({
				run: executeCommand(rng, opts.command, '%%')
			});
			ret = false;
		});
		return ret;
	}
	if (opts.buttonContainer){
		var button = $('button[name='+JSON.stringify(opts.name)+']', opts.buttonContainer);
		if (button.length == 0) button = $('<button>').appendTo(opts.buttonContainer);
		button.attr({
			name: opts.name,
			'class': opts.name.replace(/~/g, '-'),
			title: opts.title
		}).click(run);
	}
	if (opts.keys){
		self.on('keydown', {keys: opts.keys}, function(){
			if (button){
			  // simulate a click
				button.addClass('highlight')
				setTimeout(function(){ button.removeClass('highlight') }, 400);
			}
			return run(opts.variant);
		});
	}
	if (opts.monitor) {
		self.each(function(){
			bililiteRange(this).exState().monitor(opts.monitor);
		});
		if (!opts.monitoringFunction) opts.monitoringFunction = function(option, value){
			// assume we're looking at a binary option
			this.removeClass('on off').addClass(value ? 'on' : 'off');
		}
		self.on('exstate', function(evt){
			if (evt.originalEvent) evt = evt.originalEvent; // jQuery being helpful!
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
		addviCommands (this, vimodeCommands, false, 'vi~');
		addviCommands (this, insertmodeCommands, true, 'insert~');
		addNumbers(this);
	}).on('excommand', function (evt){
		if (evt.originalEvent) evt = evt.originalEvent; // jQuery creates a new event and doesn't copy all the fields
		var state = evt.range.exState();
		if (state.count){
			--state.count;
			if (state.count) evt.range.ex(evt.command, '%%');
		}
		evt.range.select(); // set the saved selection to the new bounds
	});
}


$.extend (bililiteRange.ex.commands, {
  console: function (parameter, variant){
		console.log(executeCommand(this)(parameter));
	},
	map: function (parameter, variant){
		// The last word (either in a string or not containing spaces) is the replacement; the rest of
		// the string at the beginning are the mapped key(s)
		var rng = this, state = this.exState();
		var match = /^(.+?)([^"\s]+|"(?:[^"]|\\")+")$/.exec(parameter);
		if (!match) throw {message: 'Bad syntax in map: '+parameter};
		var keys = match[1].trim();
		var command = bililiteRange.ex.string(match[2]);
		// TODO: remove any old key handlers
		$(rng.element()).exmap({
			keys: keys,
			command: command,
			mode: variant ? 'INSERT' : 'VISUAL'
		});
	},
	select: function (parameter, variant){
		this.bounds(parameter).select();
	},
	sendkeys: function (parameter, variant){
		$(this.element()).sendkeys(parameter);
		this.bounds('selection');
	},
	vi: function (parameter, variant){
		this.exState().vimode = parameter || 'VISUAL';
	}
});

var vimodeCommands = {
	':' : function (){
	  var el = this.element();
		var statusbar = $.data(this.element(), 'vi.statusbar');
		$(statusbar).status({
			prompt: ':',
			run: executeCommand(this),
			returnPromise: true
		}).then( // make sure we return focus to the text! It would be nice to have a finally method
			function(e) {$(el).focus()},
			function(e) {$(el).focus()}
		);
	},
	'{esc}' : "vi",
	a: "select endbounds | vi INSERT",
	h: "sendkeys {leftarrow}",
	i: "select startbounds | vi INSERT",
	l: "sendkeys {rightarrow}",
	o: ".a | vi INSERT"
},
insertmodeCommands = {
	'{esc}' :"vi"
}

function addviCommands(el, commands, variant, prefix){
	for (var key in commands){
		$(el).exmap({
			keys: key,
			command: commands[key],
			mode: variant ? 'INSERT' : 'VISUAL',
			prefix: prefix
		});
	}
}

function addNumbers(el){
	var rng = bililiteRange(el);
	"0123456789".split('').forEach(function(key, i){
		$(rng.element()).on('keydown', {keys: key}, function (){
			var state = rng.exState();
			if (state.vimode == 'INSERT') return;
			if (i == 0 && state.count == 0) return; // 0 that is not part of a number has a different meaning
			state.count = (state.count || 0) * 10 + i; 
			return false;
		});
	});
}

function vicommands(el){
	var rng = bililiteRange(el), state = rng.state();
	state.privatize('count');
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
			var rng = this, state = this.exState();
			var match = /^(.+?)([^"\s]+|"(?:[^"]|\\")+")$/.exec(parameter);
			if (!match) throw {message: 'Bad syntax in map: '+parameter};
			var keys = match[1].trim();
			var command = bililiteRange.ex.string(match[2]);
			// TODO: remove any old key handlers
			$(rng.element()).exmap({
				keys: keys,
				command: command,
				mode: variant ? 'INSERT' : 'VISUAL'
			});
		}
	},{
		name: 'select',
		command: function (parameter, variant){
			this.bounds(parameter).select();
		}
	},{
		name: 'sendkeys',
		command: function (parameter, variant){
			$(this.element()).sendkeys(parameter);
			this.bounds('selection');
		}
	},{
		name: 'vi',
		keys: '{esc}',
		command: function (parameter, variant){
			this.exState().vimode = parameter || 'VISUAL';
		}
	},{
		keys: ':',
		mode: 'VISUAL',
		command: function (){
			var el = this.element();
			var statusbar = $.data(this.element(), 'vi.statusbar');
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
		command: "sendkeys {leftarrow}"
	},{
		keys: 'i',
		mode: 'VISUAL',
		command: "select startbounds | vi INSERT"
	},{
		keys: 'l'
		mode: 'VISUAL',
		command: "sendkeys {rightarrow}"
	},{
		keys: 'o',
		mode: 'VISUAL',
		command: ".a | vi INSERT"
	},
	},{
		keys: '0',
		mode: 'VISUAL',
		command: function(){
			var state = this.exState()
			if (state.count == 0){
				this.bounds('BOL');
			}else{
				state.count *= 10;
			}
		}
	]);
	"123456789".split('').forEach(function(key, i){
		$(el).exmap({
			keys: key,
			mode: 'VISUAL',
			command: function(){
				state.count = (state.count || 0) * 10 + i;
			}
		});
	});
}


})(jQuery);