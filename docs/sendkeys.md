bililiteRange.text() works well to insert text into ranges, but I wanted to be able to simulate other keys, ala Microsoft's SendKeys. bililiteRange.sendkeys() does exactly that. It basically executes text(string, 'end') but interprets any text between braces ('{key}') as a command representing a special key. For security reasons, the browser won't let you do anything outside of the text of the page itself, but I've implemented the following (the key names are from the proposed DOM3 standard)::

Backspace
Delete backwards
Delete
Delete forwards
ArrowRight
Move the insertion point to the right
ArrowLeft
Move the insertion point to the left
Enter
Insert a newline, with bililiteRange.insertEOL(). Warning: In contenteditable elements, Enter is flaky and inconsistent across browsers. This is due to the flakiness of contenteditable itself; I can't figure out what to do about this.
For backwards-compatibility with older versions, the following synonyms also work: backspace, del, rightarrow, leftarrow and enter.

So, for example, bililiteRange(el).sendkeys('foo') replaces the current range with 'foo' and sets the range to just after that string. bililiteRange(el).sendkeys('foo{Delete}{ArrowLeft}{ArrowLeft}') replaces the current range with 'foo', removes the character just after that string and sets the range to between the 'f' and the 'o'.

To manipulate the selection, use the usual bililiteRange methods. Thus, to simulate a backspace key, use bililiteRange(el).bounds('selection').sendkeys('{Backspace}').select().
To insert a '{', use an unmatched brace, bililiteRange(el).sendkeys('this is a left brace: {'), or {{}, as in bililiteRange(el).sendkeys('function() {{} whatever }');.

If anyone knows how to implement an up or down arrow, or page up/down, please let me know.

Other Commands
To make life easier for me, there are a few other "keys" that implement specific actions:

selectall
Select the entire field
tab
Insert a '\t' character. $().sendkeys('\t') would work just as well, but there are circumstances when I wanted to avoid having to escape backslashes.
newline
Insert a '\n' character, without the mangling that {enter} does.
selection
Inserts the text of the original selection (useful for creating "wrapping" functions, like "<em>{selection}</em>").
mark
Remembers the current insertion point and restores it after the sendkeys call. Thus "<p>{mark}</p>" inserts <p></p> and leaves the insertion point between the tags.
So to wrap the text of a range in HTML tags, use range.sendkeys('<strong>{selection}</strong>'). To create a hyperlink, use range.sendkeys('<a href="{mark}">{selection}</a>') which leaves the range between the quote marks rather than at the end.

Plugins
Adding new commands is easy. All the commands are in the bililiteRange.sendkeys object, indexed by the name of the command in braces (since that made parsing easier). The commands are of the form function (rng, c, simplechar) where rng is the target bililiteRange, c is the command name (in braces), and simplechar is a function simplechar (range, string) that will insert string into the range. range.data().sendkeysOriginalText is set to the original text of the range, and rng.data().sendkeysBounds is the argument for bililiteRange.bounds() that will be used at the end.

So, for example:

bililiteRange.sendkeys['{tab}'] = function (range, c, simplechar) { simplechar(rng, '\t') };
bililiteRange['{Backspace}'] = function (range, c, simplechar){
  var b = rng.bounds();
  if (b[0] == b[1]) rng.bounds([b[0]-1, b[0]]); // no characters selected; it's just an insertion point. Remove the previous character
  rng.text('', 'end'); // delete the characters and update the selection
};
bililiteRange.sendkeys['{selectall}'] = function (range, c, simplechar) { rng.bounds('all') };
So to have a reverse-string command:

bililiteRange['{reverse}'] = function (range, c, simplechar){
  simplechar(range, range.sendkeysOriginalText.split('').reverse().join(''));
};
Or, to annoy the anti-WordPress crowd, a Hello, Dolly command:

bililiteRange['{dolly}'] = function (range, c, simplechar){
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
Events
After each printing character (not the specials, unless they call simplechar) it triggers a keydown event with event.which, event.keyCode and event.charCode set to the Unicode value of the character.
After the entire string is processed, it triggers a custom sendkeys event with event.which set to the original string.