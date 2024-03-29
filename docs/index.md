# Cross-Browser Text Ranges and Selections

`bililiteRange(element)` returns an abstraction of a range of characters within element, initially all of the element.
The range never extends outside the element. `element` is a DOM element. It's not a constructor;
you don't have to use `new bililiteRange()` 
(though that [does work](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new)).

It works for `<input>`, `<textarea>` and any other `HTMLELement` (though they should have `contenteditable` set to be useful).

It treats the elements as a series of characters, which means that elements should use `white-space: pre` because it will not collapse
white space and counts newlines as characters. It also doesn't count `display: block` as ending in a newline (unless it actually does).
The major use case is a pretty-printing editor (I use [Prism](https://prismjs.com/index.html)).

## Methods

Any method that does not have an explicit return value returns the range itself, so methods can be chained:
`range.all('foo bar').bounds('start').text('baz ').sendkeys('{ArrowLeft}').select()` sets the text of the element to 
`"baz foo bar"`, with the selection point right after `baz`.

### `0`
Returns or sets the beginning of the range, so you can use it like an array: `range[0] = 2`. Set returns the new value.

### `1`
Returns or sets the end of the range, so you can use it like an array: `range[1] = 6`.  Set returns the new value.
The two together are equivalent to
`range.bounds[2,6])`.

### `all()`

Returns the entire text of the element without changing the bounds of the range.

### `all(text: string)`

Sets the entire text of the element to `text` and sets the bounds to cover the entire range.

### `bounds()`

Returns an array, `[start, end]` of the bounds of the current range. `start` is always >= 0 and `end` is always <= length of the
text of the entire element.

### `bounds(b: array)`
Sets the bounds of the current range to the `b`. Does not throw an error for limits out of bounds, just silently limits them.

### `bounds(n: number)`
Shortcut for `bounds([n,n])`.

### `bounds(r: bililiteRange)`
Sets the bounds of the current range to those of `r`.

### `bounds(s: string)`
Looks for a function `bililiteRange.bounds[s]` that is called with `this` set to the current `bililiteRange`, and sets the bounds.
Predefined functions include:

- `bounds('all')`: sets the range to cover the entire element.
- `bounds('selection')` sets the range to the part of the current selection that is in the element.
	
This only uses the actual selection if the element is the same as document.activeElement; if the element is not active,
then bililiteRange sets up event listeners to remember the selection from when the element was the active element,
and uses that.

Several other `bounds` functions are defined, and it is possible to create new `bounds` functions. See the [documentation](bounds.md).

### `clone()`
Return a new bililiteRange with the same bounds as this one.

### `data`
Returns an object tied to the underlying element, useful for storing information per element (rather than per range). Similar to
jQuery's [`data`](https://api.jquery.com/data/). See the documentation for [bililiteRange data](data.md).

### `document`
Returns `element.ownerDocument`.

### `element`
Returns the DOM element that the range was defined on.

### `length`
Returns `range.text().length`.

### `live(on = true)`

If the `on` argument is `true` (or undefined, since `true` is the default), makes this range "live": sets up an input listener
that will adjust the bounds to track changes in the text of the element. Changes after the bounds do nothing; changes before the bounds
move the bounds, and changes within the bounds change the bounds so the range still refers to the replacement text. Similar to bookmarks
in Microsoft Word, except that deleting the entire text of the range does not remove or move the range; it just becomes a zero-length range.

`live(false)` removes the input listener, so the range is no longer adjusted.

Under the hood, there is a single input listener that goes through a 
[`Set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) of ranges that are adjusted.
That means there is a potential memory leak: any live range will not be garbage collected. Do `range.live(false)` to remove the
reference.

### `scrollIntoView()`
Does its best to scroll the beginning of the range into the visible part of the element, by analogy to `Element.scrollIntoView()`.
Note that it does not move the element itself, just sets `element.scrollTop` so
that the start of the range is within the visible part of the element. If it already visible, does nothing.
This only scrolls vertically, not horizontally.

This works differently for `<pre>` elements, which generally move the range to the top of the element, and `<textarea>` elements, which generally move the range to the bottom of the element.

A previous version allowed you to pass a function to do animated scrolling, but it never worked consistently, so it has been removed.

### `select()`
If the element is the same as `document.activeElement`, then set the window selection to the current range. 
if the element is not active, change the saved selection to the current range, and use that for `bounds('selection')`.
Sets up event listeners so that when the element is activated, the saved selection is restored (except if the element is activated
by a mouse click, where the click location determines the selection). This means that tabbing into an element restores the previous selection.

Note that this does not set the focus on the element; use `range.element.focus()` to do that. Note also that elements that 
are not editable and do not have a tabindex cannot be focussed.

### `selection()`
Short for `range.bounds('selection').text()`, to get the text currently selected.

### `selection(s: string)`
Short for `range.bounds('selection').text(s, 'end').select()`; useful for inserting text at the insertion point.
This just inserts the string argument straight in the text; for a more sophisticated function, see `sendkeys` below.

### `sendkeys(s: string)`
Basically does text(s, 'end') but interprets brace-surrounded words (like `'{Backspace}'` as special commands that execute the
corresponding functions in `bililiteRange.sendkeys`, in this case `bililiteRange.sendkeys['{Backspace}']`.
See the [full documentation](sendkeys.md).

### `text()`
Returns the text of the current range.

### `text(s: string, [opts])`
Sets the text of the current range to `s`. The bounds are adjusted to cover the new text.

For
consistency with [Input Events](https://www.w3.org/TR/input-events-1/), also triggers `beforeinput` and `input` events on the element.
The `inputType` is determined by `opts.inputType`, with a default value of `'insertText'`. The `data` field is set to `s` (potentially an empty string, unlike 
Chrome, which sets the `data` field to
`undefined` if no text is being inserted). Since this is not enough to fully determine the change made, 
another field is set on the `Event`
object: 

````js
let e = new Event('input');
e.inputType = opts.inputType || 'insertText';
e.bililiteRange = {
	oldText, // the content of the range before it was changed
	newText, // s, the text inserted
	start,  // bounds[0], where the text was inserted
	unchanged // boolean, true if oldText == newText
}
````
`bililiteRange` also sets up event listeners on `InputEvents` to add this field to browser-generated event objects.

### `top()` *deprecated*
This works for `<pre>` elements but not for `<textarea>` elements and is irrelevant for `<input>` elements. Since I have been unable
to find any way to make this work consistently, and I've never used it, I'm deprecating it and will eventually remove it.

Returns the `offsetTop` for the range--the pixels from the top of the padding box of the element to the beginning of the range.
Will be negative if the element is scrolled so that the range is above the visible part of the element.
To scroll the element so that the range is at the top of the element, set `range.element.scrollTop = range.top()`.


### `window`
Returns [`element.document.defaultView`](https://developer.mozilla.org/en-US/docs/Web/API/Document/defaultView).

### `wrap(Node)`
Wraps the range with the DOM Node passed in (generally will be an HTML element). Only works 
with ranges defined on the DOM itself; throws an error for ranges in `<input>` or `<textarea>` elements. 
Depending on the browser, will throw an error for invalid HTML (like wrapping a `<p>` with a `<span>`). For example, to highlight 
the range, use `range.wrap ( document.createElement('strong') )`;

## Extensions

### `bililiteRange.prototype`

Even though `bililiteRange` is a function, not a class (use `r = bililiteRange(el)`, not `r = new bililiteRange(el)`), it is based on
internal classes, and adding a method to `bililiteRange.prototype` makes it available to all ranges. So

````js
bililiteRange.prototype.log = () => {
	console.log(this.bounds(), ': ', this.text());
	return this; // always good to return this to allow for chaining
}
````

allows for 

````js
let r = bililiteRange(el);
r.all('hello, world').bounds([0,5]).log(); // on the console: [0,5]: "hello"
````

As a shorthand (based on [jQuery extend](https://api.jquery.com/jQuery.fn.extend/)) there is

### `bililiteRange.extend(obj)`

Adds all the enumerable members of obj to `bililiteRange.prototype`, with `Object.assign (bililiteRange.prototype, obj)`.

### `bililiteRange.override (name, fn)`

Allows [monkey patching](https://en.wikipedia.org/wiki/Monkey_patch) methods. Replaces `bililiteRange.prototype[name]` with a function
that creates `this.super` with the old value of `bililiteRange.prototype[name]` and calls the `fn`. So, for example, to censor
forbidden words:

````js
bililiteRange.override ('text', function (text, opts) { // need to use "function", not arrow notation, to use "this"
	text = censor(text); // left as an exercise for the reader
	return this.super(text, opts);
}) 
````

## Events

### `dispatch(opts)`
Creates an event of type `opts.type`, then extends it with the rest of `opts`, and dispatches it on `range.element`. Basically does:

````js
let event =  new Event(opts.type);
for (let key in opts) event[key] = opts[key];
this.element.dispatchEvent(event);
````

Note that dispatchEvent is *synchronous*, meaning that the event handlers will all be run before returning from `range.dispatch()`.

### `listen(s, fn = console.log, target = this.element)`

Shorthand for `target.addEventListener(s, fn)`.

### `dontlisten(s, n = console.log, target = this.element)`
Shorthand for `target.removeEventListener(s, fn)`.

## "Globals"

There are a few methods and fields defined on the `bililiteRange` namespace, that act as "global" variables, applicable to all
`bililiteRanges`

### `bililiteRange.addStartupHook`

`bililiteRange.addStartupHook ( fn )` adds `fn` to a `Set` of functions that are run when a `bililiteRange` is defined on an element for
the first time. The function is called with `fn (element, range, data)`, the HTMLELement, the range that is being created, and `range.data`.
This is how to add listeners for [monitored data](data.md#monitored-options):

```js
bililiteRange.createOption ('size', {value: 100, monitored: true});
bililiteRange.addStartupHook( (element, range, data) => {
	console.log (`starting an element with size = ${data.size}`); // the listener below will only be called on changes to the data
	element.addEventListener ( 'data-size', evt => console.log (`changing size to ${evt.detail}`);
});
```

### `bililiteRange.bounds`

See the [bounds documentation](bounds.md#custom-functions).

### `bililiteRange.createOption`

See the [data documentation](data.md#options).

### `bililiteRange.diff`

`bililiteRange.diff (oldText, newText)` is a convenience function that compares two texts and returns an object:

```js
{
	unchanged, // true if oldText == newText, false otherwise
	start, // character position where the two texts start to differ
	oldText, // part of oldText that has been removed
	newText // part of newText that has been added
}
```

### `bililiteRange.override`

See [above](#bililiterangeoverride-name-fn).

### `bililiteRange.sendkeys`

See the [sendkeys documentation](sendkeys.md#plugins).

### `bililiteRange.version`

Returns the version number.



## Other files

### `bililiteRange.find.js`

Implements searching with ranges. See the [documentation](find.md).

### `bililiteRange.lines.js`

Adds useful functions for searching and keeping the ranges up-to-date with changes in the underlying text. 
Depends on `bililiteRange.js`. See the [documentation](lines.md).

### `bililiteRange.undo.js`

Adds an undo/redo stack to editable elements. Depends on `bililiteRange.js` and my [historystack](https://github.com/dwachss/historystack).
See the [documentation](undo.md).

### `bililiteRange.ex.js`

Implements the [ex line-editor](http://ex-vi.sourceforge.net/ex.html). Depends on `bililiteRange.js`, `bililiteRange.util.js` and
`bililiteRange.undo.js`. See the [documentation](ex.md).

### `bililiteRange.evim.js`

Implements all the pieces to use `bililite.ex.js`, with keystroke mapping and toolbar buttons. Works
with my [toolbar](https://github.com/dwachss/toolbar) and
[status](https://github.com/dwachss/status).
See the [documentation](evim.md).

This is a subset of `vim` in [visual mode](https://vimhelp.org/visual.txt.html#Visual) with the key mappings I wanted.

### `jquery.sendkeys.js`
jQuery wrapper for `bililiteRange.prototype.sendkeys`, with a `keydown` handler that allows for synthetic (untrusted) `keydown` events to
insert text. See the [documentation](jquery.sendkeys.md).

