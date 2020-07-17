# bililite bounds custom functions

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
