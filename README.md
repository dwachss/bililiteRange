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
- [find.md](docs/find.md): documentation of `bililite.find.js`, an extension to `bililiteRange.prototype.bounds()` 
that allows searching with regular expressions. Depends on `bililiteRange.js`.
- [lines.md[(docs/lines.md): documentation of `bililite.lines.js`, with extension to `bililiteRange.prototype.bounds()`
and other methods for dealing with line-oriented text. Depends on `bililiteRange.js`.
- [undo.md[(docs/undo.md): documentation of `bililite.undo.js`, that adds `bililiteRange.prototype.undo()` and 
`bililiteRange.prototype.redo()`. Depends on `bililiteRange.js`.
- [ex.md](docs/ex.md): documentation of `bililite.ex.js` that implements (sort of) the 
[*ex* line editor](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/ex.html).

## Upgrade guide

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
