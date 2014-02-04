// moving toward an implementation of vi for jQuery
// (http://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)

// depends:  bililiteRange.ex.js and all its depends,  jquery.keymap.js, jquery.savemonitor.js, jquery.status.js, jquery.livesearch.js
// documentation: to be created
// Version 0.9

// Copyright (c) 2014 Daniel Wachsstock
// MIT license:
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

(function($){

$.viClass = $.viClass || 'vi';
$.fn.vi = function(status, toolbar){
	var self = this;
	$(toolbar).click (function(evt){
		$(evt.target).trigger('vi-click', [self]);
		return false;
	});
	this.each(function(){
		bililiteRange(this).undo(0); // initialize the undo handler (ex does this but we haven't called ex yet)
		// track saving and writing
		var state = bililiteRange(this).exState();
		var monitor = state.monitor = $(this).savemonitor();
		state['save~state'] = monitor.state();
		monitor.on($.savemonitor.states, function(evt){
			state['save~state'] = evt.type;
		});
	});
	return this.addClass($.viClass).data('vi.status', $(status));
}


// create special events that let us check for vi-specific elements and modes

$.event.fixHooks['exstate'] = { props:['detail'] }; // make sure it's copied over
$.event.fixHooks['vi-exstate'] = { props:['detail'] };
$.event.special['vi-exstate'] = {
	delegateType: 'exstate',
	bindType: 'exstate',
	handle: function(evt){
		if (!$(evt.target).hasClass($.viClass)) return;
		var desiredoption = evt.data && evt.data.option;
		if (desiredoption && evt.detail.option != desiredoption) return;
		evt.rng = bililiteRange(evt.target);
		return evt.handleObj.handler.apply(this, arguments);
	}
}

$.event.special['vi-keydown'] = {
	delegateType: 'keydown',
	bindType: 'keydown',
	handle: function(evt){
		if (!$(evt.target).hasClass($.viClass)) return;
		var mode = bililiteRange(evt.target).exState().vimode;
		var desiredmode = evt.data && evt.data.mode;
		if (desiredmode && mode != desiredmode) return;
		evt.rng = bililiteRange(evt.target);
		return evt.handleObj.handler.apply(this, arguments);
	}
};

$.event.special['vi-click'] = {
	handle: function(evt, target){
		var self = this, args = arguments;
		target.each(function(){
			evt.rng = bililiteRange(this);
			var mode = evt.rng.exState().vimode;
			var desiredmode = evt.data && evt.data.mode;
			if (desiredmode && mode != desiredmode) return;
			return evt.handleObj.handler.apply(self, args);
		});
	}
};

function executeCommand (rng, command, defaultAddress){
	// returns a function that will run command (if not defined, then will run whatever command is passed in when executed)
	return function (text){
		rng.bounds('selection').ex(command || text, defaultAddress).select().scrollIntoView();
		rng.exState().count = 0; // reset
		rng.exState().register = undefined;
		return rng.exMessage;
	};
}

var body = $('body');
$.exmap = function(opts, defaults){
	if ($.isArray(opts)){
		var self = this;
		opts.forEach(function(opt) {self.exmap(opt, defaults)});
		return self;
	}
	opts = $.extend({}, opts, defaults);
	if (!opts.name && typeof opts.command == 'string') opts.name = opts.command;
	if (!opts.name && opts.monitor) opts.name = opts.monitor;
	if (!opts.name && opts.keys) opts.name = opts.keys;
	if (!opts.name) opts.name = Math.random().toString(); // need something!
	if (!opts.command && opts.monitor) opts.command = opts.monitor+" toggle";
	if (!opts.command) opts.command = 'sendkeys '+JSON.stringify(opts.name);
	if ($.isFunction(opts.command)){
		var commandName = bililiteRange.ex.toID(opts.name);
		bililiteRange.ex.commands[commandName] = opts.command;
		opts.command = opts.monitor ? opts.monitor+" toggle" : commandName;
	}
	function run(event){
		$($.data(event.rng.element(), 'vi.status')).status({
			run: executeCommand(event.rng, opts.command, '%%')
		});
		event.preventDefault();
	}
	var button = $(); // make sure it exists
	if (opts.buttonContainer){
		button = $('button[name='+JSON.stringify(opts.name)+']', opts.buttonContainer);
		if (button.length == 0) button = $('<button>').appendTo(opts.buttonContainer);
		button.attr({
			name: opts.name,
			'class': opts.name.replace(/~/g,'-'),
			title: opts.title
		}).on('vi-click', {mode: opts.mode}, run);
	}
	if (opts.keys){
		body.on('vi-keydown', {keys: opts.keys, mode: opts.mode}, function(event){
			if (button){
			  // simulate a click
				button.addClass('highlight')
				setTimeout(function(){ button.removeClass('highlight') }, 400);
			}
			run(event);
		});
	}
	if (opts.monitor) {
		bililiteRange.ex.monitor(opts.monitor);
		if (!opts.monitoringFunction) opts.monitoringFunction = function(option, value){
			// assume we're looking at a binary option
			this.removeClass('on off').addClass(value ? 'on' : 'off');
		}
		body.on('vi-exstate', {option: opts.monitor}, function(evt){
			opts.monitoringFunction.call(button, evt.detail.option, evt.detail.value);			
		})
	}
};

/*------------ Set up default options ------------ */
// unlike real vi, start in insert mode since that is more "natural" for a GUI
bililiteRange.ex.createOption('vimode', 'INSERT');
bililiteRange.ex.privatize('vimode');

// RE's for searching
bililiteRange.ex.createOption('word', "^|$|\\W+|\\w+");
bililiteRange.ex.createOption('bigword', "^|$|\\s+|\\S+");

// writing files. Assumes POSTing with {buffer: text-to-be-saved, file: filename}
// use mockjax to do something else.
bililiteRange.ex.privatize('monitor');
bililiteRange.ex.privatize('save~state');
bililiteRange.ex.monitor('save~state');

// a series of digits means a number of times to repeat a command
// 'count' is that number; some commands use that directly but text-entry commands can only repeat after the text is entered.
// so the count is saved in 'repeatcount' (since 'count' is reset after every command), and the present text is saved.
// When we return to visual mode, we see how that text has changed and insert the new text (at whereever the insertion point is!) 
// 'repeatcount'-1 times ( since it's already been inserted once)
bililiteRange.ex.createOption('count', 0);
bililiteRange.ex.privatize('count'); // a number preceding vi commands
bililiteRange.ex.privatize('oldtext'); // for repeated insertions, this is the original text to compare to
bililiteRange.ex.privatize('repeatcount'); // this is the number of times to repeat insertions
body.on('vi-keydown', {keys: /\d/, mode: 'VISUAL'}, function (evt){
	var state = bililiteRange(evt.target).exState();
	if (state.count == 0 && evt.hotkeys == '0') return; // 0 has a different meaning if not part of a number
	state.count = state.count * 10 + parseInt(evt.hotkeys);
	evt.preventDefault();
	evt.stopImmediatePropagation();
});

// a double quote followed by a letter means store the result of the next command (if it removes text) into that register
bililiteRange.ex.privatize('register');
body.on('vi-keydown', {keys: /" [A-Za-z]/, mode: 'VISUAL'}, function (evt){
	state.register = evt.hotkeys.charAt(2);
	evt.preventDefault();
	evt.stopImmediatePropagation();
});

/*------------ Set up generic commands ------------ */
$.exmap([
{
	name: 'bigword',
	command: bililiteRange.ex.stringOption('bigword')
},{
	name: 'console',
	command: function (parameter, variant){
		console.log(executeCommand(this)(parameter));
	}
},{
	name: 'directory', // used as the $.post url for saving
	command: bililiteRange.ex.stringOption('directory')
},{
	name: 'file',
	command: bililiteRange.ex.stringOption('file')
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
		$.exmap({
			keys: keys,
			command: command,
			mode: variant ? 'INSERT' : 'VISUAL'
		});
	}
},{
	name: 'repeat',
	command: function (parameter, variant){
		var state = this.exState();
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
		$(this.element()).sendkeys(parameter);
		this.bounds('selection');
	}
},{
	name: 'vi',
	keys: '{esc}',
	command: function (parameter, variant){
		var state = this.exState();
		parameter = parameter || 'VISUAL';
		// an insertion with a count means repeat the insertion when we return to visual mode
		if (parameter == 'INSERT'){
			state.repeatcount = Math.max(state.count - 1, 0); // -1 since we've done one insertion already
			state.oldtext = this.all();
		}else if (parameter == 'VISUAL' && state.repeatcount){
			var text = bililiteRange.diff(state.oldtext, this.all()).data;
			this.bounds('endbounds').text(text.repeat(state.repeatcount), 'end');
			state.repeatcount = 0;
		}
		state.vimode = parameter;
	}
},{
	name: 'word',
	command: bililiteRange.ex.stringOption('word')
},{
	name: 'write',
	command: function(parameter, variant){
		var rng = this, state = this.exState(), el = this.element();
		if (parameter) state.file = parameter;
		state.monitor.clean($.data(el, 'vi.status').status({
			run: function() { return $.post(state.directory, {
				buffer: rng.all(),
				file: state.file
			}).then(
				function() { return 'Saved' },
				function() { return new Error('Not saved') }
			)},
			returnPromise: true
		}));
	}
},{
	keys: '^z', // not really part of vi, but too ingrained in my fingers
	command: 'undo'
},{
	keys: '^y',
	command: 'redo'
}
]);

/*------------ Set up VISUAL mode commands ------------ */
$.exmap([
{
	keys: ':',
	command: function (){
		var el = this.element();
		$.data(el, 'vi.status').status({
			prompt: ':',
			run: executeCommand(this),
			returnPromise: true
		}).then( // make sure we return focus to the text! It would be nice to have a finally method
			function(e) {el.focus()},
			function(e) {el.focus()}
		);
	}
},{
	keys: 'a',
	command : "select endbounds | vi INSERT"
},{
	keys: 'b', // end of previous word
	command: function(){
		var state = this.exState();
		for (var i = state.count || 1; i > 0; --i){
			this.findBack(new RegExp(state.word), true);
		}
		this.bounds('endbounds');
	}
},{
	keys: 'B', // end of previous bigword
	command: function(){
		var state = this.exState();
		for (var i = state.count || 1; i > 0; --i){
			this.findBack(new RegExp(state.bigword), true);
		}
		this.bounds('endbounds');
	}
},{
	keys: 'e', // end of next word
	command: function(){
		var state = this.exState();
		for (var i = state.count || 1; i > 0; --i){
			this.find(new RegExp(state.word), true);
		}
		this.bounds('endbounds');
	}
},{
	keys: 'E', // end of next bigword
	command: function(){
		var state = this.exState();
		for (var i = state.count || 1; i > 0; --i){
			this.find(new RegExp(state.bigword), true);
		}
		this.bounds('endbounds');
	}
},{
	keys: 'h',
	command: "repeat sendkeys {leftarrow}"
},{
	keys: 'i',
	command: "select startbounds | vi INSERT"
},{
	keys: 'l',
	command: "repeat sendkeys {rightarrow}"
},{
	keys: 'o',
	command: ".a | vi INSERT"
},{
	keys: '0',
	command: "select BOL" // if part of a number, should have been handled above
},{
	keys: '$',
	command: 'select EOL'
},{
	keys: '^',
	command: function(){
		this.bounds('BOL').find(/\S/).bounds('startbounds');
	}
},{
	keys: '>',
	command: 'repeat >'
},{
	keys: '<',
	command: 'repeat <'
}
], {mode: 'VISUAL'});

})(jQuery);