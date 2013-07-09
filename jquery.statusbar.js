// create a "status bar" to display messages and accept line input
// for use as the "ex" line with vi
(function($){

$.fn.statussuccess = function(text){
	return this.statusbar({
		result: $.Deferred().resolve({message: text})
	});
}

$.fn.statusfail = function(text){
	return this.statusbar({
		result: $.Deferred().reject({message: text})
	});
}

$.fn.statusbar = function(opts){
	var options = $.extend({}, $.fn.statusbar.options, opts);
	return this.each(function(){
		var self = this;
		if (!options.result) options.result = $.Deferred();
		function message (text, klass){
			var span = $('<span>').addClass(klass).text(text).hide().appendTo(self);
			options.show.call(span);
			options.hide.call(span);
			span.promise().done(function() {span.remove()});
		}
		function resolve (text){
			try{
				options.result.resolve({message: options.run(text)});
			}catch(e){
				options.result.reject({message: e.message});
			}
		}
		
		options.result.done(function(data) {
			if (data.message) message(data.message, 'statusbar-success');
		}).fail(function(data){
			if (data.message) message(data.message, 'statusbar-fail');
		});
		
		if (options.result.state() != 'pending') return; // nothing more to do; the result has already been resolved
		
		if (options.prompt === false) resolve(); // no input needed
		
		if (options.result.state() == 'pending'){
			// we need to actually do something!
			var input = createinput(this, options); // this actually returns the label that contains the input
			var history = $(this).data('statusbar.history') || []; // a stack of past commands
			$(this).data('statusbar.history', history);
			$('input',input).on(options.events, options.eventfilter).on('keyup', function (evt){
				var c = $.keymap(evt);
				if (c == '{enter}'){
					history.push(this.value);
					resolve (this.value);
					return false;
				}else if (c == '{esc}'){
					options.result.reject({message: 'User Cancelled'});
				}else if (c == '{uparrow}'){ 
					this.value = history.pop();
					$(this).trigger('input'); // always need to alert when the text changes
				}
			});
		}
	});
};

$.fn.statusbar.options = {
	show: $.fn.show,
	hide: function() {return this.fadeOut(5000)},
	result: undefined,
	run: $.noop, // function to which to pass the text to resolve result
	noinput: false,
	events: '', // events to pass to eventfilter
	eventfilter: $.noop,
	prompt: false,
};

function createinput(container, options){
	var inputlabel = $('label.statusbar-input', container);
	var oldtext = $('input', inputlabel).val();
	inputlabel.remove();
	inputlabel = $('<label>').
		addClass('statusbar-input').hide().text(options.prompt).prependTo(container);
	var input = $('<input>').appendTo(inputlabel).val(oldtext);
	options.result.always(function(){
		// when we're done, get rid of the element
		options.hide.call(inputlabel);
		inputlabel.promise().done(function() {inputlabel.remove()});
	});
	options.show.call(inputlabel);
	input[0].focus();
	return inputlabel;
}
})(jQuery);