bililiteRange is a javascript library that abstracts text selection and replacement.

The basic function is in bililiteRange.js, with the documentation at http://github.bililite.com/bililiteRange.

## Examples

Replace the first character of an element: `bililiteRange(element).bounds([0,1]).text('X')`

Select all of an element: `bililiteRange(element).bounds('all').select()`

Implement a "backspace" key on an editable element (assuming the element is focused and the selection has been made by the user):

````js
var rng = bililiteRange(element).bounds('selection');
var bounds = rng.bounds();
if (bounds[0] == bounds[1]){
  // no characters selected; it's just an insertion point. Remove the previous character
  rng.bounds([bounds[0]-1, bounds[1]]);
}
rng.text('', 'end'); // delete the characters and replace the selection
````

Implement a "left arrow" key on an editable element:

````js
var rng = bililiteRange(element).bounds('selection');
var bounds = rng.bounds();
if (bounds[0] == bounds[1]){
  // no characters selected; it's just an insertion point. Move to the left
  rng.bounds([bounds[0]-1, bounds[0]-1]);
}else{
  // move the insertion point to the left of the selection
  rng.bounds([bounds[0], bounds[0]]);
}
rng.select();
````

## Demos

I use it for the [Kavanot editor](http://kavanot.name/Introduction/edit). 
There is a [simple demo in the test folder](test/prismeditor.html).

## Documentation

Look in the [docs folder](docs/index.md). The documents are:

- [index.md](docs/index.md): documentation of `bililiteRange.js`
- [bounds.md](docs/bounds.md): details of the `bililiteRange.prototype.bounds()` function.
- [data.md](docs/data.md): details of `bililiteRange.prototype.data` and `bililiteRange.createOption()`.
- [sendkeys.md](docs/sendkeys.md): details of the `bililiteRange.prototype.sendkeys()` function.
- [jquery.sendkeys.md](docs/jquery.sendkeys.md): documentation of `jquery.sendkeys.js`, a simple jQuery plugin that
uses `bililiteRange.prototype.sendkeys()`. Depends on `bililiteRange.js`.
- [find.md](docs/find.md): documentation of `bililiteRange.find.js`, an extension to `bililiteRange.prototype.bounds()` 
that allows searching with regular expressions. Depends on `bililiteRange.js`.
- [lines.md](docs/lines.md): documentation of `bililiteRange.lines.js`, with extension to `bililiteRange.prototype.bounds()`
and other methods for dealing with line-oriented text. Depends on `bililiteRange.js`.
- [undo.md](docs/undo.md): documentation of `bililiteRange.undo.js`, that adds `bililiteRange.prototype.undo()` and 
`bililiteRange.prototype.redo()`. Depends on `bililiteRange.js` and my [`historystack`](https://github.com/dwachss/historystack).
- [ex.md](docs/ex.md): documentation of `bililiteRange.ex.js` that implements (sort of) the 
[*ex* line editor](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/ex.html).
- [evim.md](docs/evim.md): documentation of `bililiteRange.evim.js` that creates a sort 
of [evim](https://vimhelp.org/starting.txt.html#evim-keys) (easy VIM editor).

## Distribution versions

The `dist/` folder has files that concatenate useful sets of this project with their dependences.

- [`dist/bililiteRange.js`](dist/bililiteRange.js) combines the basic `bililiteRange.js` with `bililiteRange.find.js`.
- [`dist/editor.js`](dist/editor.js) combines everything in the project except for `jquery.sendkeys.js`, along with the projects it depends on.

`package.ps1` is a simple Powershell script that creates those files, and [`.github\workflows\package.yml`](.github/workflows/package.yml)] is the github action that runs it.

## Upgrade guide

The [version 3 release](https://github.com/dwachss/bililiteRange/releases/tag/v3.3) used [jQuery](https://jquery.com),
and the visual editor was `jquery.ex.js` instead of `bililiteRange.evim.js`.

Some people used verson 2 of `bililiteRange`; that is still available as the 
[2.5.2 release](https://github.com/dwachss/bililiteRange/releases/tag/v2.5.2).

The new version no longer supports Internet Explorer or even Edge Legacy (only the chromium-based Edge). I am testing
it in Chrome, Firefox, and Edge. 

Major breaking changes include:

- The plugins have been re-organized, with `bililiteRange.util.js` split into `bililiteRange.find.js` and 
`bililiteRange.lines.js`, and the `live()` function moved to `bililiteRange.js` itself.
- `find` is gone, incorporated into `bounds(RegExp, flags)`.
- `element`, `length` and `data` are now have accessor descriptor (get functions) and are therefore accessed as 
fields rather than as functions (`range.element`, not `range.element()`).
- `bililiteRange.data()` is now the more descriptive `bililiteRange.createOption()`.
- `ex` is very different. Read [the manual](docs/ex.md).

## Obsolete files

They are all in the [2.5.2 release](https://github.com/dwachss/bililiteRange/releases/tag/v2.5.2) but no longer are part
of `bililiteRange`.

`jquery.jsvk.js` is a jQuery wrapper for Ilya Lebedev's JavaScript VirtualKeyboard (http://www.allanguages.info/), which is apparently now
dead. Depends on
bililiteRange for character insertion. [Documentation](http://bililite.com/blog/2013/01/30/jsvk-a-jquery-plugin-for-virtualkeyboard/)


`jquery.vi.js` is the beginning of an implementation of the 
[*vi* editor](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)
which I never completed and never ended up using.

`bililiteRange.fancytext.js` and `bililiteRange.fancytextasync.js` were adapters between the 
[Prism syntax highlighter](https://prismjs.com/)
and bililiteRange. It's much simpler now, just 

```js
range.listen('input', evt => {
	rng.bounds('selection');
	Prism.highlightElement(editor);
	rng.select();
});
```

Doesn't need a whole plugin for that.

`jquery.keymap.js` and `jquery.status.js` have their own repositories : [keymap](https://github.com/dwachss/keymap)
and [status](https://github.com/dwachss/status).

`jquery.livesearch.js` and `jquery.savemonitor.js` were fun and cute, but not very useful.

