# The ex editor for bililiteRange

This is an implementation of the [*ex* line editor](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/ex.html),
without the visual mode (this is not vi or vim). 

## Usage

```js
range.ex(commandstring);
```

That's it. `commandstring` is, in general, anything that would be acceptable for the command line in *ex*. 

```js
bililiteRange(element).ex('%s/foo/bar/g');
```

replaces every `'foo'` with `'bar'`.

```js
bililiteRange(element).ex('1i "First new line\nSecond new line"');
```

prepends two new lines to the element.

Commands are separated by `'|'`. To include that, or any special character, put the parameter in quotes:

```js
range.ex(String.raw`a "foo\nbar|baz"`);
```

appends two lines after the current one, the second being `bar|baz`. The string in quotes is passed to
[JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse), which is why
the `\n` is escaped with `String.raw`. If not, it would be an actual newline character and as such, illegal in a
JSON string. Using `range.ex('a foo\nbar|baz');` would get the newline appended correctly but would read the vertical
bar as a command separator, append `foo\nbar` then give an error for the unknown command `baz`.

The "current line" is set to the line containing the *start* of `range.bounds()`.

After executing the command, the bounds of the range are set to the end of the "current line" as defined in the *ex*
manual.

## `bililiteRange.prototype.executor`

Convenience function that returns a function that calls `bililiteRange.prototype.ex`. Useful as an event handler, or 
a [`toolbar`](../../toolbar/) `run` function. Intended to be used directly in the user interface, so it acts on the 
selection.

### Usage

```js
button.addEventListener ('click', range.executor (opts) );
```
The possible options are `{command: string, defaultaddress: string = '%%', returnvalue: anything}`.

`range.executor (opts)` returns a function that runs `ex(opts.command, opts.defaultaddress)` on the selection (the selection at the time the
function is run), and returns `returnValue`. If `command`
is not defined, then the function takes a single argument that is the command to be run. Thus:

```js
Promise.resolve( prompt('Enter a command')).then( range.executor() );
```

`returnValue` is necessary because event handlers may want to return `false` to prevent further handling, but `Promise.then` functions
should return `undefined` to pass the result through unchanged.

If `defaultaddress` is not set, then `'%%'` is used, meaning the entire selection, not the whole line.

Note that `ex` acts on the *range*, independent of the actual selection, `executor` acts on the *selection*.

## "Files"

Javascript is not directly connected to the file system, so `bililiteRange.ex` creates several options:

For messages, `rng.data.stdout` is a function that displays informational messages, and `rng.data.stderr` is a function
that displays errors. The defaults are:

```js
bililiteRange.createOption ('stdout', {value: console.log, enumerable: false});
bililiteRange.createOption ('stderr', {value: console.error, enumerable: false});
```

But you could change that:

```js
range.data.stdout = alert;
range.data.stderr = error => alert('⚠️ ' + error.toString());
```

For "files", `rng.data.reader` is a `function (filename, directoryname)` that returns a promise that should 
resolve to the "read" text. `rng.data.writer` is a `function (text, filename, directoryname)` that returns a
promise that resolves when the text is "written". The defaults are :

```js
bililiteRange.createOption ('reader', {
	value: async (filename, directoryname) => localStorage.getItem(filename)
});
bililiteRange.createOption ('writer', {
	value: async (text, filename, directoryname) => localStorage.setItem(filename, text)
});
```

using [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). But you could
use jQuery:

```js
range.data.reader = async (filename, directoryname) => $.get(filename);
range.data.writer = async (text, filename, directoryname) => $.post(filename, {text: text});
// This assumes your server knows what to do with GET and PUT requests to the URL that 'filename' represents
```

The `async` functions turn all the return values into Promises.

`file` and `directory` are *ex* options, set with `range.ex('file foo').ex('directory bar')`. The defaults are:

```js
range.data.directory = this.window.location.protocol + '//' + this.window.location.hostname;
range.data.file = this.window.location.pathname;
```

