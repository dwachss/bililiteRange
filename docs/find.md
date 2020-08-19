# bililiteRange search and replace

`bililiteRange.find.js` adds the ability to search for a regular expression in an element. Usage:

```js
range.bounds(re: RegExp, flags: string);
range.bounds('find', s: string, flags: string);
```

So:

```js
range.bounds(/foo/);
```

will set the bounds of the range to the next match of `/foo/` in the element, starting *after* the current bounds.

The program looks for a RegExp by [duck typing](https://en.wikipedia.org/wiki/Duck_typing) it, so anything
with `source` and `flags` fields will work:

```js
range.bounds({source: 'foo$', flags: 'iV'})
```

uses the [extended flags](#flags) to match case-insensitive and "no magic", meaning the `$` is taken literally. This matches
`'FOO$'`.

The difference between the two forms is that the `('find', string, flags)` form searches for the string literally. It creates a RegExp
with all the special characters escaped (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping )
and does `new RegExp (string, flags)`. 

The `flags` parameter is prepended to the `re.flags` to create the final RegExp that is sought. It's there because `bililiteRange` allows for
other flags than the standard. See [below](#flags).

`range.match` is set to the results of [`exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) on `range.all()` if the
search is successful. If it is not, `range.match` is set to `false` (not `undefined`).

So

```js
range.all('foo bar baz');
range.bounds(/foo/); // range.bounds() is [0,3], and range.match is {0: 'foo', index: 0, input: 'foo bar baz'}

range.bounds(/foo/); // range.bounds() is unchanged, [0,3]. range.match is false

range.all('A A B B').bounds(1); // range.bounds is [1,1], after the first 'A'
range.bounds(/a/i); // range.bounds is [2,3], the second 'A' (flags are respected).
```

## flags

The standard flags of `imsuy` are respected (though `y`, sticky, is treated differently). The `g` flag is ignored; the location of
the search is determined by the bounds of the range.

Similar to vim, capital letters mean that the given flag is false. `bounds(/foo/, 'I')` means search that is *not* case-insensitive. For ordinary
RegExps, there is no reason to explicitly put that in, but it is possible to change the default in `bililightRange`. A string with multiple letters
is not an error; the last letter will be used. `'ImiM'` means `'iM'`.

Additional flags are defined:

- `v`: magic. The flag abbreviation comes from 
[vim's "Very Magic" mode](https://davitenio.wordpress.com/2009/01/17/avoid-the-need-to-escape-parenthesis-brackets-in-vim-regexes/),
since 'm' was already taken. This means to use the special characters like `.*[]` etc. as documented. This is the default (but can be changed with
the capital `V` flag or changing `range.data.magic`; see 
[below](#default-values-for-flags)). 
If it is false, then special characters will be taken literally.

  The `bounds('find', string, flags)` form prepends the `'V'` flag automatically, so the string has special characters escaped. Override this
with `'v'`: `bounds('find', '[a-z]', 'v')` matches any single letter, where `bounds('find', '[a-z]')` matches `"[a-z]"` exactly.

- `b`: backward. Set to true to search backward from the start of the range.

- `r`: restricted. Set to true to search *within* the current range.

- `w`: wrapscan. Set to true to wrap around. If false, then a forward search will fail if there is no match after this range, and a backward search
will fail if there is no match before this range.

```js
range.all('A A B B').bounds(1); // range.bounds is [1,1], after the first 'A'
range.bounds(a/, 'iw'); // range.bounds is [2.3], the second 'A'.
range.bounds(/a/, 'iw'); // range.bounds is [0.1], the first 'A'. We have wrapped around

range.bounds(3); // range.bounds() is [3,3], after the second 'A'
range.bounds(/a/, 'ib'); // range.bounds is [2,3], the second 'A'. We searched backward
```

### default values for flags

For actual Javascript RegExp flags, the defaults are all false. `bililiteRange` creates [options](data.md#options) for some of them,
and you would need to override them (with, for instance, `'VW'`) if necessary.

```js
bililiteRange.createOption('dotall', {value: false}); //  note that the flag for this is 's'
bililiteRange.createOption('global', {value: false}); // this is only relevant for replace; find only finds one match
bililiteRange.createOption('ignorecase', {value: false});
bililiteRange.createOption('magic', {value: true}); // note that 'magic' defaults to true, and the flag is 'v'
bililiteRange.createOption('multiline', {value: false});
bililiteRange.createOption('unicode', {value: false});
bililiteRange.createOption('wrapscan', {value: true}); // Note that 'wrapscan' defaults to true

```

And those can of course be changed for a given element with `range.data.ignorecase = true`. The flags that control the
*location* of the search (`b`, `r` and `y`) do not have options; the default is always `false`.

### The actual algorithm

Backward searching works by searching from the *start* of the search bounds, with a "global" search, and repeats until the search fails.
The last successful match is returned.

Search bounds are limited by using global searches, with `lastIndex` set to the start of the search bounds, and a look ahead set to
match the correct number of characters to force the end of the search to be before a given index. Kudus to [Izzy Vivian Dupree](https://github.com/idupree)
for figuring that out. If the text is `length` characters long and the match has to end *before* index `i`, then 
`/foo(?=[\s\S]{n})/`, where `n` is `length - i`, will end at or before `i`. `/foo(?=[\s\S]{n})(?![\s\S]{n+1})/` will end *exactly* at `i`.

Forward searches are limited to [`range[1]`, `range.length`]. Forward sticky searches will only match if the match *starts* at `range[1]`.

Backward searches are limited to [`0`, `range[0]`]. Backward sticky searches will only match if the match *ends* at `range[0]`.

Restricted searches are limited to [`range[0]`, `range[1]`], searching forward or backward as appropriate. Sticky restricted searches 
match only the start or the end of [`range[0]`, `range[1]`], depending on whether the search is forward or backward.

Wrap-around searches are only relevant if `restricted` and `sticky` are not set. If the search fails, sets the search bounds to the entire text and
searches again, forward or backward.


## `bililiteRange.prototype.replace`

`range.replace(search, replacement, flags = '')` does the same as `range.text( range.text().replace(search, replacement) )`
but allows the use of the extended flags as above, and works correctly for `^` and `$` (they match the start/end of the entire
element, not just the text of the range. `search` can be a string, interpreted as for `range.bounds('find', search, flags)`
and it can be anything that has a `source` and `flags` field, as for `range.bounds(search)` above.

Specifying the `g` flag will replace all occurences of `search`. Specifying the `b` flag does nothing except if the `y`
flag is set; in that case it will only match the end of the range. The algorithm for searching for matches is as though
the `r` flag were set; it only replaces text inside the range.

`b` without `g` just changes the *last* occurence of `search`.

## `bililiteRange.bounds` extensions

### `bounds('to', separator: RegExp, outer = false)`

Extends the end of the range up to but not including the following matching `separator` (forces `wrapscan` to be false), If nothing matches, then extends the range to the
end of the element. If `outer` is true, then includes the `separator`.

```js
range.all('123\n456').bounds('start').bounds('to', /\n/);  // range.text() is '123' (not including the '\n').

range.all('123\n456').bounds([4,5]).bounds('to', /\n/); // range.text() is '456'

range.all('123\n456').bounds('start').bounds('to', /\n/, true); // range.text() is '123\n'
```

`separator` is either a RegExp or a string (which is taken literally), or an array of two of those: the first is the starting delimiter and the second is the ending delimiter.
That is used for things like parentheses. `bounds('to')` uses the second; `bounds('from')` uses the first.

#### Options for separators

If `separator` is the name of a `bililiteRange` option (i.e. `range.data[separator]` exists), then that value is used as the separator. This is meant to be used like
[vi](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)'s paragraph and section boundary searches.

Since I use Markdown so much, the defaults are:

```js
bililiteRange.createOption ('word', {value: /\b/});
bililiteRange.createOption ('bigword', {value: /\s+/});
bililiteRange.createOption ('sentence', {value: /\n\n|\.\s/});
bililiteRange.createOption ('paragraph', {value: /\n\n/});
bililiteRange.createOption ('section', {value: /\n(<hr\/?>|(-|\*|_){3,})\n/i});
bililiteRange.createOption ('()', {value: [/\(/, /\)/] });
bililiteRange.createOption ('[]', {value: [/\[/, /]/] });
bililiteRange.createOption ('{}', {value: [/\{/, /}/] });
bililiteRange.createOption ('"', {value: [/"/, /"/] });
bililiteRange.createOption ("'", {value: [/'/, /'/] });

range.bounds('selection').bounds('to', 'paragraph').bounds('endbounds').select(); // jump to end of current paragraph
range.bounds('selection').bounds('to', '()', true).bounds('endbounds').select(); // jump to just after the next closng parenthesis

```

### `bounds('from', separator: RegExp, outer = false)`

Extends the beginning of the range back to the immediately preceding `separator` (forces `backward` to be true and `wrapscan` to be false). Does not include the
separator itself unless `outer` is true. `separator` is the same as for `bounds('to')`.

### `bounds('whole', separator: RegExp, outer)`

Does `range.bounds('union', 'from', separator).bounds('union', 'to', separator, outer)`.
For single item separators, `outer` applies only to the final separator, not the initial one. So `range.bounds('whole', 'word', true).text('')` deletes
the word but leaves the initial whitespace in place.

For two-item separators, `outer` applies to both ends. So `range.bounds('whole', '"', true).text('')` deletes the entire quote, including the surrounding double quotes.

```js
range.bounds('selection').bounds('whole', 'sections').select(); // select the entire current section
```
