// jsvk.js: jQuery plugin wrapper for Ilya Lebedev's
// JavaScript VirtualKeyboard(http://www.allanguages.info/)
// version 1.2

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

// The VirtualKeyboard itself is licenced under the GNU Lesser General Public License, http://www.gnu.org/copyleft/lesser.html


// Usage: $('textarea').jsvk(opts) to attach the keyboard and $('textarea').jsvk('off') to remove it.
// There's only one VirtualKeyboard object, so style and layout changes affect all appearances of it.
// options: 
//   dir: Required String; URL of the directory (without a trailing slash) where the VK is found.
//   kbdiv: jQuery object; the keyboard will be placed into kbdiv[0]. If not set, creates a new element with $('<div>').insertAfter(this)
//  skin: String. Name of the CSS directory for styling (see http://debugger.ru/demo/projects/virtualkeyboard/ for choices)
//  layout: String. Name of language/layout, like 'IL Hebrew' (see http://debugger.ru/demo/projects/virtualkeyboard/ for choices)
//  langfilter: Array of String: list of language codes (the two-letter codes; must be uppercase) to allow in the drop-down menu
// nokeyevents: Boolean. Set to true to disable key capturing from the real keyboard

// call vkjs multiple times to change the options, except for dir which is only used the first time it's called (it won't hurt to set it again, it's just ignored). 
// Thus $(el).jsvk({dir: '/VK', vk_layout: 'IL Hebrew'}) initially, then $(el).jsvk({vk_layout: 'US US'}) to change

// use VirtualKeyboard.getAttachedInput() to get the current input element (not a jQuery object)

(function($){

	var dir;
	function loadVK(vkdir){
		// can't use jQuery for this since jQuery is smart enough to remove the script after it executes
		// and VK is hacky enough to look for its own script element to load other files
		dir = vkdir;
		var script = document.createElement("script");
		script.src = dir+'/vk_loader.js';
		document.body.appendChild(script);
		onVKready(function(){
			// patch VK's selection routines to use bililiteRange. This allows for manipulation of contenteditable elements
			// and triggers input events
			DocumentSelection.insertAtCursor = function(el, text){
				bililiteRange(el).bounds('selection').text(text, 'end').select();
			}
			DocumentSelection.deleteAtCursor = function(el, after){
				var rng = bililiteRange(el).bounds('selection');
				var b = rng.bounds();
				if (b[0] == b[1] && after) ++b[1]; // delete key
				if (b[0] == b[1] && !after) --b[0]; // backspace key
				rng.bounds(b).text('', 'end').select();
			}
			DocumentSelection.deleteSelection = function(el){
				bililiteRange(el).bounds('selection').text('', 'end').select();
			}
			DocumentSelection.getSelection = function(el){
				return bililiteRange(el).bounds('selection').text();
			}
			DocumentSelection.getStart = function(el){
				return bililiteRange(el).bounds('selection').bounds()[0];
			}
			DocumentSelection.setRange = function(el, start, end, offset){
				var rng = bililiteRange(el).bounds('selection');
				if (offset){
					var b = rng.bounds()[0];
					start += b;
					end += b;
				}
				rng.bounds([start, end]).select();
			}
			// TODO: DocumentSelection.getSelectionOffset, which currently only works for textareas. Should be straightforward given
			// bililiteRange.scrollIntoView, but is only necessary for positioning IME's, which I never use. 
		});
	}
	
	function onVKready(callback){
		// I broke my head trying to get the VirtualKeyboard to trigger an event when its loaded. It is too hacky by far. We're left with polling.
		var poll = setInterval(function(){
			if (typeof VirtualKeyboard === 'object' && VirtualKeyboard.isReady()){
				callback();
				clearInterval(poll);
			}
		}, 100);
	}
	
	// IE crashes when I try to do this with jQuery, so it's back to the DOM
	var stylesheetlink = document.createElement('link');
	stylesheetlink.rel = 'stylesheet';
	function switchSkin(newskin){
		// this moves it to the end of the <head>, after VK's original stylesheet, which cannot be changed.
		document.getElementsByTagName('head')[0].appendChild(stylesheetlink);
		stylesheetlink.href = dir+'/css/'+newskin+'/keyboard.css';
	}
	
	// grab the event handlers so they can be replaced with the jQuery handlers
	// This is a real hack; we know from reading the VK source that we always use the same handler for all events
	function hijackHandlers(el){
		el.addEventListener = function(type, handler){
			$.data(el, 'vk.handler', handler);
		}
	}
	function endHijack(el){
		el.addEventListener = document.body.addEventListener;
	}
	
	$.fn.jsvk = function(opts){
		opts = opts || {};
		if (!dir && opts.dir) loadVK (opts.dir); // load VK if we haven't and we have enough information to do so now
		return this.each(function(){
			var $self = $(this), self = this;
			onVKready(function(){
				if (opts == 'off'){
					if (VirtualKeyboard.getAttachedInput() == self) VirtualKeyboard.close();
					$self.off('.vk');
					return;
				}
				var kb = opts && opts.kbdiv && $(opts.kbdiv) || $self.data('vk.kb') || $('<div>').insertAfter($self);
				function focus(){
					if (VirtualKeyboard.getAttachedInput() != this){
						VirtualKeyboard.close();
					}
					VirtualKeyboard.show(self, kb[0]);
				}
				hijackHandlers(self);
				focus();
				endHijack(self);
				if (opts.langfilter) VirtualKeyboard.setVisibleLayoutCodes(opts.langfilter);
				if (opts.layout) VirtualKeyboard.switchLayout(opts.layout);
				if (opts.skin) switchSkin(opts.skin);
				$self.off('focus.vk').on('focus.vk', focus); // don't double-bind the event handler
				$self.off('keyup.vk keypress.vk keydown.vk');
				if (!opts.nokeyevents) $self.on('keyup.vk keypress.vk keydown.vk', $self.data('vk.handler'));
				$self.data('vk.kb', kb); // don't double create the keyboard div
			});
		});
	};
})(jQuery);