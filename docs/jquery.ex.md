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

## Key Mappings

It includes a number of keymappings that are based on [VIM](https://vimhelp.org/), but that I found more useful. 

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

For keymappings, the left hand side is the key descriptor to pass to the `keydown` handler, using my [`keymap`](../../keymap/README.md)
 jQuery plugin. The right hand side is the `ex` command to execute with the current selection as the default address.

So, in the `,exrc` above, control-S is mapped to `range.ex('%%write')` (the `%%` address means the current selection).
control-B is mapped to a [`sendkeys` command](index.md#sendkeyss-string) to surround the selection with the `<strong>` tag.

