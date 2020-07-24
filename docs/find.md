# bililiteRange search and replace

`bililiteRange.find.js` adds the ability to search for a regular expression in an element:

```js
range.bounds(/foo/);
```

will set the bounds of the range to the next match of `/foo/` in the element, starting from the beginning of the current bounds of the
range. This is meant to be similar to the way word processors do "find" commands. The 'g' and 'y' flags are ignored, since this just finds
the next match. If the match is unsuccessful, the bounds remain unchanged. If the only match is exactly this range, then the match fails.

`range.match` is set to the results of [`exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) on `range.all()` if the
search is successful. If it is not, `range.match` is set to `false` (not `undefined`).

So

```js
range.all('foo bar baz');
range.bounds(/foo/); // range.bounds() is [0,3], and range.match is {0: 'foo', index: 0, input: 'foo bar baz'}

range.bounds(/foo/); // range.bounds() is unchanged, [0,3]. range.match is false

range.all('A A B B').bounds(1); // range.bounds is [1,1], after the first 'A'
range.bounds(/a/i); // range.bounds is [2.3], the second 'A' (flags besides g and y are respected).
```

In order to allow for two more flags, an "extended" RegExp is defined: `new bililiteRange.RegExp(pattern: string or RegExp or bililiteRange.RegExp [, flags: string])`
that can be used instead. The two new flags are:

- `b`: backwards. Set to true to search backwards from the start of the range
- `w`: wrapscan. Set to true to wrap around. If false, then a forward search (`b` not set) will fail if there is no match after this range, and a backwards search
(`b` set) will fail if there is no match before this range.

```js
range.all('A A B B').bounds(1); // range.bounds is [1,1], after the first 'A'
range.bounds(new bililiteRange.RegExp('a', 'iw')); // range.bounds is [2.3], the second 'A'.
range.bounds(new bililiteRange.RegExp('a', 'iw')); // range.bounds is [0.1], the first 'A'. We have wrapped around

range.bounds(3); // range.bounds() is [3,3], after the second 'A'
range.bounds(new bililiteRange.RegExp('a', 'ib')); // range.bounds is [2,3], the second 'A'. We searched backwards
```

`range.re(pattern, flags)` is a shortcut for `new bililiteRange.RegExp(pattern, flags)`.
To make life easier, several of the flags have default options:

```js
bililiteRange.createOption('dotall', {value: false}); //  note that the flag for this is 's'
bililiteRange.createOption('ignorecase', {value: false});
bililiteRange.createOption('multiline', {value: false});
bililiteRange.createOption('unicode', {value: false});
bililiteRange.createOption('wrapscan', {value: true}); // Note that 'wrapscan' defaults to true!
```

And those can of course be changed for a given element with `range.data.ignorecase = true`.

Flags set on a "real" RegExp or a bililiteRange.RegExp override the defaults. To override a true default, use the capital letter:

```js
range.data.ignorecase = true;
range.bounds(/foo/); // will match 'FOO'
range.bounds( range.re('foo') ); // shortcut notation for expanded RegExp; will still match 'FOO' because the default was set
range.bounds( range.re('foo', 'I') ); // capital 'I' means 'not i', overrides the default. Will not match 'FOO'
```

## `bililiteRange.prototype.replace(searchvalue, newvalue)`

The replace function basically does 

```js
const text = range.text();
range.text( text.replace( searchvalue, newvalue );
```

except that doing things in one fell swoop like that means that the entire change is treated as a single 'input' event. This means "undo" will undo all the changes.
If that's not what you want,

```js
range.replace( searchvalue, newvalue );
```

does each replacement individually (for a global searchvalue), by doing

```js
const text = range.text();
text.replace( searchvalue, (match, index) => { // actually, has to be more sophisticated than this, since the argument list is variable
	range.bounds([index, index+match.length]); // move the range to this particular match
	range.text( match.replace (searchvalue, newvalue) ); // replace each one individually
});
```

Since the actual replacement is done on the matched substring alone, a RegExp that uses lookahead or lookbehind may fail.