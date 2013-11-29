// moving toward an implementation of vi for jQuery
// (http://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)

// depends: jquery.js, bililiteRange.js, bililiteRange.util.js, bililiteRange.ex.js, jquery.keymap.js

(function($){

$.fn.vi = function(statusbar, state){
	state = state || {};
	$.extend(true, state, {
		options: {
			vimode: 'INSERT' // unlike real vi, start in insert mode since that is more "natural" for a GUI
		},
		commands: {
			map: function (rng, parameter, variant, state){
				// The last word (either in a string or not containing spaces) is the replacement; the rest of
				// the string at the beginning are the mapped key(s)
				var match = /^(.+?)([^"\s]+|"(?:[^"]|\\")+")$/.exec(parameter);
				if (!match) throw {message: 'Bad syntax in map: '+parameter};
				var keys = match[1].trim();
				var command = bililiteRange.fn.ex.string(match[2]);
				var executecommand = function(){
					return rng.
						bounds('selection').
						ex(command, state).
						select().
						scrollIntoView().
						exMessage;
				};
				$(rng.element()).on('keydown', {keys: keys}, function() {
					var mode = state.options.vimode;
					console.log(keys, mode, variant);
					if (variant != (mode == 'INSERT')) return; // variant == true means run in insert mode
					$(statusbar).statusbar({run: executecommand});
					return false;
				});
			},
			select: function (rng, parameter, variant, state){
				rng.bounds(parameter).select();
			},
			sendkeys: function (rng, parameter, variant, state){
				$(rng.element()).sendkeys(parameter);
			},
			vi: function (rng, parameter, variant, state){
				parameter = parameter || 'VI MODE';
				$(rng.element()).trigger('vimode', parameter);
			},
			// all the vi* functions are meant to be used with map to attach to a keystroke
			via:  function (rng, parameter, variant, state){
				$(rng.element()).trigger('vimode', 'INSERT');
				rng.bounds('endbounds').select();
			},
			viex: function (rng, parameter, variant, state){
				$(statusbar).statusbar({
					prompt: ':',
					run: function(text){
						return rng.
							bounds('selection').
							ex(text, state).
							select().
							scrollIntoView().
							exMessage;
					},
					result: $.Deferred().always(function() {rng.element().focus()}), // make sure we return focus to the text!
				});
			}
		}
	});
	return this.on('vimode', function(evt, data){
		state.options.vimode = data;
	}).each(function(){
		bililiteRange(this). // TODO:  replace this with the commands below
			ex('via', state).
			ex("map {esc} '.vi", state).
			ex("map! {esc} '.vi", state).
			ex("map : viex", state).
			ex('map o "a|via"', state).
			ex("map a '.via", state);
	});
}

var vimodeCommands = {
	':' : function (rng, parameter, variant, state){
		$(statusbar).statusbar({
			prompt: ':',
			run: function(text){
				return rng.
					bounds('selection').
					ex(text, state).
					select().
					scrollIntoView().
					exMessage;
			},
			result: $.Deferred().always(function() {rng.element().focus()}), // make sure we return focus to the text!
		});
	},
	'{esc}' : 'vi',
	a: 'select endbounds | vi INSERT',
	h: 'sendkeys {leftarrow}',
	i: 'select startbounds | vi INSERT',
	l: 'sendkeys {rightarrow}',
	o: 'a|via',
	
},
insertmodeCommands = {
	'{esc}' :'vimode'
}

function toexname (s, prefix){
	// converts a string to a valid ex command name (only letters and 
}
})(jQuery);