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

I use it for the [Kavanot editor](http://kavanot.name/Introduction/edit). There is a [simple demo in the test folder](test/prismeditor.html).