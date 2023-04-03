# bililiteRange search and replace

`bililiteRange.find.js` adds the ability to search for a regular expression in an element. Usage:

```js
range.bounds('find', s: string, {flags: string});
range.bounds(re: RegExp, {flags: string});
range.bounds`Delimited Regular Expression string`;
```

So:

```js
range.bounds('find', 'foo');
```

searches for the next match of `'foo'` in the element, starting *after* the current bounds. This is meant to emulate how word processors search.
If it is found, then the bounds of the range are set to that text, and `range.match` is set to the results of
[`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) on `range.all()`.

If it is not found, then the range is unchanged and `range.match` is set to `false` (not `null`!).


```js
range.bounds(/foo/);
```

searches for the given regular expression, and the [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) form accepts a delimited regular expression,
the way PHP's [PCRE](https://pcre.org/)-based [preg_match](https://www.php.net/manual/en/function.preg-match.php) does:

```js
range.bounds`/foo/`;
range.bounds`#foo#`
```

Bracket style delimiters (``range.bounds`(foo)` `` or ``range.bounds`<foo>` ``) are *not* supported.
[Flags](#flags) are after the delimiter: `` range.bounds`/foo/im` ``, or in a special non-delimited form (not PCRE-compatible, but inspired by it) `` range.bounds`(?im)foo` ``. Note there is no delimiter, just the `(?flags)`
in the beginning.

As with PCRE, the delimiter can be escaped with `\`:

```js
range.bounds`/http:\/\//`; // searches for 'http://'
```

And delimiters in interpolated strings are automatically escaped:

```js
range.bounds`/${'http://'}/`; // searches for 'http://'
```

Since the tagged template literal uses [`String.raw`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw), backslashes don't need to be themselves escaped;

```js
range.bounds`/\n/`; // searches for a newline
```

## summary

```js
range.all('foo bar baz');
range.bounds(/foo/); // range.bounds() is [0,3], and range.match is {0: 'foo', index: 0, input: 'foo bar baz'}

range.bounds(/foo/); // range.bounds() is unchanged, [0,3]. range.match is false

range.all('A A B B').bounds(1); // range.bounds is [1,1], after the first 'A'
range.bounds(/a/i); // range.bounds is [2,3], the second 'A' (flags are respected).
```

## Flags

Flags can be part of the regular expression (`range.bounds(/foo/im)`) or after (`range.bounds(/foo/, 'im')` or both; the two strings are concatenated. The reason for having a separate `flags` parameter is that a number of
nonstandard flags are supported, and negative flags are supported.

Each flag represents a Boolean that is by default negative, but can be set on `range.data` to a different default for all regular expressions on the element (and those can be overridden by the
flags on the regular expression.

### Standard Flags

The standard flags are simply used directly:

| flag | data field for default value |
|------|------------------------------|
| `d` | `range.data.hasIndices` |
| `i` | `range.data.ignoreCase` |
| `m` | `range.data.multiline` |
| `s` | `range.data.dotAll` |
| `u` | `range.data.unicode` |

The `y` flag has special meaning (see [below](#search-flags)).
The `g` flag (`range.data.global`) exists, but is ignored; `range.bounds(/foo/g)` still only finds a single instance.

### Enhanced Flags


Additional flags are defined:

| flag | data field for default value |
|------|------------------------------|
| `n` | `range.data.explicitCapture` |
| `q` | `range.data.quotedPattern` |
| `x` | `range.data.freeSpacing` |

- `n`: inspired by [XRegExp](https://xregexp.com/flags/). Parentheses in the pattern are for grouping, and are not captured. Named captures like `/(?<group>.)\k<group>/` work, but 
`/(.)\1/` will not. Turns `(...)` into `(?:...)`.

- `q`: all special characters in the pattern are escaped, so it just searches for the literal string. ``range.bounds`/[foo](baz)/q` `` will be turned into  ``range.bounds`/\[foo\]\(baz\)/q` ``. This is how
`range.bounds('find', string, flags)` works; it basically calls `` range.bounds`/${string}/q${flags}` ``.

- `x`: extended. Whitespace will be ignored, and `#` characters start a comment until the end of a line. For example:

```js
range.bounds`/[a-zA-Z] # match a letter
              \w*      # then letters or digits
            /x`;
// this will search for /[a-zA-Z]\w*/
```

### Search Flags


| flag | data field for default value |
|------|------------------------------|
| `b` | `range.data.backwardScan` |
| `r` | `range.data.restrictedScan` |
| `w` | `range.data.wrapScan` |
| `y` | `range.data.sticky` |

As mentioned above, the search starts *after* the current bounds. `y` means the match must start exactly at
`range.bounds[1]` ([`lastIndex`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex) is set to that). 

If `b` is set, then the search goes *backward* from `range.bounds[0]`, and `y` means the match must end exactly at `range.bounds[1]`.

If `r` is set, then the search is within the current bounds (either from the start or back from the end, depending on the `b` flag). `ry` anchors the match to the beginning of the range, and
`bry` anchors it to end at the end.

If `w` is set then if the initial scan fails, it will wrap around to the start or the end of the range. Ignored if `r` or `y` are set.

```js
range.all('A A B B').bounds(1); // range.bounds is [1,1], after the first 'A'
range.bounds(/a/, 'iw'); // range.bounds is [2.3], the second 'A'.
range.bounds(/a/, 'iw'); // range.bounds is [0.1], the first 'A'. We have wrapped around

range.bounds(3); // range.bounds() is [3,3], after the second 'A'
range.bounds(/a/, 'ib'); // range.bounds is [2,3], the second 'A'. We searched backward
```

### Negative Flags

TODO

### Special tokens

These were were inspired by PCRE.

- `\A`: Matches the beginning of `range.all()`.
- `\z`: Matches the end of `range.all()`.
- `\Z`: Matches the end of `range.all()`, but before a final newline if there is one. These will match the extremes of the text even if `m` is set, and `^` and `$` change their meaning.
- `\G`: Matches the start of the range.
- `\g`: Matches the end of the range. These can be an alternative to the `y` flag.
- `\Q...\E`: all special characters between `\Q` and `\E` are escaped. This can be an alternative to the `q` flag. Note that is no way to escape `\E`; it always marks the end of the quoted section.
- `(?#....)`: Comment; will be replaced by `(?:)`.

### Duck Typing

TODO

## `bililiteRange.prototype.replace`

`range.replace(search, replacement, flags = '')` does the same as `range.text( range.text().replace(search, replacement) )`
but allows the use of the extended flags as above, and works correctly for `^` and `$` (they match the start/end of the entire
element, not just the text of the range. `search` can be a string, interpreted as for `range.bounds('find', search, flags)`
and it can be anything that has a `source` and `flags` field, as for `range.bounds(search)` above.

Since `replace` only replaces text *inside* the range, the `r` flag is redundant and ignored.

``range.replace`/pattern/replacement/flags` `` uses the syntax from `vim`; as with ``bounds`/pattern/flags` ``, other characters can be used as delimiters.

Specifying the `g` flag will replace all occurences of `search`. Specifying `bg` flag does nothing except if the `y`
flag is set; in that case it will only match the end of the range.

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
bililiteRange.createOption ('paragraph', {value: /\n\s*\n/});
bililiteRange.createOption ('section', {value: /\n(<hr\/?>|(-|\*|_){3,})\n/i});
bililiteRange.createOption ('()', {value: [/\(/, /\)/] });
bililiteRange.createOption ('[]', {value: [/\[/, /]/] });
bililiteRange.createOption ('{}', {value: [/\{/, /}/] });
bililiteRange.createOption ('"', {value: [/"/, /"/] });
bililiteRange.createOption ("'", {value: [/'/, /'/] });

range.bounds('selection').bounds('to', 'paragraph').bounds('endbounds').select(); // jump to end of current paragraph
range.bounds('selection').bounds('to', '()', true).bounds('endbounds').select(); // jump to just after the next closng parenthesis

```

Note that `word` uses `/\b/`, which is a zero-length separator, so `outer` is irrelevant, and repeatedly searching for it (as with
`range.('to', 'word', true).bounds('endbounds')) will not move forward as it would with other separators.

### `bounds('from', separator: RegExp, outer = false)`

Extends the beginning of the range back to the immediately preceding `separator` (forces `backward` to be true and `wrapscan` to be false). Does not include the
separator itself unless `outer` is true. `separator` is the same as for `bounds('to')`.

### `bounds('whole', separator: RegExp, outer)`

Does `range.bounds('union', 'from', separator).bounds('union', 'to', separator, outer)`.
For single item separators, `outer` applies only to the final separator, not the initial one. So `range.bounds('whole', 'word', true).text('')` deletes
the word but leaves the initial whitespace in place.

For two-item separators, `outer` applies to both ends. So `range.bounds('whole', '"', true).text('')` deletes the entire quote, including the surrounding double quotes.

```js
range.bounds('selection').bounds('whole', 'section').select(); // select the entire current section
```