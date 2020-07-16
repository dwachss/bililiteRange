# `jquery.sendkeys.js`

Simple wrapper for [`bililiteRange.prototype.sendkeys`](sendkeys.md). Just:

```js
$.fn.sendkeys = function (x){
	return this.each( function(){
		bililiteRange(this).bounds('selection').sendkeys(x).select();
		this.focus();
	});
}; 
```

Keydown events are "untrusted", in the sense that only browser-generated events will insert text. Doing
`$( element ).trigger ( jQuery.Event( "keydown", { key: 'a' } ) )` will trigger script-defined handlers
but *not* the default action of inserting an 'a'.

`jquery.sendkeys.js` adds a special default action handler to `keydown` specifically to use `sendkeys` 
to overcome that. Now `$( element ).trigger ( jQuery.Event( "keydown", { key: 'a' } ) )` does
`$( element ).sendkeys(key)` for a single-character `key`, and 
`$( element ).sendkeys('{'+key+'}')` if `key` is longer than one character, since that represents 
a special key.