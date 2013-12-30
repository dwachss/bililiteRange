// Quick syntax-highlighting editor that uses Prism
// usage: Prism.editor(element). the element should have the appropriate class=language-* for Prism.
// depends on bililiteRange
// Version: 1.2
// Documentation: http://bililite.com/blog/2013/12/16/simple-syntax-highlighting-editor-with-prism/
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

Prism.editor = function(editor, threshold){
	if (editor.tagName.toLowerCase() == 'textarea'){
		// turn the editor into an editable <pre>, since that is what Prism works on
		var replacement = document.createElement('pre');
		replacement.setAttribute ('contenteditable', true);
		[].forEach.call(editor.attributes, function(attr){
			replacement.setAttribute(attr.name, attr.value);
		});
		bililiteRange(replacement).all(editor.value);
		editor.parentNode.replaceChild(replacement, editor);
		editor = replacement;
	}
	// for large texts, it can be too slow to run the highlighter on every input event. 
	// use the code from http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
	// to limit it to once every threshold milliseconds
	function debounce (func, threshold){
		if (!threshold) return func; // no debouncing
		var timeout;
		return function(){
			var self = this, args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(function(){
				func.apply(self, args);
			}, threshold);
		};
	}
	
	var rng = bililiteRange(editor);
	function highlight(){
		rng.bounds('selection');
		// handle what Lea Verou calls "Dirty fix to #2"--seems to be Chrome issue with missing newlines
		// from https://github.com/LeaVerou/dabblet/issues/2
		if (!/\n$/.test(editor.textContent)) editor.textContent += '\n';
		Prism.highlightElement(editor);
		rng.select();
	}
	highlight();
	editor.addEventListener('input', debounce(highlight, threshold));
	editor.addEventListener('paste', function(evt){
		// Firefox changes newlines to br's on paste!
		// Chrome pastes cr's! Nothing is easy.
		rng.bounds('selection').
			text(evt.clipboardData.getData("text/plain").replace(/\r/g,''), 'end').
			select();
		evt.preventDefault();
	});
	editor.addEventListener('keydown', function(evt){
		// avoid the fancy element-creation with newlines
		if (evt.keyCode == 13){
			rng.bounds('selection').text('\n','end').select();
			evt.preventDefault();
		}
	});
	
	return editor;
};