which is probably the most useful defaults for AJAX.

## Regular Expressions

*ex* regular expressions are different from Javascript RegExp's. To make my life easier, `bililiteRange.ex` uses the
*Javascript* RegExp's. ``range.ex(String.raw`/\bfoo\b/`)`` to find a line with the whole word `'foo'`,<br/>not
``range.ex(String.raw`/\<foo\b/>`)``. For strings with backslashes, 
[String.raw](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw) is your friend.

Rather than searching backwards with `'?foo?'`, use the [extended flags](find.md#flags): `'/foo/b'`.

Similarly, the replace string for the substitute command uses 
the Javascript 
[replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) 
replacement string.

## Special address mode

*ex* is line-oriented. `range.ex('.')` refers to the entire line. `bililiteRange.ex` adds a special address, `%%`, which
refers to the current bounds, without extending to the entire line. `range.ex('%%copy $')` appends `range.text()` to the
end of the element.

## Specific commands

`count` and `flags` on commands are not implemented (flags on regular expressions are).

### `abbreviate`

Not implemented

### `arguments`

Not implemented

### `directory`

This is the same as `chdir` or `set directory`. It sets the `range.data.directory`

### `global`

The algorithm may fail if lines are added *after* the line just after the line that is matched. `%g/^/ .+2 a foo` will
match every line, then add a line 3 lines later, and the loop will increment by one (the number of lines added) and skip
the next matched line but match the newly inserted `foo`. 

The algorithm as described in the manual does two passes: first mark all the matching lines, *then* do the commands
on each of them. I'm not sure how to do that with `bililiteRange`.

There is a `bililiteRange` option `global`, that is used for regular expression searches. The `global` command will allow
it to be set like an option: `global on`, `global off`, `set global`, `set noglobal`, etc. and to send the value to
`stdout` with `global ?` or `set global ?`. There is no ambiguity with the command `global`: `global /RegExp/`.

### `list`

Not implemented.

### `map`

This is meant to set keystrokes for *vi*, so it isn't really implemented. As a hook for implementing
it, the map command dispatches a custom event of type `map` on the element. The parameter (the string following 
`'map'`) is split on the first space (respecting quoted strings) forming a *left hand side* and a
*right hand side*. The `detail` of the event is set to 

```js
{
	command: 'map',
	variant: false /* for 'map' */, true /* for 'map!' */
	lhs: 'left hand side',
	rhs: 'right hand side'
}
```

The listener for this event can do what it wants with it, but must reverse it in response to the `unmap` command.

**`map` without a parameter does *not* display the list of mappings.**

### `next`, `number`, `open`

Not implemented.

###  `preserve`

Saves the entire text to localStorage (the key is `` `ex-${data.directory}/${data.file}` ``, so change those if you want more than one 
element to edit).

Sets up an event listener for [`visibilitychange`](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) to save the
text whenever the page is hidden (or closed), so if the page is closed without saving, re-open it and do `rng.ex('recover')`. If you are paranoid, do ` rng.listen ('input', evt => rng.ex('recover'));`


### `print`

Just selects the lines.


### `quit`

Not implemented.

### `read`

`read` pulls the file in after the current lines. 

`read!` is not a shell escape but a Javascript escape. Does `this.text(Function (parameter).call(this), {select: 'end'});`.
So to reverse the first line of the element, do 

```js
range.ex('1read! return this.text().split("").reverse().join("")');
```

If the return value is undefined, then the text is unchanged.

### `recover`

Resets the text to ``localStorage[`ex-${data.directory}/${data.file}`]``. See [`preserve`](#preserve)

### `rewind`

Not implemented.

### `shell`

Not implemented.

### `source`

As with `edit` and `read`, uses `range.data.reader` to get the source file.

### `substitute`

The `confirm` option is not implemented. Nonglobal regular expressions (without the `g` flag) act like javascript:
only the first occurence of the match in the range of addresses will be changed, not the first occurence on each line.
It uses [`bililiteRange.prototype.replace`](find.md#bililiterangeprototypereplace).

`&` is simply a synonym for `substitute`; both will repeat the last search if no regular expression is given. It's not
clear why that exists, since `s` works perfectly well.

`~` uses the last regular expression seen in the editor (whether in `global`, `substitute` or an address) as
the search term, and the last replacement from a `substitute` command (including `&` and `~`), but the flags are reset.

The only way to get flags on a `~` command is with the defaults: `range.data.global`, `range.data.magic` etc.

There is a subtlety of the parser that is worth noting: `|` separates commands, but the parser looks at
`s /foo/bar/i | /bar/` and sees two regular expressions, `/foo/` and `/i | /` and won't split on the `|`.
Use a different delimiter: `s #foo#bar#i | /bar/` works fine. The problem is that the `substitute` command parameter
may have one, two, or three delimiters. 

### `suspend`, `tag`, `unabbreviate`

Not implemented.

### `undo`

Does `range.undo()`, undo-ing anything that changed the text with an `input` event. See the documentation for
[`bililiteRange.undo`](undo.md).

Note that `bililiteRange.ex` automatically does `range.initUndo()` if necessary.

### `unmap`

See [`map`](#map). Dispatches a `map` event, but with the `detail` field having a different `command`, and `lhs` set to the entire parameter:

```js
{
	command: 'unmap',
	variant: false /* for 'unmap' */, true /* for 'unmap!' */
	lhs: 'parameter',
	rhs: undefined
}
```

### `visual`

Not implemented.

### `write`

Always sends the whole text to `range.data.writer` (ignores the addresses)

### `xit`

Not implemented.

### `z`

Not implemented.

### `!`

Like [`read`](#read) but does not replace the text. Does `Function (parameter).call(this)`.

### `@`

**Not implemented, but should be.**

## Options

All options are actually [`bililiteRange` options](data.md#options). So `autoindent` can be set with 
`range.data.autoindent = true` or `range.ex('autoindent on')` or `range.ex('set autoindent')` and unset
with `range.data.autoindent = false` or `range.ex('autoindent off')` or `range.ex('set noautoindent')`.

### `autoindent`

`append`, `change` and `insert` respect the autoindent option, [`range.data.autoindent`](lines.md#autoindenting), with
the variant reversing the value of the option.

### `autoprint`, `autowrite`, `beautify`, `edcompatible`, `errorbells`, `exrc`

Not implemented.

### `ignorecase`

Implemented as described for [`bililiteRange.bounds(RegExp, flags)`](find.md).

### `list`

Not implemented.

### `magic`

Implemented as described for [`bililiteRange.bounds(RegExp, flags)`](find.md). Specifically, `nomagic` means 
all characters are taken literally. Escaping them with backslashes does *not* make them special again.

### `mesg`, `number`

Not implemented.

### `paragraphs`

Not relevant to *ex*, so not implemented as an *ex* option. The idea of a paragraph separator is implemented
in the [find routines](find.md#options-for-separators).

### `prompt`, `readonly`, `redraw`, `remap`, `report`, `scroll`

Not implemented.

### `sections`

Not implemented, as [`paragraphs`](#paragraphs) above.

### `shell`

Not implemented.

### `shiftwidth`

Alias for `range.data.tabsize`.

### `showmatch`, `showmode`, `slowopen`

Not implemented.

### `tabstop`

Alias for `range.options.tabsize`.

### `taglength`, `tags`, `term`, `terse`, `warn`, `window`, `wrapmargin`

Not implemented.

### `wrapscan`

Implemented as described for [`bililiteRange.bounds(RegExp, flags)`](find.md).

### `writeany`

Not implemented.

## Nonstandard commands

These were too useful to not include

## `redo`

Does `range.redo()`.

## `sendkeys`

Does `range.sendkeys(parameter)`

