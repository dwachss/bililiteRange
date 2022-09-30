# bililite line-oriented utilities

## `bililiteRange.lines.js`

These extensions to `bililiteRange` center around the idea of a "line", between newline (`\n`) characters. Lines do *not* include the newline; that is
just a separator. 

## `bililiteRange.bounds` extensions

### `bounds('BOL')`

(Beginning of line) Moves the range to the character position at the start of the line containing the beginning of the range. This will be
either right after a newline or at the start of the element. The range will be zero-length.

### `bounds('EOL')`

(End of line) Moves the range to the character position at the end of the line containing the end of the range. This will be either right before a
newline or at the end of the element. The range will be zero length.

### `bounds('char', n)`

Moves the range to the `n`th character position at the end of the line containing the start of the range. The range will be zero length.

### `bounds('line')`

Sets the range to the whole lines containing the range. Just `range.bounds('union', 'BOL').bounds('union', 'EOL')`.

### `bounds('line', n)`

Sets the range to the entire `n`th line, 1-indexed. If `n == 0` then is the same as `bounds('start')`. If `n` is greater than the number of lines,
then is the same as `bounds('end')`.

### `bounds('line', n1, n2)`

Sets the range to the lines from `n1` to `n2`. Basically, `bounds('line', n1).bounds('union', 'line', n2)`.

### `bounds('andnewline')`

Deleting a line with `range.bounds('line', 1).text('')` leaves the newline at the end in place (since `'line'` doesn't include that newline). 
Calling `bounds('andnewline')` extends the range to include the next character, if it is a newline. So 
`range.bounds('line', 1).bounds('andnewline').text('')` deletes the entire line.

## Autoindenting

`bililiteRange.js` adds a `keydown` handler to intercept `key: 'Enter'` events, to insert a newline rather than create a new `<div>` or `<br>`
element. `bililiteRange.lines.js` adds an option, `autoindent` to copy the whitespace from the beginning of the current line (it uses
[`range.indentation()`](#indentation)) before inserting the newline.

So `range.data.autoindent = true` will start autoindenting while typing. 

To manually autoindent inserted text (i.e. prepend the whitespace before each inserted line), use the `autoindent` option of the text method:

```js
range.text(string, {autoindent: true}); // string will have range.indentation() prepended to each line of string
range.text(string, {autoindent: false}); // string will not have range.indentation() prepended to each line of string (no matter what the value of range.data.autoindent)
range.text(string, {autoindent: 'invert'}); // the value of autoindent will be set to !range.data.autoindent
range.text(string, {autoindent: undefined, inputType: 'insertLineBreak'}); // the value of autoindent will be set to range.data.autoindent
range.text(string, {autoindent: undefined, inputType: 'anything else'}); // the value of autoindent will be set to false
```

(the `keydown` handler uses `inputType: 'insertLineBreak'` for inserting newlines)

See the [prettyprinting editor example](../test/prismeditor.html) for autoindenting in action.

## Inserting whole lines

Another option to `text()` is `ownline`. `range.text(string, {ownline: true})` adds newlines before and after `string` if needed, to put it
on its own line.

## new `bililiteRange.prototype` methods

### `indentation()`

Returns the white space at the start of the line containing the start of the range. Basically, `/^\s*/.exec(this.bounds('line').text())[0]`. Since 
`/^\s*/` matches the empty string, the regular expression match will never fail.

### `indent(tabs: string)`

Prepends `tabs` to every line in the range. Returns the range (for chaining) with the bounds set to the lines that were modified (the whole lines).

### `unindent(n: number, tabsize: number)`

Removes `n` sets of either tabs (`'\t'`) or `tabsize` spaces from the start of every line in the range.
If tabsize is 0 or not set, uses `range.data.tabsize`, which defaults to 8.
Returns the range, with the bounds set to the lines that were modified (the whole lines).

### `char()`

Returns the character position (beginning of line is `0`) of the start of the range.

### `line()`

Returns the line number (1-indexed) of the start of the range.

### `lines()`

Returns an array of `[start, end]`, the line numbers of the start and end of the range.

## `tabsize`

`range.data.tabsize` is a [monitored option](data.md#monitored-options), with an event listener that changes the 
[CSS `tab-size`](https://developer.mozilla.org/en-US/docs/Web/CSS/tab-size) option on the
element (note that it is spelled `tabsize`, not `tabSize` or `tab-size`).

## `sendkeys` extensions

`bililiteRange.lines.js` implements several more [`sendkeys`](sendkeys.md) special keys.

### `'{ArrowUp}'` and `'{ArrowDown}'`, with aliases `'{uparrow}'` and `'{downarrow}'`

They move to the range to the line above or below the *start* of the range, in the same *character* position. This is much less sophisticated than a real
up/down arrow, for two reasons: it does not know about glyph widths, so it moves based on character count rather than position on the screen. Secondly, it does not
remember where the column *ought* to be, so going from the end of a long line to a short line, the new position will be at the end of the short line. Going to another
line, even if it is longer, will be at the character position corresponding to the end of the short line.

### `'{Home}'` and `'{End}'`

Move the range to the start or end of the current line, respectively. Just does `bounds('BOL')` or `bounds('EOL')`.
