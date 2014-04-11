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
$.fn.vi = function(status, toolbar, exrc){
	var self = this;
	$(toolbar).click (function(evt){
		$(evt.target).trigger('vi-click', [self]);
		return false;
	});
	this.each(function(){
		var rng = bililiteRange(this);
		rng.undo(0); // initialize the undo handler (ex does this but we haven't called ex yet)
		// track saving and writing
		var state = rng.data();
		var monitor = state.monitor = $(this).savemonitor();
		state['save~state'] = monitor.state();
		monitor.on($.savemonitor.states, function(evt){
			state['save~state'] = evt.type;
		});
		if (exrc) $.get(exrc).then(function(commands){
			// note that this is done asynchronously, so the user may be editing before this gets executed
			rng.ex(commands);
		});
	});
	return this.addClass($.viClass).data('vi.status', $(status)).data('vi.toolbar', $(toolbar));
}


// create special events that let us check for vi-specific elements and modes

$.event.fixHooks['bililiteRangeData'] = { props:['detail'] }; // make sure it's copied over
$.event.fixHooks['vi-data'] = { props:['detail'] };
$.event.special['vi-data'] = {
	delegateType: 'bililiteRangeData',
	bindType: 'bililiteRangeData',
	handle: function(evt){
		if (!$(evt.target).hasClass($.viClass)) return;
		var desiredoption = evt.data && evt.data.name;
		if (desiredoption && evt.detail.name != desiredoption) return;
		evt.rng = bililiteRange(evt.target);
		return evt.handleObj.handler.apply(this, arguments);
	}
}

