// jquery.livesearch.js
// Version 1.2
// documentation: http://bililite.com/blog/2013/03/07/new-jquery-plugin-livesearch/
// depends on jQuery, bililiteRange.s, bililiteRange.util.js

// Copyright (c) 2013 Daniel Wachsstock
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
(function($, undefined){

$.fn.livesearch = function(back, filter){
	var text = this;
	// need separate ranges for each one of text!
	var rngs = text.map(function() {return bililiteRange(this).bounds('selection')}).get();
	
	filter = filter || function (string){
		try{
			return new RegExp(string);
		}catch(e){
			return /(?:)/; // blank regexp
		}
	}

	return function(evt){
		var text = bililiteRange(this).all();
		if (evt.type != 'blur' && evt.type != 'focusout'){
			rngs.forEach(function(rng){
				rng = rng.clone().find(filter(text), undefined, back);
				highlight(rng);
				$(rng.element()).trigger('livesearch', [text, rng.match]);
			});
		}else{
			rngs.forEach(function(rng){
				var el = $(rng.element());
				deletehighlight(rng);
				rng.find(filter(text), undefined, back);
				el.trigger('livesearchdone', [text, rng.match]);
				var scroll = el.data('livesearch.scroll');
				if (scroll){
					// this will only be approximate if there's no word wrap on the text area.
					el.prop('scrollTop', scroll.top);
				}
				el.one('focus', function() {rng.select()});
			});
		}
	}
}

function highlight (rng){
	// display the range in an overlying element (using $.fn.texthighight is too flaky)
	var el = $(rng.element());
	var display = el.data('livesearch.display');
	if (!display){
		// create display element
		display = $('<pre>').addClass('livesearch').css({
			overflow: 'auto',
			whiteSpace: 'pre-wrap',
			position: 'absolute',
			fontFamily: el.css('fontFamily'),
			fontSize: el.css('fontSize')
		}).appendTo('body');
	}
	// set size and location and font
	display.offset(el.offset()).width(el.outerWidth()).height(el.outerHeight());
	display.empty();
	var text = rng.all();
	var b = rng.bounds();
	display.append(document.createTextNode(text.slice(0, b[0])));
	var highlighter = $('<span>').text(text.slice(b[0],b[1])).appendTo(display);
	display.append(document.createTextNode(text.slice(b[1])));
	var top = highlighter.position().top + display.prop('scrollTop');
	// scroll the parent div to put the highlighted area 1/3 of the way down
	// we always use word wrapping, so it's always visible horizontally
	display.stop(true).animate({scrollTop: top - display.height()/3});
	$.data(this, 'livesearch.scroll', {
		top : display.prop('scrollTop')
	});

	// remember this element 
	el.data('livesearch.display', display);
}

function deletehighlight(rng){
	var display = $.data(rng._el, 'livesearch.display');
	if (display){
		display.remove();
		$.removeData(rng._el, 'livesearch.display');
	}
}

})(jQuery);