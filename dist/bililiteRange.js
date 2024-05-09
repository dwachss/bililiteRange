'use strict';

((target, fakeloader, esmodules) =>{
  const mod = fakeloader(esmodules);
  const exported = mod.exports.default;
  target[exported.name] = exported;

})(
(()=>{
  if (typeof module !== 'undefined' && typeof module === 'object' && module) {
    if (!module.exports || typeof module.exports !== 'object') {
      if (typeof exports !== 'undefined' && exports) {
        module.exports = exports;
      } else {
        module.exports = {};
      }
    }
    return module.exports;

  } else if (typeof globalThis !== 'undefined' && globalThis) {
    return globalThis;

  } else if (typeof window !== 'undefined' && window) {
    return window;
  }
})(),
function fakeloader(esmodules){
  let exports = {
    get default() { return exports; },
    set default(value) {
      const current = Object.getOwnPropertyDescriptors(exports);
      Object.defineProperties(value, current);

      if (typeof value === 'function') {
        if (!value.name) {
          throw new Error('default export must be named');
        }
        if (typeof current === 'function') {
          throw new Error('Only export default a single function, as the name of that one function will be what is exported');
        }
        value[value.name] = value;
      }
      exports = value;
    }
  };
  const module = {
    get exports() { return exports; },
    set exports(value) { exports = value; },
  };

  function require(name) {
    return module.exports;
  }

  for (let esmodule of esmodules) {
    if (!esmodule) { continue; }
    esmodule(require, module);
  }

  return module;
},
[
// in the form of:
// (require, module) => {  the code },
(require, module)=>{
/*************************************************
	 *     source: bililiteRange.js
	 *       file: bililiteRange.js
	 *       repo: 
	 *     commit: eb6a24a
	 *    version: 5.0.0
	 *       date: 2024-05-09
	 ************************************************/
	
	module.exports.default = bililiteRange;
	module.exports.bililiteRange = bililiteRange;
	
	
	
	const datakey = Symbol(); // use as the key to modify elements.
	
	/**
	@template {HTMLInputElement} E
	@param {E} el
	@return {(typeof bililiteRange)['prototype'] & (E extends HTMLInputElement ? InputRange : E extends HTMLTextAreaElement ? W3CRange : NothingRange)}
	*/
	
	function bililiteRange(el) {
		/**@type {Range} */
		var ret;
		if (el.setSelectionRange) {
			// Element is an input or textarea
			// note that some input elements do not allow selections
			try {
				el.selectionStart = el.selectionStart;
				ret = new InputRange();
			} catch (e) {
				ret = new NothingRange();
			}
		} else {
			// Standards, with any other kind of element
			ret = new W3CRange();
		}
		ret._el = el;
		// determine parent document, as implemented by John McLear <john@mclear.co.uk>
		ret._doc = el.ownerDocument;
		ret._win = ret._doc.defaultView;
		ret._bounds = [0, ret.length];
	
		if (!el[datakey]) {
			// we haven't processed this element yet
			const data = createDataObject(el);
			startupHooks.forEach((hook) => hook(el, ret, data));
		}
		return ret;
	}
	
	bililiteRange.version = 5.0;
	
	const startupHooks = new Set();
	bililiteRange.addStartupHook = (fn) => startupHooks.add(fn);
	startupHooks.add(trackSelection);
	startupHooks.add(fixInputEvents);
	startupHooks.add(correctNewlines);
	
	// selection tracking. We want clicks to set the selection to the clicked location but tabbing in or element.focus() should restore
	// the selection to what it was.
	// There's no good way to do this. I just assume that a mousedown (or a drag and drop
	// into the element) within 100 ms of the focus event must have caused the focus, and
	// therefore we should not restore the selection.
	function trackSelection(element, range, data) {
		data.selection = [0, 0];
		range.listen(
			"focusout",
			(evt) => (data.selection = range._nativeSelection())
		);
		range.listen("mousedown", (evt) => (data.mousetime = evt.timeStamp));
		range.listen("drop", (evt) => (data.mousetime = evt.timeStamp));
		range.listen("focus", (evt) => {
			if ("mousetime" in data && evt.timeStamp - data.mousetime < 100) return;
			range._nativeSelect(range._nativeRange(data.selection));
		});
	}
	
	function fixInputEvents(element, range, data) {
		// DOM 3 input events, https://www.w3.org/TR/input-events-1/
		// have a data field with the text inserted, but that isn't enough to fully describe the change;
		// we need to know the old text (or at least its length)
		// and *where* the new text was inserted.
		// So we enhance input events with that information.
		// the "newText" should always be the same as the 'data' field, if it is defined
		data.oldText = range.all();
		data.liveRanges = new Set();
		range.listen("input", (evt) => {
			const newText = range.all();
			if (!evt.bililiteRange) {
				evt.bililiteRange = diff(data.oldText, newText);
				if (evt.bililiteRange.unchanged) {
					// no change. Assume that whatever happened, happened at the selection point (and use whatever data the browser gives us).
					evt.bililiteRange.start =
						range.clone().bounds("selection")[1] - (evt.data || "").length;
				}
			}
			data.oldText = newText;
	
			// Also update live ranges on this element
			data.liveRanges.forEach((rng) => {
				const start = evt.bililiteRange.start;
				const oldend = start + evt.bililiteRange.oldText.length;
				const newend = start + evt.bililiteRange.newText.length;
				// adjust bounds; this tries to emulate the algorithm that Microsoft Word uses for bookmarks
				let [b0, b1] = rng.bounds();
				if (b0 <= start) {
					// no change
				} else if (b0 > oldend) {
					b0 += newend - oldend;
				} else {
					b0 = newend;
				}
				if (b1 < start) {
					// no change
				} else if (b1 >= oldend) {
					b1 += newend - oldend;
				} else {
					b1 = start;
				}
				rng.bounds([b0, b1]);
			});
		});
	}
	
	function diff(oldText, newText) {
		// Try to find the changed text, assuming it was a continuous change
		if (oldText == newText) {
			return {
				unchanged: true,
				start: 0,
				oldText,
				newText
			};
		}
	
		const oldlen = oldText.length;
		const newlen = newText.length;
		for (var i = 0; i < newlen && i < oldlen; ++i) {
			if (newText.charAt(i) != oldText.charAt(i)) break;
		}
		const start = i;
		for (i = 0; i < newlen && i < oldlen; ++i) {
			let newpos = newlen - i - 1,
				oldpos = oldlen - i - 1;
			if (newpos < start || oldpos < start) break;
			if (newText.charAt(newpos) != oldText.charAt(oldpos)) break;
		}
		const oldend = oldlen - i;
		const newend = newlen - i;
		return {
			start,
			oldText: oldText.slice(start, oldend),
			newText: newText.slice(start, newend)
		};
	}
	bililiteRange.diff = diff; // expose
	
	function correctNewlines(element, range, data) {
		// we need to insert newlines rather than create new elements, so character-based calculations work
		range.listen("paste", (evt) => {
			if (evt.defaultPrevented) return;
			// windows adds \r's to clipboard!
			range
				.clone()
				.bounds("selection")
				.text(evt.clipboardData.getData("text/plain").replace(/\r/g, ""), {
					inputType: "insertFromPaste"
				})
				.bounds("endbounds")
				.select()
				.scrollIntoView();
			evt.preventDefault();
		});
		range.listen("keydown", function (evt) {
			if (evt.ctrlKey || evt.altKey || evt.shiftKey || evt.metaKey) return;
			if (evt.defaultPrevented) return;
			if (evt.key == "Enter") {
				range
					.clone()
					.bounds("selection")
					.text("\n", { inputType: "insertLineBreak" })
					.bounds("endbounds")
					.select()
					.scrollIntoView();
				evt.preventDefault();
			}
		});
	}
	
	// convenience function for defining input events
	function inputEventInit(type, oldText, newText, start, inputType) {
		return {
			type,
			inputType,
			data: newText,
			bubbles: true,
			bililiteRange: {
				unchanged: oldText == newText,
				start,
				oldText,
				newText
			}
		};
	}
	
	// base class
	/**
	@class
	@abstract
	@mixes W3CRange
	@mixes InputRange
	@mixes NothingRange
	@template {HTMLElement} E
	@param {E} el
	*/
	class Range {
	  constructor(el) {
	    /**@type {E} */
	    this._el = this._el||el;
	    // determine parent document, as implemented by John McLear <john@mclear.co.uk>
	    /**@type {Document} */
	    this._doc = undefined;
	    /**@type {Window} */
	    this._win = undefined;
	    /**@type {ArrayLike<number>} */
	    this._bounds = undefined;
	
	    /**@type {keyof { [K in keyof E as E[K] extends string ? K : never]: E[K] }} */
	    this._textProp = undefined;
	  }
	  // allow use of range[0] and range[1] for start and end of bounds
	  get 0() {
	    return this.bounds()[0];
	  }
	  set 0(x) {
	    this.bounds([x, this[1]]);
	    return x;
	  }
	  get 1() {
	    return this.bounds()[1];
	  }
	  set 1(x) {
	    this.bounds([this[0], x]);
	    return x;
	  }
	  all(text) {
	    if (arguments.length) {
	      return this.bounds("all").text(text, {
	        inputType: "insertReplacementText"
	      });
	    } else {
	      return this._el[this._textProp];
	    }
	  }
	  bounds(/**@type {number|[number, number]|Range|string|undefined} */ s) {
	    if (typeof s === "number") {
	      this._bounds = [s, s];
	    } else if (bililiteRange.bounds[s]) {
	      this.bounds(bililiteRange.bounds[s].apply(this, arguments));
	    } else if (s && s.bounds) {
	      this._bounds = s.bounds(); // copy bounds from an existing range
	    } else if (s) {
	      this._bounds = s; // don't do error checking now; things may change at a moment's notice
	    } else {
	      // constrain bounds now
	      var b = [
	        Math.max(0, Math.min(this.length, this._bounds[0])),
	        Math.max(0, Math.min(this.length, this._bounds[1]))
	      ];
	      b[1] = Math.max(b[0], b[1]);
	      return b;
	    }
	    return this; // allow for chaining
	  }
	  clone() {
	    return bililiteRange(this._el).bounds(this.bounds());
	  }
	  get data() {
	    return this._el[datakey];
	  }
	  dispatch(opts = {}) {
	    var event = new Event(opts.type, opts);
	    event.view = this._win;
	    for (let prop in opts)
	      try {
	        event[prop] = opts[prop];
	      } catch (e) { } // ignore read-only errors for properties that were copied in the previous line
	    this._el.dispatchEvent(event); // note that the event handlers will be called synchronously, before the "return this;"
	    return this;
	  }
	  get document() {
	    return this._doc;
	  }
	  dontlisten(type, func = console.log, target) {
	    target ??= this._el;
	    target.removeEventListener(type, func);
	    return this;
	  }
	  get element() {
	    return this._el;
	  }
	  get length() {
	    return this._el[this._textProp].length;
	  }
	  live(on = true) {
	    this.data.liveRanges[on ? "add" : "delete"](this);
	    return this;
	  }
	  listen(type, func = console.log, target) {
	    target ??= this._el;
	    target.addEventListener(type, func);
	    return this;
	  }
	  scrollIntoView() {
	    var top = this.top();
	    // note that for TEXTAREA's, this.top() will do the scrolling and the following is irrelevant.
	    // scroll into position if necessary
	    if (this._el.scrollTop > top ||
	      this._el.scrollTop + this._el.clientHeight < top) {
	      this._el.scrollTop = top;
	    }
	    return this;
	  }
	  select() {
	    var b = (this.data.selection = this.bounds());
	    if (this._el === this._doc.activeElement) {
	      // only actually select if this element is active!
	      this._nativeSelect(this._nativeRange(b));
	    }
	    this.dispatch({ type: "select", bubbles: true });
	    return this; // allow for chaining
	  }
	  selection(text) {
	    if (arguments.length) {
	      return this.bounds("selection").text(text).bounds("endbounds").select();
	    } else {
	      return this.bounds("selection").text();
	    }
	  }
	  sendkeys(text) {
	    this.data.sendkeysOriginalText = this.text();
	    this.data.sendkeysBounds = undefined;
	    function simplechar(rng, c) {
	      if (/^{[^}]*}$/.test(c)) c = c.slice(1, -1); // deal with unknown {key}s
	      rng.text(c).bounds("endbounds");
	    }
	    text.replace(/{[^}]*}|[^{]+|{/g, (part) => (bililiteRange.sendkeys[part] || simplechar)(this, part, simplechar)
	    );
	    this.bounds(this.data.sendkeysBounds);
	    this.dispatch({ type: "sendkeys", detail: text });
	    return this;
	  }
	  text(text, { inputType = "insertText" } = {}) {
	    if (text !== undefined) {
	      let eventparams = [this.text(), text, this[0], inputType];
	      this.dispatch(inputEventInit("beforeinput", ...eventparams));
	      this._nativeSetText(text, this._nativeRange(this.bounds()));
	      this[1] = this[0] + text.length;
	      this.dispatch(inputEventInit("input", ...eventparams));
	      return this; // allow for chaining
	    } else {
	      return this._nativeGetText(this._nativeRange(this.bounds()));
	    }
	  }
	  top() {
	    return this._nativeTop(this._nativeRange(this.bounds()));
	  }
	  get window() {
	    return this._win;
	  }
	  wrap(n) {
	    this._nativeWrap(n, this._nativeRange(this.bounds()));
	    return this;
	  }
	}
	
	// allow extensions ala jQuery
	bililiteRange.prototype = Range.prototype;
	bililiteRange.extend = function extend(fns) {
		Object.assign(bililiteRange.prototype, fns);
	};
	
	bililiteRange.override = (name, fn) => {
		const oldfn = bililiteRange.prototype[name];
		bililiteRange.prototype[name] = function () {
			const oldsuper = this.super;
			this.super = oldfn;
			const ret = fn.apply(this, arguments);
			this.super = oldsuper;
			return ret;
		};
	};
	
	//bounds functions
	bililiteRange.bounds = {
		all() {
			return [0, this.length];
		},
		start() {
			return 0;
		},
		end() {
			return this.length;
		},
		selection() {
			if (this._el === this._doc.activeElement) {
				this.bounds("all"); // first select the whole thing for constraining
				return this._nativeSelection();
			} else {
				return this.data.selection;
			}
		},
		startbounds() {
			return this[0];
		},
		endbounds() {
			return this[1];
		},
		union(name, ...rest) {
			const b = this.clone().bounds(...rest);
			return [Math.min(this[0], b[0]), Math.max(this[1], b[1])];
		},
		intersection(name, ...rest) {
			const b = this.clone().bounds(...rest);
			return [Math.max(this[0], b[0]), Math.min(this[1], b[1])];
		}
	};
	
	// sendkeys functions
	bililiteRange.sendkeys = {
		"{tab}"(rng, c, simplechar) {
			simplechar(rng, "\t"); // useful for inserting what would be whitespace
		},
		"{newline}"(rng) {
			rng.text("\n", { inputType: "insertLineBreak" }).bounds("endbounds");
		},
		"{backspace}"(rng) {
			const b = rng.bounds();
			if (b[0] == b[1]) rng.bounds([b[0] - 1, b[0]]); // no characters selected; it's just an insertion point. Remove the previous character
			rng.text("", { inputType: "deleteContentBackward" }); // delete the characters and update the selection
		},
		"{del}"(rng) {
			const b = rng.bounds();
			if (b[0] == b[1]) rng.bounds([b[0], b[0] + 1]); // no characters selected; it's just an insertion point. Remove the next character
			rng.text("", { inputType: "deleteContentForward" }).bounds("endbounds"); // delete the characters and update the selection
		},
		"{rightarrow}"(rng) {
			const b = rng.bounds();
			if (b[0] == b[1]) ++b[1]; // no characters selected; it's just an insertion point. Move to the right
			rng.bounds([b[1], b[1]]);
		},
		"{leftarrow}"(rng) {
			const b = rng.bounds();
			if (b[0] == b[1]) --b[0]; // no characters selected; it's just an insertion point. Move to the left
			rng.bounds([b[0], b[0]]);
		},
		"{selectall}"(rng) {
			rng.bounds("all");
		},
		"{selection}"(rng) {
			// insert the characters without the sendkeys processing
			rng.text(rng.data.sendkeysOriginalText).bounds("endbounds");
		},
		"{mark}"(rng) {
			rng.data.sendkeysBounds = rng.bounds();
		},
		"{ctrl-Home}": (rng, c, simplechar) => rng.bounds("start"),
		"{ctrl-End}": (rng, c, simplechar) => rng.bounds("end")
	};
	// Synonyms from the DOM standard (http://www.w3.org/TR/DOM-Level-3-Events-key/)
	bililiteRange.sendkeys["{Enter}"] = bililiteRange.sendkeys["{enter}"] =
		bililiteRange.sendkeys["{newline}"];
	bililiteRange.sendkeys["{Backspace}"] = bililiteRange.sendkeys["{backspace}"];
	bililiteRange.sendkeys["{Delete}"] = bililiteRange.sendkeys["{del}"];
	bililiteRange.sendkeys["{ArrowRight}"] = bililiteRange.sendkeys["{rightarrow}"];
	bililiteRange.sendkeys["{ArrowLeft}"] = bililiteRange.sendkeys["{leftarrow}"];
	
	/**
	an input element in a standards document. "Native Range" is just the bounds array
	@class
	@template {HTMLInputElement} E
	@extends Range<E>
	*/
	class InputRange extends Range {
	  /**@param {E|undefined} el */
	  constructor(el) {
	    super(el);
	    this._textProp = "value";
	  }
	
	  _nativeRange(bounds) {
	    return bounds || [0, this.length];
	  }
	
	  _nativeSelect(rng) {
	    this._el.setSelectionRange(rng[0], rng[1]);
	  }
	
	  _nativeSelection() {
	    return [this._el.selectionStart, this._el.selectionEnd];
	  }
	
	  _nativeGetText(rng) {
	    return this._el.value.substring(rng[0], rng[1]);
	  }
	
	  _nativeSetText(text, rng) {
	    const val = this._el.value;
	    this._el.value = val.substring(0, rng[0]) + text + val.substring(rng[1]);
	  }
	
	  _nativeEOL() {
	    this.text("\n");
	  }
	
	  _nativeTop(rng) {
	    if (rng[0] == 0) return 0; // the range starts at the top
	    const el = this._el;
	    if (el.nodeName == "INPUT") return 0;
	    const text = el.value;
	    const selection = [el.selectionStart, el.selectionEnd];
	    // hack from https://code.google.com/archive/p/proveit-js/source/default/source, highlightLengthAtIndex function
	    // note that this results in the element being scrolled; the actual number returned is irrelevant
	    el.value = text.slice(0, rng[0]);
	    el.scrollTop = Number.MAX_SAFE_INTEGER;
	    el.value = text;
	    el.setSelectionRange(...selection);
	    return el.scrollTop;
	  }
	
	  _nativeWrap() {
	    throw new Error("Cannot wrap in a text element");
	  }
	}
	
	/**
	@class
	@template {HTMLTextAreaElement} E
	@extends Range<E>
	*/
	class W3CRange extends Range {
	  /**@param {E|undefined} el */
	  constructor(el) {
	    super(el);
	    this._textProp = "textContent";
	  }
	
	  _nativeRange(bounds) {
	    const rng = this._doc.createRange();
	    rng.selectNodeContents(this._el);
	    if (bounds) {
	      w3cmoveBoundary(rng, bounds[0], true, this._el);
	      rng.collapse(true);
	      w3cmoveBoundary(rng, bounds[1] - bounds[0], false, this._el);
	    }
	    return rng;
	  }
	
	  _nativeSelect(rng) {
	    this._win.getSelection().removeAllRanges();
	    this._win.getSelection().addRange(rng);
	  }
	
	  _nativeSelection() {
	    const rng = this._nativeRange();
	    if (this._win.getSelection().rangeCount == 0)
	      return [this.length, this.length];
	    const sel = this._win.getSelection().getRangeAt(0);
	    return [w3cstart(sel, rng), w3cend(sel, rng)];
	  }
	
	  _nativeGetText(rng) {
	    return rng.toString();
	  }
	
	  _nativeSetText(text, rng) {
	    rng.deleteContents();
	    rng.insertNode(this._doc.createTextNode(text));
	    if (text == "\n" && this[1] + 1 == this._el.textContent.length) {
	      this._el.innerHTML = this._el.innerHTML + "\n";
	    }
	    this._el.normalize();
	  }
	
	  _nativeEOL() {
	    const rng = this._nativeRange(this.bounds());
	    rng.deleteContents();
	    const br = this._doc.createElement("br");
	    br.setAttribute("_moz_dirty", "");
	    rng.insertNode(br);
	    rng.insertNode(this._doc.createTextNode("\n"));
	    rng.collapse(false);
	  }
	
	  _nativeTop(rng) {
	    if (this.length == 0) return 0;
	    if (rng.toString() == "") {
	      var textnode = this._doc.createTextNode("X");
	      rng.insertNode(textnode);
	    }
	    const startrng = this._nativeRange([0, 1]);
	    const top =
	      rng.getBoundingClientRect().top - startrng.getBoundingClientRect().top;
	    if (textnode) textnode.parentNode.removeChild(textnode);
	    return top;
	  }
	
	  _nativeWrap(n, rng) {
	    rng.surroundContents(n);
	  }
	}
	
	// W3C internals
	function nextnode(node, root) {
		//  in-order traversal
		// we've already visited node, so get kids then siblings
		if (node.firstChild) return node.firstChild;
		if (node.nextSibling) return node.nextSibling;
		if (node === root) return null;
		while (node.parentNode) {
			// get uncles
			node = node.parentNode;
			if (node == root) return null;
			if (node.nextSibling) return node.nextSibling;
		}
		return null;
	}
	function w3cmoveBoundary(rng, n, bStart, el) {
		// move the boundary (bStart == true ? start : end) n characters forward, up to the end of element el. Forward only!
		// if the start is moved after the end, then an exception is raised
		if (n <= 0) return;
		var node = rng[bStart ? "startContainer" : "endContainer"];
		if (node.nodeType == 3) {
			// we may be starting somewhere into the text
			n += rng[bStart ? "startOffset" : "endOffset"];
		}
		while (node) {
			if (node.nodeType == 3) {
				const length = node.nodeValue.length;
				if (n <= length) {
					rng[bStart ? "setStart" : "setEnd"](node, n);
					// special case: if we end next to a <br>, include that node.
					if (n == length) {
	          let next;
						// skip past zero-length text nodes
						for (
							next = nextnode(node, el);
							next && next.nodeType == 3 && next.nodeValue.length == 0;
							next = nextnode(next, el)
						) {
							rng[bStart ? "setStartAfter" : "setEndAfter"](next);
						}
						if (next && next.nodeType == 1 && next.nodeName == "BR")
							rng[bStart ? "setStartAfter" : "setEndAfter"](next);
					}
					return;
				} else {
					rng[bStart ? "setStartAfter" : "setEndAfter"](node); // skip past this one
					n -= length; // and eat these characters
				}
			}
			node = nextnode(node, el);
		}
	}
	const START_TO_START = 0; // from the w3c definitions
	const START_TO_END = 1;
	const END_TO_END = 2;
	const END_TO_START = 3;
	// from the Mozilla documentation, for range.compareBoundaryPoints(how, sourceRange)
	// -1, 0, or 1, indicating whether the corresponding boundary-point of range is respectively before, equal to, or after the corresponding boundary-point of sourceRange.
	// * Range.END_TO_END compares the end boundary-point of sourceRange to the end boundary-point of range.
	// * Range.END_TO_START compares the end boundary-point of sourceRange to the start boundary-point of range.
	// * Range.START_TO_END compares the start boundary-point of sourceRange to the end boundary-point of range.
	// * Range.START_TO_START compares the start boundary-point of sourceRange to the start boundary-point of range.
	function w3cstart(rng, constraint) {
		if (rng.compareBoundaryPoints(START_TO_START, constraint) <= 0) return 0; // at or before the beginning
		if (rng.compareBoundaryPoints(END_TO_START, constraint) >= 0)
			return constraint.toString().length;
		rng = rng.cloneRange(); // don't change the original
		rng.setEnd(constraint.endContainer, constraint.endOffset); // they now end at the same place
		return constraint.toString().length - rng.toString().length;
	}
	function w3cend(rng, constraint) {
		if (rng.compareBoundaryPoints(END_TO_END, constraint) >= 0)
			return constraint.toString().length; // at or after the end
		if (rng.compareBoundaryPoints(START_TO_END, constraint) <= 0) return 0;
		rng = rng.cloneRange(); // don't change the original
		rng.setStart(constraint.startContainer, constraint.startOffset); // they now start at the same place
		return rng.toString().length;
	}
	
	/**
	@class
	@extends Range<Element>
	*/
	class NothingRange extends Range {
	  constructor() {
	    super();
	    this._textProp = "value";
	  }
	
	  _nativeRange(bounds) {
	    return bounds || [0, this.length];
	  }
	
	  _nativeSelect(rng) {
	    // do nothing
	  }
	
	  _nativeSelection() {
	    return [0, 0];
	  }
	
	  _nativeGetText(rng) {
	    return this._el[this._textProp].substring(rng[0], rng[1]);
	  }
	
	  _nativeSetText(text, rng) {
	    var val = this._el[this._textProp];
	    this._el[this._textProp] =
	      val.substring(0, rng[0]) + text + val.substring(rng[1]);
	  }
	
	  _nativeEOL() {
	    this.text("\n");
	  }
	
	  _nativeTop() {
	    return 0;
	  }
	
	  _nativeWrap() {
	    throw new Error("Wrapping not implemented");
	  }
	}
	
	// data for elements, similar to jQuery data, but allows for monitoring with custom events
	const monitored = new Set();
	
	function signalMonitor(prop, value, element) {
		const attr = `data-${prop}`;
		element.dispatchEvent(
			new CustomEvent(attr, { bubbles: true, detail: value })
		);
		try {
			element.setAttribute(attr, value); // illegal attribute names will throw. Ignore it
		} finally {
			/* ignore */
		}
	}
	
	function createDataObject(el) {
		return (el[datakey] = new Proxy(new Data(el), {
			set(obj, prop, value) {
				obj[prop] = value;
				if (monitored.has(prop)) signalMonitor(prop, value, obj.sourceElement);
				return true; // in strict mode, 'set' returns a success flag
			}
		}));
	}
	
	/**
	   @class
	  */
	function Data(el) {
		Object.defineProperty(this, "sourceElement", {
			value: el
		});
	}
	
	Data.prototype = {};
	// for use with ex options. JSON.stringify(range.data) should return only the options that were
	// both defined with bililiteRange.option() *and* actually had a value set on this particular data object.
	// JSON.stringify (range.data.all) should return all the options that were defined.
	Object.defineProperties(Data.prototype, {
	  toJSON: {
	    value() {
	      let ret = {};
	      for (let key in Data.prototype)
	        if (this.hasOwnProperty(key)) ret[key] = this[key];
	      return ret;
	    }
	  },
	  all: {
	    get() {
	      let ret = {};
	      for (let key in Data.prototype) ret[key] = this[key];
	      return ret;
	    }
	  },
	  trigger: {
	    value() {
	      monitored.forEach((prop) =>
	        signalMonitor(prop, this[prop], this.sourceElement)
	      );
	    }
	  }
	});
	
	bililiteRange.createOption = function createOption(name, desc = {}) {
		desc = Object.assign(
			{
				enumerable: true, // use these as the defaults
				writable: true,
				configurable: true
			},
			Object.getOwnPropertyDescriptor(Data.prototype, name),
			desc
		);
		if ("monitored" in desc) monitored[desc.monitored ? "add" : "delete"](name);
		Object.defineProperty(Data.prototype, name, desc);
		return Data.prototype[name]; // return the default value
	};
	
	module.exports.Range = Range;
	module.exports.InputRange = InputRange;
	module.exports.W3CRange = W3CRange;
}
,
(require, module)=>{
/*************************************************
	 *     source: bililiteRange.find.js
	 *       file: bililiteRange.find.js
	 *       repo: 
	 *     commit: eb6a24a
	 *    version: 5.0.0
	 *       date: 2024-05-09
	 ************************************************/
	const { bililiteRange } = require('./bililiteRange.js');
	
	bililiteRange.createOption('dotall', {value: false});
	bililiteRange.createOption('global', {value: false});
	bililiteRange.createOption('ignorecase', {value: false});
	bililiteRange.createOption('magic', {value: true});
	bililiteRange.createOption('multiline', {value: false});
	bililiteRange.createOption('unicode', {value: false});
	bililiteRange.createOption('wrapscan', {value: true});
	
	bililiteRange.bounds.find = function (name, restring, flags = ''){
		return find (this, restring, 'V'+flags);
	};
	
	bililiteRange.override('bounds', function (re, flags = ''){
		// duck typed RegExps are OK, allows for flags to be part of re
		if (!(re instanceof Object && 'source' in re && 'flags' in re)) return this.super(...arguments);
		return find (this, re.source, flags + re.flags);
	});
	
	bililiteRange.prototype.replace = function (search, replace, flags = ''){
		if (search instanceof Object && 'source' in search && 'flags' in search){
			// a RegExp or similar
			flags = flags + search.flags;
			search = search.source;
		}else{
			search = search.toString();
			flags = 'V' + flags;
		}
		return this.text(
			replaceprimitive (search, parseFlags(this, flags), this.all(), replace, this[0], this[1]),
			{ inputType: 'insertReplacementText' }
		);
	}
	
	bililiteRange.createOption ('word', {value: /\b/});
	bililiteRange.createOption ('bigword', {value: /\s+/});
	bililiteRange.createOption ('sentence', {value: /\n\n|\.\s/});
	bililiteRange.createOption ('paragraph', {value: /\n\s*\n/});
	bililiteRange.createOption ('section', {value: /\n(<hr\/?>|(-|\*|_){3,})\n/i});
	bililiteRange.createOption ('()', {value: [/\(/, /\)/] });
	bililiteRange.createOption ('[]', {value: [/\[/, /]/] });
	bililiteRange.createOption ('{}', {value: [/{/, /}/] });
	bililiteRange.createOption ('"', {value: [/"/, /"/] });
	bililiteRange.createOption ("'", {value: [/'/, /'/] });
	
	bililiteRange.bounds.to = function(name, separator, outer = false){
		if (separator in this.data) separator = this.data[separator];
		if (separator.length == 2) separator = separator[1];
		if (!(separator instanceof RegExp)) separator = new RegExp (quoteRegExp (separator));
		// end of text counts as a separator
		const match = findprimitive(`(${separator.source})|$`, 'g'+separator.flags, this.all(), this[1],  this.length);
		return this.bounds('union', outer ? match.index + match[0].length : match.index);
	};
	
	bililiteRange.bounds.from = function(name, separator, outer = false){
		if (separator in this.data) separator = this.data[separator];
		if (separator.length == 2) separator = separator[0];
		if (!(separator instanceof RegExp)) separator = new RegExp (quoteRegExp (separator));
		// start of text counts as a separator
		const match = findprimitiveback(`(${separator.source})|^`, 'g'+separator.flags, this.all(), 0,  this[0]);
		return this.bounds('union', outer ? match.index : match.index + match[0].length);
	};
	
	bililiteRange.bounds.whole = function(name, separator, outer = false){
		if (separator in this.data) separator = this.data[separator];
		// if it's a two-part separator (like parentheses or quotes) then "outer" should include both.
		return this.bounds('union', 'from', separator, outer && separator?.length == 2).bounds('union', 'to', separator, outer);
	};
	
	//------- private functions -------
	
	function find (range, source, sourceflags){
		const {
			backward,
			magic,
			restricted,
			sticky,
			wrapscan,
			flags
		} = parseFlags (range, sourceflags + 'g');
		if (!magic) source = quoteRegExp (source);
		const findfunction = backward ? findprimitiveback : findprimitive;
		let from, to;
		if (restricted){
			from = range[0];
			to = range[1];
		}else if (backward){
			from = 0;
			to = range[0];
		}else{
			from = range[1];
			to = range.length;
		}
		let match = findfunction (source, flags, range.all(), from, to);
		if (!match && wrapscan && !sticky && !restricted){
			match = findfunction(source, flags, range.all(), 0, range.length);
		}
		range.match = match || false; // remember this for the caller
		if (match) range.bounds([match.index, match.index+match[0].length]); // select the found string
		return range;
	}
	
	function parseFlags (range, flags){
		let flagobject = {
			b: false,
			g: range.data.global,
			i: range.data.ignorecase,
			m: range.data.multiline,
			r: false,
			s: range.data.dotall,
			u: range.data.unicode,
			v: range.data.magic,
			w: range.data.wrapscan,
			y: false
		};
		flags.split('').forEach( flag => flagobject[flag.toLowerCase()] = flag === flag.toLowerCase() );
		return {
			// these are the "real" flags
			flags: (flagobject.g ? 'g' : '') + (flagobject.i ? 'i' : '') + (flagobject.m ? 'm' : '') +
				(flagobject.s ? 's' : '') + (flagobject.u ? 'u' : '') + (flagobject.y ? 'y' : ''),
			backward: flagobject.b,
			global: flagobject.g,
			magic: flagobject.v,
			restricted: flagobject.r,
			wrapscan: flagobject.w,
			sticky: flagobject.y
		};
	}
	
	function quoteRegExp (source){
		// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
		return source.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
	}
	
	function findprimitive (source, flags, text, from, to){
		// code from https://github.com/idupree/bililiteRange/tree/findback-greedy-correctness
		if (to < text.length){
			// make sure that there are at least length-to characters after the match
			source = `(?:${source})(?=[^]{${text.length-to}})`;
		}
		const re = new RegExp (source, flags);
		re.lastIndex = from;
		return re.exec(text);
	}
	
	function findprimitiveback (source, flags, text, from, to){
		// code from https://github.com/idupree/bililiteRange/tree/findback-greedy-correctness
		if (to < text.length){
			// make sure that there are at least length-to characters after the match
			source = `(?:${source})(?=[^]{${text.length-to}})`;
		}
		if (/y/.test(flags)){
			// sticky. Only match the end of the string.
			flags = flags.replace('y','');
			source = `(?:${source})(?![^]{${text.length-to+1}})`; // *don't* match too many characters
			// this works even if $ won't, if multiline is true
			const re = new RegExp (source, flags);
			re.lastIndex = from;
			return re.exec(text);
		}else{
			// no way to search backward; have to search forward until we fail
			const re = new RegExp (source, flags);
			re.lastIndex = from;
			let match = false;
			do {
				var lastmatch = match;
				match = re.exec(text);
				if (match && re.lastIndex == match.index) ++re.lastIndex; // beware zero-length matches and infinite loops
			}while (match);
			return lastmatch;
		}
	}
	
	function replaceprimitive (search, flagobject, text, replace, from, to){
		if (!flagobject.magic) search = quoteRegExp (search);
		if (from > 0){
			// make sure we have at least (from) characters before the match
			search = `(?<=[^]{${from}})(?:${search})`;
		}
		if (to < text.length){
			// make sure we have at least (length - to) characters after the match
			search = `(?:${search})(?=[^]{${text.length - to}})`;
		}
		if (flagobject.sticky && flagobject.backward){
			flagobject.flags = flagobject.flags.replace(/[gy]/g, '');
			// make sure we don't have too many characters after the match
			search = `(?:${search})(?![^]{${text.length - to + 1}})`;
		}else if (flagobject.backward && ! flagobject.global){
			// would anyone ever do this? Replace only the last match?
			const match = findprimitiveback (search, flagobject.flags+'g', text, from, to);
			if (!match) return text.slice (from, to); // no match, no change
			search = `(?<=[^]{${match.index}})(?:${search})`;
		}
		const re = new RegExp (search, flagobject.flags);
		re.lastIndex = from; // only relevant for sticky && !backward
		// if to == length, then go to the end of the string,not to position 0!
		return text.replace (re, replace).slice(from, to-text.length || undefined);
	}
	
	module.exports = bililiteRange;
}
,
(require, module)=>{
/*************************************************
	 *     source: bililiteRange.lines.js
	 *       file: bililiteRange.lines.js
	 *       repo: 
	 *     commit: eb6a24a
	 *    version: 5.0.0
	 *       date: 2024-05-09
	 ************************************************/
	const { bililiteRange } = require('./bililiteRange.js');
	
	
	// a line goes from after the newline to before the next newline. The newline is not included in that line! It's
	// a separator only.
	bililiteRange.bounds.EOL = function () {
		const nextnewline = this.all().indexOf('\n', this[1]);
		if (nextnewline != -1) return nextnewline;
		return this.bounds('end'); // no newline
	};
	bililiteRange.bounds.BOL = function(){
		if (this[0] == 0) return 0;
		const prevnewline = this.all().lastIndexOf('\n', this[0]-1);
		if (prevnewline != -1) return prevnewline + 1;
		return 0; // no newline
	};
	bililiteRange.bounds.line = function (name, n, n2){
		if (n == null){
			// select the entire line or lines including the newline
			return this.bounds('union', 'BOL').bounds('union', 'EOL');
		}else if (n2 == null){
			// select one line. Note that it is 1-indexed, the way ex does it!
			n = parseInt(n);
			if (isNaN(n)) return this.bounds();
			if (n < 1) return [0,0];
			const mynewline = (new RegExp(`^(.*\n){${n}}`)).exec(this.all()); // find the nth newline
			if (mynewline == null){
				this.bounds('end');
				// if this is the last line but it doesn't end with a newline, then accept the whole line
				if (this.all().split('\n').length == n) this.bounds('line');
				return this;
			}
			return this.bounds(mynewline[0].length-1).bounds('line');
		}else{
			return this.bounds('line', n).bounds('union', 'line', n2);
		}
	};
	bililiteRange.bounds.andnewline = function(){
		// if we want a "line" to include the following newline, use this
		if (this.all().charAt(this[1]) == '\n') return this.bounds('union', this[1]+1);
	}
	bililiteRange.bounds.char = function (name, n){
		// move to character position n in the line of the start of this range.
		this.bounds('EOL');
		this.bounds('BOL').bounds('line');
		if (this.bounds('BOL').bounds('line').text().length < n){
			return this.bounds('EOL');
		}else{
			return this[0] + n;
		}
	};
	
	bililiteRange.createOption ('autoindent', {value: false});
	bililiteRange.override ('text', function (text, opts = {}){
		if ( text === undefined ) return this.super();
		if (opts.ownline && text[0] != '\n' && this[1] > 0) text = `\n${text}`;
		if (opts.ownline && this.all().charAt(this[1]) != '\n') text = `${text}\n`;
		if (opts.autoindent == 'invert') opts.autoindent = !this.data.autoindent;
		if (opts.autoindent || (opts.autoindent == null && this.data.autoindent && opts.inputType == 'insertLineBreak')){
			text = indent(text, this.indentation());
		}
		return this.super(text, opts);
	});
	
	bililiteRange.createOption ('tabsize', { value: 2, monitored: true }); // 8 is the browser default
	bililiteRange.addStartupHook ( (element, range, data) => {
		element.style.tabSize = element.style.MozTabSize = data.tabsize; // the initial value will be set before we start listening
		range.listen('data-tabsize', evt => element.style.tabSize = element.style.MozTabSize = evt.detail);
	});
	
	bililiteRange.extend({
		char: function(){
			return this[0] - this.clone().bounds('BOL')[0];
		},
		indent: function (tabs){
			// tabs is the string to insert before each line of the range
			this.bounds('union', 'BOL');
			// need to make sure we add the tabs at the start of the line in addition to after each newline
			return this.text(tabs + indent (this.text(), tabs), {select: 'all', inputType: 'insertReplacementText'});
		},
		indentation: function(){
			// returns the whitespace at the start of this line
			return /^\s*/.exec(this.clone().bounds('line').text())[0];
		},
		line: function(){
			// return the line number of the *start* of the bounds. Note that it is 1-indexed, the way ex writes it!
			// just count newlines before this.bounds
			return this.all().slice(0, this[0]).split('\n').length;
		},
		lines: function(){
			const start = this.line();
			const end = this.clone().bounds('endbounds').line();
			return [start, end];
		},
		unindent: function (n, tabsize){
			// remove n tabs or sets of tabsize spaces from the beginning of each line
			tabsize = tabsize || this.data.tabsize;
			return this.bounds('line').text(unindent(this.text(), n, tabsize), {select: 'all', inputType: 'insertReplacementText'});
		},
	});
	
	bililiteRange.sendkeys['{ArrowUp}'] = bililiteRange.sendkeys['{uparrow}'] = function (rng){
		const c = rng.char();
		rng.bounds('line', rng.line()-1).bounds('char', c);
	};
	bililiteRange.sendkeys['{ArrowDown}'] = bililiteRange.sendkeys['{downarrow}'] = function (rng){
		const c = rng.char();
		rng.bounds('line', rng.line()+1).bounds('char', c);
	};
	bililiteRange.sendkeys['{Home}'] =  function (rng){
		rng.bounds('BOL');
	};
	bililiteRange.sendkeys['{End}'] =  function (rng){
		rng.bounds('EOL');
	};
	
	// utilities
	
	function indent(text, tabs){
		return text.replace(/\n/g, '\n' + tabs);
	}
	function unindent(str, count, tabsize){
		// count can be an integer >= 0 or Infinity.
		// (We delete up to 'count' tabs at the beginning of each line.)
		// If invalid, defaults to 1.
		//
		// tabsize can be an integer >= 1.
		// (The number of spaces to consider a single tab.)
		tabsize = Math.round(tabsize);
		count = Math.round(count);
		if (!isFinite(tabsize) || tabsize < 1) tabsize = 4;
		if (isNaN(count) || count < 0) count = 1;
		if (!isFinite(count)) count = '';
		const restart = new RegExp(`^(?:\t| {${tabsize}}){1,${count}}`, 'g');
		const remiddle = new RegExp(`(\\n)(?:\t| {${tabsize}}){1,${count}}`, 'g');
		return str.replace(restart, '').replace(remiddle, '$1');
	}
	
	module.exports = bililiteRange;
}
,
(require, module)=>{
/*************************************************
	 *     source: jquery.sendkeys.js
	 *       file: jquery.sendkeys.js
	 *       repo: 
	 *     commit: eb6a24a
	 *    version: 5.0.0
	 *       date: 2024-05-09
	 ************************************************/
	"use strict";
	
	(function ($) {
	  if ($ == null) return; // no jQuery. Give up
	
	  const { bililiteRange } = require('./bililiteRange.js');
	
	  $.bililiteRange = bililiteRange;
	
	  $.fn.bililiteRange = function (x) {
	    return this.map(function () {
	      return bililiteRange(this);
	    });
	  };
	
		$.fn.sendkeys = function (x) {
			return this.each(function () {
				bililiteRange(this).bounds("selection").sendkeys(x).select();
				this.focus();
			});
		}; // sendkeys
	
		// add a default handler for keydowns so that we can send keystrokes, even though code-generated events
		// are untrusted (http://www.w3.org/TR/DOM-Level-3-Events/#trusted-events)
		// documentation of special event handlers is at http://learn.jquery.com/events/event-extensions/
		$.event.special.keydown = $.event.special.keydown || {};
		$.event.special.keydown._default = function (evt) {
			if (evt.isTrusted) return false;
			if (evt.key == null) return false; // nothing to print. Use the keymap plugin to set this
			if (evt.ctrlKey || evt.altKey || evt.metaKey) return false; // only deal with printable characters.
			var target = evt.target;
			if (
				target.isContentEditable ||
				target.nodeName == "INPUT" ||
				target.nodeName == "TEXTAREA"
			) {
				// only insert into editable elements
				var key = evt.key;
				if (key.length > 1 && key.charAt(0) != "{") key = "{" + key + "}"; // sendkeys notation
				$(target).sendkeys(key);
				return true;
			}
			return false;
		};
	})(typeof jQuery === "undefined" ? null : jQuery);
}

]);