$.event.special['vi-keydown'] = {
	delegateType: 'keydown',
	bindType: 'keydown',
	handle: function(evt){
		if (!$(evt.target).hasClass($.viClass)) return;
		var mode = bililiteRange(evt.target).data().vimode;
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
			var mode = evt.rng.data().vimode;
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
		rng.data().count = 0; // reset
		rng.data().register = undefined;
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
	if (!opts.command && bililiteRange.ex.commands[opts.name]) opts.command = opts.name;
	if (!opts.command) opts.command = 'sendkeys '+JSON.stringify(opts.name);
	if ($.isFunction(opts.command)){
		var commandName = bililiteRange.ex.toID(opts.name);
		bililiteRange.ex.commands[commandName] = opts.command;
		opts.command = commandName;
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
		// TODO: remove the monitoring function; make a logical default
		if (!opts.monitoringFunction) opts.monitoringFunction = function(option, value){
			// assume we're looking at a binary option
			this.removeClass('on off').addClass(value ? 'on' : 'off');
		}
		body.on('vi-data', {name: opts.monitor}, function(evt){
			opts.monitoringFunction.call(button, evt.detail.option, evt.detail.value);			
		})
	}
};

/*------------ Set up default options ------------ */
// unlike real vi, start in insert mode since that is more "natural" for a GUI
bililiteRange.data('vimode', {
	value: 'INSERT',
	enumerable: false
});

// RE's for searching
bililiteRange.ex.createOption('word', /^|$|\W+|\w+/);
bililiteRange.ex.createOption('bigword', /^|$|\s+|\S+/);

// for saving
bililiteRange.ex.createOption('directory', ''); // used as the $.post url for saving
bililiteRange.ex.createOption('file', 'Untitled');

// writing files. Assumes POSTing with {buffer: text-to-be-saved, file: filename}
// use mockjax to do something else.
bililiteRange.data('monitor', {
	enumerable: false
});
bililiteRange.data('save~state', {
	value: 'clean',
	enumerable: false,
	monitored: true
});

// a series of digits means a number of times to repeat a command
// 'count' is that number; some commands use that directly but text-entry commands can only repeat after the text is entered.
// so the count is saved in 'repeatcount' (since 'count' is reset after every command), and the present text is saved.
// When we return to visual mode, we see how that text has changed and insert the new text (at whereever the insertion point is!) 
// 'repeatcount'-1 times ( since it's already been inserted once)
bililiteRange.data('count', { // a number preceding vi commands
	value: 0,
	enumerable: false
});
bililiteRange.data('oldtext', { // for repeated insertions, this is the original text to compare to
	enumerable: false
});
bililiteRange.data('repeatcount', { // this is the number of times to repeat insertions
	value: 0,
	enumerable: false
});
body.on('vi-keydown', {keys: /\d/, mode: 'VISUAL'}, function (evt){
	var state = bililiteRange(evt.target).data();
	if (state.count == 0 && evt.hotkeys == '0') return; // 0 has a different meaning if not part of a number
	state.count = state.count * 10 + parseInt(evt.hotkeys);
	evt.preventDefault();
	evt.stopImmediatePropagation();
});

// a double quote followed by a letter means store the result of the next command (if it removes text) into that register
bililiteRange.data('register', {enumerable: false});
body.on('vi-keydown', {keys: /" [A-Za-z]/, mode: 'VISUAL'}, function (evt){
	evt.range.data().register = evt.hotkeys.charAt(2);
	evt.preventDefault();
	evt.stopImmediatePropagation();
});

// track tab size
bililiteRange.data ('tabSize', {monitored: true});
body.on('vi-data', {name: 'tabSize'}, function (evt){
	var style = evt.rng.element().style;
	style.tabSize =
	style.OTabSize =
	style.MozTabSize = evt.detail.value; // for browsers that support this.
});

/*------------ Set up generic commands ------------ */

$.exmap([
{
	name: 'button',
	command: function (parameter, variant){
		var exmapparam = { buttonContainer: $.data(this.element(), 'vi.toolbar') };
		if (variant){
			// use the complex form
			bililiteRange.ex.splitCommands(parameter, ' ').forEach(function(item){
				var match = /(\w+)=(.+)/.exec(item);
				if (!match) throw new Error('Bad syntax in button: '+item);
				exmapparam[match[1]] = bililiteRange.ex.string(match[2]);
			});
		}else{
			exmapparam.name = parameter;
		}
		// TODO: assign keys
		console.log($.data(this.element(), 'vi.toolbar').find('button').length);
		console.log(exmapparam);
		$.exmap(exmapparam);
	}
},{
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
		$.exmap({
			keys: keys,
			command: command,
			mode: variant ? 'INSERT' : 'VISUAL'
		});
	}
},{
	name: 'repeat',
	command: function (parameter, variant){
		var state = this.data();
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
		console.log('sendkeys', parameter);
		this.sendkeys(parameter).element().focus();
	}
},{
	name: 'vi',
	keys: '{esc}',
	command: function (parameter, variant){
		var state = this.data();
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
	name: 'write',
	command: function(parameter, variant){
		var rng = this, state = this.data(), el = this.element();
		if (parameter) state.file = parameter;
		state.monitor.clean($.data(el, 'vi.status').status({
			run: function() { return $.post(state.directory, {
				buffer: rng.all(),
				file: state.file
			}).then(
				function() { return state.file+' Saved' },
				function() { return new Error(state.file+' Not saved') }
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
		var state = this.data();
		for (var i = state.count || 1; i > 0; --i){
			this.findBack(state.word, true);
		}
		this.bounds('endbounds');
	}
},{
	keys: 'B', // end of previous bigword
	command: function(){
		var state = this.data();
		for (var i = state.count || 1; i > 0; --i){
			this.findBack(state.bigword, true);
		}
		this.bounds('endbounds');
	}
},{
	keys: 'e', // end of next word
	command: function(){
		var state = this.data();
		for (var i = state.count || 1; i > 0; --i){
			this.find(state.word, true);
		}
		this.bounds('endbounds');
	}
},{
	keys: 'E', // end of next bigword
	command: function(){
		var state = this.data();
		for (var i = state.count || 1; i > 0; --i){
			this.find(state.bigword, true);
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
},{
	keys: '/',
	name: 'livesearch',
	command: function(parameter, variant){
		var rng = this, el = this.element(), $status = $.data(el, 'vi.status');
		$status.status({
			prompt: variant ? '?' : '/',
			run: function(text){
				rng.bounds('selection').find(new RegExp(text), undefined, variant).select().scrollIntoView();
				if (!rng.match) throw new Error(text+' not found');
			},
			returnPromise: true
		}).then( // make sure we return focus to the text! It would be nice to have a finally method
			function(e) {el.focus()},
			function(e) {el.focus()}
		);
		$status.off('.search').on('input.search focus.search focusout.search', 'input', $(el).livesearch(variant));
	}
},{
	keys: '?',
	command: 'livesearch!'
}
], {mode: 'VISUAL'});

})(jQuery);