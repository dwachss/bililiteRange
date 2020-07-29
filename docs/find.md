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

## `bililiteRange.RexExp`

In order to allow for three more flags, an "extended" RegExp is defined: `new bililiteRange.RegExp(pattern: string or RegExp or bililiteRange.RegExp [, flags: string])`
that can be used instead. The three new flags are:

- `b`: backwards. Set to true to search backwards from the start of the range
- `v`: magic. The flag abbreviation comes from 
[vim's "Very Magic" mode](https://davitenio.wordpress.com/2009/01/17/avoid-the-need-to-escape-parenthesis-brackets-in-vim-regexes/),
since 'm' was already taken. This means to use the special characters like `.*[]` etc. as documented. This is the default (but can be changed with
the capital `V` flag or changing range.data.magic; see below). If it is false, then special characters will be taken literally, *except* if escaped.
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
bililiteRange.createOption('magic', {value: true}); // note that 'magic' defaults to true, and the flag is 'v'
bililiteRange.createOption('multiline', {value: false});
bililiteRange.createOption('unicode', {value: false});
bililiteRange.createOption('wrapscan', {value: true}); // Note that 'wrapscan' defaults to true
```

And those can of course be changed for a given element with `range.data.ignorecase = true`.

Flags set on a "real" RegExp or a bililiteRange.RegExp override the defaults. To override a true default, use the capital letter:

```js
range.data.ignorecase = true;
range.bounds(/foo/); // will match 'FOO'
range.bounds( range.re('foo') ); // shortcut notation for expanded RegExp; will still match 'FOO' because the default was set
range.bounds( range.re('foo', 'I') ); // capital 'I' means 'not i', overrides the default. Will not match 'FOO'

range.bounds( range.re('[a-z]', 'v') ); // magic is true. Matches any single lowercase letter
range.bounds( range.re('[a-z]', 'V') ); // magic is false. Matches the string '[a-z]'
// note that backslashes must be written twice, so that they are escaped in the Javascript string 
range.bounds( range.re('\\[a\\-z\\]', 'v') ); // magic is true but special characters are escaped. Matches the string '[a-z]'
range.bounds( range.re('\\[a\\-z\\]', 'V') ); // magic is false, but special characters are escaped. Matches any single lowercase letter
```

### `bililiteRange.RegExp.prototype.toRe(range, g_y = 'g')`

Takes an extended RegExp created with `new bililiteRange.RegExp` and turns it back into a real Javascript RegExp, using the
data from `range` and appending the string `g_y` to the flags. The bililiteRange.RegExp doesn't use the `g` or `y` flags (the
search location is set by the range, not `lastindex`) so this allows you to set it.

The returned RegExp will have the source quoted appropriately if `magic` is false, and will have additional fields
`backwards` and `wrapscan` set to their values in the `bililiteRange.RegExp`.

```js
re = new bililiteRange.RegExp('abc', 'biW'); // assuming the defaults have not been changed
re2 = re.toRE(range, 'y');
console.log(re2); // /abc/iy
console.log(re2.backwards); // true
console.log(re2.wrapscan); // false

re = new bililiteRange.RegExp('^[A-Z]', 'mV'); // assuming the defaults have not been changed
re2 = re.toRE(range);
console.log(re2); // /\^\[A\-Z\]/mg
console.log(re2.backwards); // false
console.log(re2.wrapscan); // true
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

## `bililiteRange.bounds` extensions

### `bounds('to', separator, outer = false)`

Extends the end of the range up to but not including the following matching `separator` (forces `wrapscan` to be false), If nothing matches, then extends the range to the
end of the element. If `outer` is true, then includes the `separator`

```js
range.all('123\n456').bounds('start').bounds('to', /\n/);  // range.text() is '123' (not including the '\n').

range.all('123\n456').bounds([4,5]).bounds('to', /\n/); // range.text() is '456'

range.all('123\n456').bounds('start').bounds('to', /\n/, true); range.text() is '123\n'
```

`separator` is passed to `bililiteRange.RegExp`, preserving existing flags (if it's a `RegExp` or `bililiteRange.RegExp`).

#### Options for separators

If `separator` is the name of a `bililiteRange` option (i.e. `range.data[separator]` exists), then that value is used as the separator. This is meant to be used like
[vi](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)'s paragraph and section boundary searches. For consistency with that, the predefined `RegExp`s
are `words, `bigwords`, `sentences`, `paragraphs` and `sections`, rather than `word`, etc. Think of them as being short for `wordseparator` etc.

Since I use Markdown so much, the defaults are:

```js
bililiteRange.createOption ('words', {value: /\b/});
bililiteRange.createOption ('bigwords', {value: /\s+/});
bililiteRange.createOption ('sentences', {value: /\n\n|\.\s/});
bililiteRange.createOption ('paragraphs', {value: /\n\n/});
bililiteRange.createOption ('sections', {value: /\n(<hr\/?>|(-|\*|_){3,})\n/i});

range.bounds('selection').bounds('to', 'paragraphs').bounds('endbounds').select(); // jump to end of current paragraph
```

### `bounds('from', separator, outer = false)`

Extends the beginning of the range back to the immediately preceding `separator` (forces `backwards` to be true and `wrapscan` to be false). Does not include the
separator itself unless `outer` is true. `separator` is the same as for `bounds('to')`.

### `bounds('whole', separator, outer)`

Does `range.bounds('union', 'from', separator).bounds('union', 'to', separator, outer)`.
Note that `outer` applies only to the final separator, not the initial one. So `range.bounds('whole', 'word', true).text('')` deletes
the word but leaves the initial whitespace in place.

```js
range.bounds('selection').bounds('whole', 'sections').select(); // select the entire current section
