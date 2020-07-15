# Cross-Browser Text Ranges and Selections

`bililiteRange(element)` returns an abstraction of a range of characters within element, initially all of the element.
The range never extends outside the element. `element` is a DOM element (but it fails for the `<body>` element).

It works for `<input>`, `<textarea>` and any other `HTMLELement` (though they should have `contenteditable` set to be useful).

It treats the elements as a series of characters, which means that elements should use `white-space: pre` because it will not collapse
white space and counts newlines as characters. It also doesn't count `display: block` as ending in a newline (unless it actually does).
The major use case is a pretty-printing editor (I use [Prism](https://prismjs.com/index.html)).

## Methods

### `0`
Returns or sets the beginning of the range, so you can use it like an array: `range[0] = 2`.

### `1`
Returns or sets the end of the range, so you can use it like an array: `range[1] = 6`. The two together are equivalent to
`range.bounds[2,6])`.

### `all()`

Returns the entire text of the element without changing the bounds of the range.

### `all(text: string)`

Sets the entire text of the element to text without changing the bounds of the range.

### `bounds()`

Returns an array, `[start, end]` of the bounds of the current range. `start` is always >= 0 and `end` is always <= length of the
text of the entire element.

### `bounds(b: array)`
Sets the bounds of the current range to the `b`. Does not throw an error for limits out of bounds, just silently limits it.

### `bounds(s: string)`
Looks for a function `bililiteRange[s]` that is called with `this` set to the current `bililiteRange`, and sets the bounds.
Predefined functions include:

- `bounds('all')`: sets the range to cover the entire element.
- `bounds('selection')` sets the range to the part of the current selection that is in the element.
	
This only uses the actual selection if the element is the same as document.activeElement; if the element is not active,
then bililiteRange sets up event listeners to remember the selection from when the element was the active element,
and uses that.

- `bounds('start')` sets the range to `[0,0]`.
- `bounds('end')` sets the range to `[length, length]`.

### `clone()`
Return a new bililiteRange with the same bounds as this one.

### `data`
Returns an object tied to the underlying element, useful for storing element (rather than per range). Similar to
jQuery's [`data`](https://api.jquery.com/data/). See the documentation for [bililiteRange data](data.md).

### `element()`
Returns the DOM element that the range was defined on.

### `scrollIntoView([fn: function])`
Does its best to scroll the beginning of the range into the visible part of the element, by analogy to `Element.scrollIntoView()`.
See [scrollIntoView](scrollIntoView) for more details. Note that it does not move the element itself, just sets `element.scrollTop` so
that the start of the range is within the visible part of the element. If it already visible, does nothing.
This only scrolls vertically, not horizontally.

The function passed in used to do the scrolling, with one parameter that is the target scrollTop, and `this` set to the element itself.
So, to animate the scrolling, use `range.scrollIntoView( top => { $(this).animate({scrollTop: top}) })`. 
The default function is `top => { this.scrollTop = top }`.

### `select()`
If the element is the same as `document.activeElement`, then set the window selection to the current range. 
if the element is not active, change the saved selection to the current range, and use that for `bounds('selection')`.
Sets up event listeners so that when the element is activated, the saved selection is restored (except if the element is activated
by a mouse click, where the click location determines the selection). This means that tabbing into an element restores the previous selection.

Note that this does not set the focus on the element; use `range.element().focus()` to do that. Note also that elements that 
are not editable and do not have a tabindex cannot be focussed.

### `selection()`
Short for `range.bounds('selection').text()`, to get the text currently selected.

### `selection(s: string)`
Short for `range.bounds('selection').text(s, 'end').select()`; useful for inserting text at the insertion point.
This just inserts the String argument straight in the text; for a more sophisticated function, see `sendkeys` below.

### `sendkeys(s: string)`
Basically does text(s, 'end') but interprets brace-surrounded words (like `'{Backspace}'` as special commands that execute the
corresponding functions in `bililiteRange.sendkeys`, in this case `bililiteRange.sendkeys['{Backspace}']`.
See the [full documentation](sendkeys.md).

### `text()`
Returns the text of the current range.

### `text(s: string, [, 'start'|'end'|'all' [, inputType = 'insertText']])`
Sets the text of the current range to s. If the second argument is present, also sets bounds, to the start of the inserted text,
the end of the inserted text (what happens with the usual "paste" command
or the entire inserted text. Follow this with select() to actually set the selection.

For
consistency with [Input Events](https://www.w3.org/TR/input-events-1/), also triggers `beforeinput` and `input` events on the element.
The `inputType` is determined by the third parameter. The `data` field is set to `s` (potentially an empty string, unlike 
Chrome, which sets the `data` field to
`undefined` if no text is being inserted). Since this is not enough to fully determine the change made, another field is set on the `Event`
object: 

````js
let e = new Event('input');
e.bililiteRange = {
	oldText, // the content of the range before it was changed
	newText, // s, the text inserted
	start,  // bounds[0], where the text was inserted
	unchanged // boolean, true if oldText == newText
}
````
`bililiteRange` also sets up event listeners on `InputEvents` to add this field to browser-generated event objects.

### `top()`
Returns the `offsetTop` for the range--the pixels from the top of the padding box of the element to the beginning of the range.
Will be negative if the element is scrolled so that the range is above the visible part of the element.
To scroll the element so that the range is at the top of the element, set `range.element().scrollTop = range.top()`.
See `range.scrollIntoView()` above.

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
bililiteRange.override ('text', (text, opts) => {
	text = censor(text); // left as an exercise for the reader
	return this.super(text, opts);
}) 
````

## Events

### `dispatch(opts)`
Creates an event of type `opts.type`, then extends it with the rest of `opts`, and dispatches it on `range.element()`. Basically does:

````js
let event =  new CustomEvent(opts.type);
for (let key in opts) event[key] = opts[key];
this.element().dispatchEvent(event); // but actually does this asynchonously, on the event queue
````

### `listen(s, fn)`

Shorthand for `this.element().addEventListener(s, fn)`.

### `dontlisten(s, fn)`
Shorthand for `this.element().removeEventListener(s, fn)`.

## Other files

### `bililiteRange.util.js`

Adds useful functions for searching and keeping the ranges up-to-date with changes in the underlying text. 
Depends on `bililiteRange.js`. [Documentation](util.md)

### `bililiteRange.undo.js`

Adds an undo/redo stack to editable elements. Depends on `bililiteRange.js` and my [historystack](https://github.com/dwachss/historystack).
[Documentation](undo.md)

### `bililiteRange.ex.js`

Implements the [ex line-editor](http://ex-vi.sourceforge.net/ex.html). Depends on `bililiteRange.js`, `bililiteRange.util.js` and
`bililiteRange.undo.js`. Works better with my [toolbar](https://github.com/dwachss/toolbar) and
[status](https://github.com/dwachss/status). [Documentation](ex.md)

## Obsolete files

`jquery.jsvk.js` is a jQuery wrapper for Ilya Lebedev's JavaScript VirtualKeyboard (http://www.allanguages.info/), which is apparently now
dead. Depends on
bililiteRange for character insertion. [Documentation](http://bililite.com/blog/2013/01/30/jsvk-a-jquery-plugin-for-virtualkeyboard/)

If you want it, it is on the [IE branch](https://github.com/dwachss/bililiteRange/blob/IE/jquery.jsvk.js).


