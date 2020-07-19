# bililiteRange `bounds`

Setting the bounds with `range.bounds([x,y])` does no error checking or constraining, since the text may change. The constraining
happens when the bounds are gotten with `range.bounds()`. Then both numbers are constrained with 
`Math.max(0, Math.min (this.length, x or y))`, and the second number is constrained to be greater or equal to the first, with
`y = Math.max(x, y)`.

## The "built-in" functions

### `bounds('all')`
Sets the range to cover the entire element: `[0, range.length]`.

### `bounds('end')`
Sets the range to a zero-length range at the end of the element: `[range.length, range.length]`.

### `bounds('endbounds')`
Sets the range  to a zero-length range at the end of the current range: `[range[1], range[1]]`.

### `bounds('intersection',...rest)`
Creates a new range with `range.clone().bounds(...rest)`, then sets the bounds of this range to the insersection
of the two ranges. Thus `range.bounds([2,4]).bounds('intersection', [3,5])` leaves `range.bounds()` as `[3,4]`. If the
intersection is the null set, then the range is set to an empty range at an undefined location (with the current
algorithm, it is the start of the later bounds, but I may change that). 

### `bounds('selection')`
Sets the range to the selected part of the element. This, along with `range.select()`, is how to interact
with the user. `bililiteRange`'s act like selections, but they are not visible in the user interface.

### `bounds('start')`
Sets the range to a zero-length range at the start of the element: `[0, 0]`.

### `bounds('startbounds')`
Sets the range  to a zero-length range at the start of the current range: `[range[0], range[0]]`.



## Custom functions

`bililiteRange.prototype.bounds(s: string)` looks for a function `bililiteRange.bounds[s]` and
calls that with `b = bililiteRange.bounds[s].apply(this, arguments)`, then sets the bounds with
`range.bounds(b)`.

So `range.bounds('all')` calls `bililiteRange.bounds.all = () => [0, this.length];`.

Extending bounds is easy, just do:

```js
bililiteRange.bounds.firstchar = () => [0,1];

range.all('ABCDE').bounds('firstchar').text(); // 'A'
```

Error checking in the sense of constraining the bounds to fit the text (in the `firstchar` example, what if there is no text?) is
not necessary. `range.bounds()` will constrain the actual bounds used so `bounds[0] <= bounds[1] <= length`.

The arguments are passed to the function, so extended arguments are possible:

```js
bililiteRange.bounds.nthchar = (name, n) => [+n, n+1];

range.all('ABCDE').bounds('nthchar', 2).text(); // 'C'
```

And you can even manipulate the text, since the range is passed in as `this`, but this is a bad idea.

```js
bililiteRange.bounds.wrap = function (name, before, after) {
	return this.text(before + this.text() + after, {select: 'all'}).bounds();
}

range.all('ABCDE').bounds('firstchar').bounds('wrap', 'foo', 'bar').text(); // 'fooAbar'
```

A more realistic use of `this` is to go to the end of the line (after next following newline):

```js
bililiteRange.bounds.EOL = function () {
	if (this.text()[this.length-1] == '\n') return [this[1], this[1]]; // range ends with a newline
	const nextnewline = this.all().indexOf('\n', this[1]);
	if (nextnewline != -1) return [nextnewline + 1, nextnewline +1];
	return this.bounds('end').bounds(); // no newline
}

range.all('Hello\nWorld').bounds('start').bounds('EOL').text('Wonderful ').all(); // 'Hello\nWonderful World'
```
