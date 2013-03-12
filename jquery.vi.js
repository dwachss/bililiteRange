// moving toward an implementation of vi for jQuery
// (http://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)

// depends: jquery.js, bililiteRange.js, bililiteRange.util.js, bililiteRange.ex.js

(function($){
	$.fn.ex = function (state, div, prompt){
		// sets up an input element to get the ex commands; returns a Promise (http://api.jquery.com/deferred.promise/)
		// that can be used for the success or failure of the command
		// and, if successful, operates on the first element passed in.
		prompt = prompt || '';
		var history = this.data('ex.history') || []; // a stack of past commands
		this.data('ex.history', history);
		var ret = $.Deferred();
		if (this.length == 0) return ret.reject({message: 'No input element'});
		var rng = bililiteRange(this[0]).bounds('selection');
		state = state || {};		
		var inputdiv = $('<div><span style="font-weight: bold">'+prompt+'&nbsp</span><input /></div>');
		var input = $('input', inputdiv)[0];
		if (!div){
			this.after(inputdiv);
		}else if ($.isFunction(div)){
			div(inputdiv, true); // for special effects
		}else{
			div.append(inputdiv);
		}
		input.focus();
		$(input).on('keyup', function (evt){
			var c = remap (evt, state.maps);
			if ($.isFunction(c)){
				c(this, rng);
				return false;
			}
			switch (c){
			case '{enter}':
				try{
					history.push(this.value);
					rng.bounds('selection').ex(this.value, state);
					ret.resolve({message: rng.exMessage});
					rng.select().scrollIntoView();
				}catch(e){
					ret.reject({message: e.message});
				}
				if ($.isFunction(div)){
					div(inputdiv, false); // for special effects
				}else{
					inputdiv.remove();
				}
				return false;
			break;
			case '{uparrow}': 
				this.value = history.pop(); // up arrow
			break;
			}
		});
		return ret;
	}

	function remap (evt, maps){
		var c = $.keymap(evt);
		// TODO: handle abbreviations.
		return c;
	}
	
	// TODO: make this more general!
	function message(str, color){
		$('<span>').css('color',color).text(str).appendTo('#message').fadeOut(5000, function(){
			this.parentNode.removeChild(this);
		});
	}

	$.fn.vi = function(state){
		state = state || {};
		return this.each(function(){
			var self = this;
			var keystate = 'input';
			$(self).on('keydown', function(evt){
				var c = remap (evt, state.maps);
				if ($.isFunction(c)){
					c(self, bililiteRange(self).bounds('selection'));
					return false;
				}
				if (c == '{esc}') keystate = 'command';
				if (keystate == 'command'){
					if (c == ':'){
						$(self).ex(state, undefined, ':').done(function(data){
							if (data.message) message(data.message, 'green');
						}).fail(function(data){
							message(data.message, 'red');
						}).always(function(){
							self.focus();
						});
						return false;
					}
				}
			});
		});
	}
})(jQuery);