# BililiteRange sendkeys

`bililiteRange.text()` works well to insert text into ranges, but I wanted to be able to 
simulate other keys, ala Microsoft's [SendKey](https://docs.microsoft.com/en-us/dotnet/api/system.windows.forms.sendkeys?view=netcore-3.1).
`bililiteRange.sendkeys(string)` does exactly that. It basically executes text(string, 'end')
but interprets any text between braces (`'{key}'`) as a command representing a special key.
For security reasons, the browser won't let you do anything outside of the text of the page itself,
but I've implemented the following:

<dl>
<dt><code>Backspace</code></dt>
<dd>Delete backwards</dd>
<dt><code>Delete</code></dt>
<dd>Delete forwards</dd>
<dt><code>ArrowRight</code></dt>
<dd>Move the insertion point to the right</dd>
<dt><code>ArrowLeft</code></dt>
<dd>Move the insertion point to the left</dd>
<dt><code>Enter</code></dt>
<dd>Insert a newline</dd>
<dt><code>ctrl-Home</code></dt>
<dd>Move the insertion point to the start of the range. In a browser textarea, <code>Home</code> moves to the start of the line,
and <code>ctrl-Home</code> moves to the very top. <code>sendkeys('{Home}')</code> is implemented in 
<a href=lines.md>lines.bililiteRange.js</a>.</dd>
<dt><code>ctrl-End</code></dt>
<dd>Move the insertion point to the end of the range. Similarly, <code>sendkeys('{end}')</code> is implemented in
<a href=lines.md>lines.bililiteRange.js</a>.</dd>
</dl>
For backwards-compatibility with older versions, the following synonyms also work: `backspace`, `del`, `rightarrow`, `leftarrow` and `enter`.

So, for example, `bililiteRange(el).sendkeys('foo')` replaces the current range with 'foo' and sets the range to just 
after that string. `bililiteRange(el).sendkeys('foo{Delete}{ArrowLeft}{ArrowLeft}')` replaces the current range with 'foo', 
removes the character just after that string and sets the range to between the 'f' and the 'o'.

{% raw %}
To manipulate the selection, use the usual bililiteRange methods. Thus, to simulate a backspace key, 
use `bililiteRange(el).bounds('selection').sendkeys('{Backspace}').select()`.
To insert a '{', use an unmatched brace, `bililiteRange(el).sendkeys('this is a left brace: {')`, or `'{{}'`, 
as in `bililiteRange(el).sendkeys('function() {{} whatever }')`.
{% endraw %}

Up and down arrows are implemented in [`bililiteRange.lines.js`](lines.md).

## Other Commands

To make life easier for me, there are a few other "keys" that implement specific actions:

### `selectall`

Equivalent to `bounds('all')`.

### `tab`

Insert a `'\t'` character. `$().sendkeys('\t')` would work just as well, 
but there are circumstances when I wanted to avoid having to escape backslashes.

### `selection`

Inserts the text of the original range (useful for creating "wrapping" functions, like `"{selection}"`).

### `mark`

Remembers the current insertion point and restores it after the sendkeys call. 
Thus `"<p>{mark}</p>"` inserts `<p></p>` and leaves the bounds to the line between the tags.

So to wrap the text of a range in HTML tags, use `range.sendkeys('<strong>{selection}</strong>')`. 
To create a hyperlink, use `range.sendkeys('<a href="{mark}">{selection}</a>')` which leaves the range between the 
quote marks rather than at the end.

## Plugins

Adding new commands is easy. All the commands are in the bililiteRange.sendkeys object, 
indexed by the name of the command in braces (since that made parsing easier). 
The commands are of the form `function (range, c, simplechar)` where `rng` is the target `bililiteRange`, `c` is the command name 
(in braces), and `simplechar` is a function `simplechar (range, string)` that will insert string into the range. 
`range.data.sendkeysOriginalText` is set to the original text of the range, 
and `range.data.sendkeysBounds` is the argument for `range.bounds()` that will be used at the end (this is how `{mark}` works).

So, for example (these are slightly simplified):

```js
bililiteRange.sendkeys['{tab}'] = function (range, c, simplechar) { simplechar(rng, '\t') };
bililiteRange.sendkeys['{Backspace}'] = function (range, c, simplechar){
  var b = rng.bounds();
  if (b[0] == b[1]) rng.bounds([b[0]-1, b[0]]); // no characters selected; it's just an insertion point. Remove the previous character
  rng.text(''); // delete the characters and update the selection
};
bililiteRange.sendkeys['{selectall}'] = function (range, c, simplechar) { rng.bounds('all') };
```

So to have a reverse-string command:

```js
bililiteRange.sendkeys['{reverse}'] = function (range, c, simplechar){
  simplechar(range, range.sendkeysOriginalText.split('').reverse().join(''));
};
```

Or, to annoy the anti-WordPress crowd, a Hello, Dolly command:

```js
bililiteRange.sendkeys['{dolly}'] = function (range, c, simplechar){
  var lyrics = [
    "Hello, Dolly",
    "Well, hello, Dolly",
    "It's so nice to have you back where you belong",
    "You're lookin' swell, Dolly",
    "I can tell, Dolly",
    "You're still glowin', you're still crowin'",
    "You're still goin' strong"];
  simplechar (range, lyrics[Math.floor(Math.random() * lyrics.length)];
};
```

## Events

After the entire string is processed, it triggers a custom `sendkeys` event with event.detail set to the original string.
