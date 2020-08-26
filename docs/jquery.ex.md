# jQuery ex editor

`jquery.ex.js` puts all of the other projects together. It creates a text editor from an element, using allowing 
[`bililiteRange.ex.js`](ex.md) commands
and using my [`toolbar`](../../toolbar/index.md) project to create buttons, and my [`status`](../../status/index.md) project to display
messages and errors.

## Usage

### Structure

```html
<div id=toolbar></div>
<textarea id=editor></textarea>
<div id=statusbar></div>
```
or
```html
<div id=toolbar></div>
<pre contenteditable id=editor></pre>
<div id=statusbar></div>
```

### Javascript

```js
$('#editor').ex($('#toolbar'), $('#statusbar'));
```

The first argument to $.fn.ex is the element to contain the toolbar, and the second is the element to contain the message line and 
the input element for `ex` commands.

### Demo

[An editor with live Markdown conversion and some silly toolbar buttons and key mappings](../test/littleeditor.html).

## Key Mappings

It includes a number of key mappings that are based on [VIM](https://vimhelp.org/), but that I found more useful. 

All commands start with `ctrl-o` (like [evim](https://vimhelp.org/starting.txt.html#evim-keys)).

There are really only three commands:

1. `ctrl-o :` allows entry of any [ex](ex.md) command.
2. `ctrl-o [fF] any-character` Finds the next (for `f`) or previous (for `F`) occurence of the character. Works for printable characters
only, not space, tab or newline.
3. `ctrl-o [verb] [object]` uses `bililiteRange` [`find`](../find.md) to select "objects".

Possible values for `verb` include:
 * nothing: go to the beginning of the next object. Uses `range.bounds('to', object, true).bounds('endbounds')`
 * `t`: go to the end of the current object. Mnemonic: "to". Uses `range.bounds('to', object, false).bounds('endbounds')`
 * `b`: go to the beginning of the current object. Mnemonic: "back". Uses `range.bounds('from', object, false).bounds('startbounds')`
 * `B`: go to the end of the previous object. Mnemonic: "really back". Uses `range.bounds('from', object, true).bounds('startbounds')`
 * `i`: select the entire current object (but not the separators). Mnemonic: "inner". Uses `range.bounds('whole', object, false)`
 * `a`: select the entire current object and its separators (for some objects, only the ending separators). Mnemonic: "all". Uses 
[`range.bounds('whole', object, true)`](../docs/find.md#boundswhole-separator-regexp-outer); see that for which separators are selected
	
Possible values for `object` include (see the [documentation](../docs/find.md#options-for-separators) for the definitions of these objects):
 * `w`: word
 * `W`: bigword
 * `s`: sentence
 * `p`: paragraph
 * `[`: section
 * `(`: parentheses
 * `'`: single-quote delimited quote
 * `"`: double-quote delimited quote
 
## Initialization

When `$.fn.ex` is called, `bililiteRange(element).data.global` and `bililiteRange(element).data.autoindent` are set to `true`. A listener
for `map` events is set up (see [below](#map)) to create buttons and key mappings, and
`bililiteRange(element).ex('source .exrc')` is executed. So `bililiteRange(element).data.reader` should be set appropriately 
*before* calling `$.fn.ex`. For example, with the default `reader` on `localStorage`, you could do:

```js
localStorage.setItem('.exrc', `
	file untitled
	set magic off
	map ^s write
	map ^b sendkeys "<strong>{selection}{mark}</strong>"
	map! Save command=write observe=savestatus
`);
```

## Map

`$.fn.ex` allows for two kinds of map: `map` creates key mappings, and `map!` creates toolbar buttons. The `ex` 
command [`map`](ex.md#map) triggers a `map` event with a left hand side and a right hand side (they are separated by the first space; use
quotes to include spaces in the left hand side.

For key mappings, the left hand side is the key descriptor to pass to the `keydown` handler, using my [`keymap`](../../keymap/)
 jQuery plugin. The right hand side is the `ex` command to execute with the current selection as the default address.

So, in the `,exrc` above, control-S is mapped to `range.ex('%%write')` (the `%%` address means the current selection).
control-B is mapped to a [`sendkeys` command](index.md#sendkeyss-string) to surround the selection with the `<strong>` tag.

To map multiple keys, put the left hand side in quotes:

```js
rng.ex('map "^o j" join');
```

For buttons, the left hand side is the name of the button. There are two syntaxes for the right hand side. The simple one is just the command:

```js
rng.ex('map! Hello append Hello');
```

This does:

```js
toolbar.button(lefthandside, righthandside); // in this case, toolbar.button('Hello', 'append Hello'); 
```

The complex syntax is in the form: `command="command string" title="Tooltip title" observe="attribute to observe"` (in any order, and all but `command` are optional).

This does:

```js
button = toolbar.button(lefthandside, command, title);
if (observe) toolbar.observerElement(button, observe);
```
So buttons can be set to observe changes in the element (remembering that monitored bililiteRange data changes attributes named, for instance `data-foo`). The button will
then get a class equal to the value of the attribute of the range element named `observe`.

So

```js
rng.ex('map! Save command=write observe=data-savestatus' title="Save the text to the current file");`
```

will do:

```js
button = toolbar.button('Save', 'write', 'Save the text to the current file');
toolbar.observerElement(button, 'data-savestatus');
```
and the `savestatus` option is set to `dirty` when the text is edited and `clean` when it is saved, so the class of the button will change and you can use CSS to
style it appropriately.

See the [documentation for `toolbar`](../../toolbar/) for the details about toolbars and buttons.

