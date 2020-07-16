# `bililiteRange` data

Often, we want to keep data that is specific to a given element, and shared by all ranges on that element.
Simply setting `element.foo = bar` works, but in the olden days (Internet Explorer 6) that 
caused [memory leaks](http://crockford.com/javascript/memory/leak.html). That is no longer a problem, but
putting so many new fields on the element lacks a certain elegance. So we create a single field, `element.bililiteRangeData`,
and store all our fields in that, with `element.bililiteRangeData.foo = bar`.

To avoid any possibility of a name conflict, we use a private variable `const dataKey = Symbol()` and actually do
`element[dataKey].foo`. To expose that (since `dataKey` is not exposed)
we define for each range `range.data = range.element()[dataKey]`.

So, for example,

````js
let range = bililiteRange( document.querySelector('div.editor') );
range.data.hilighter = 'Prism';

// elsewhere in the code
let range2 = bililiteRange( document.querySelector('div.editor') );
console.log(range.data.hilighter); // 'Prism'
````

## Options

That works well, but I created `bililiteRange` in part to implement the [ex line editor](ex.md), and I want some data to have default
values that can be changed for each element. So `data` is actually an object with a prototype.
`bililiteRange.createOption(prop, descriptor)` does `Object.defineProperty(data.prototype, prop, descriptor)`. Now every range has a
property `prop` with an 
[object descriptor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty).

So to set `autoindent`, do `bililiteRange.createOption('autoindent', {value: false})`.

The difference with `Object.defineProperty` is that the defaults are `{
		enumerable: true,
		writable: true,
		configurable: true
	}` rather than `false`.
	

## Monitored options

There is one more option that can be added to the property descriptor: `monitored`. `bililiteRange.createOption(prop, {monitored: true})`
adds a `set` handler for `prop` that, whenever `prop` is set (as in `range.data[prop] = newValue`), that change is signaled in two ways:

1. ``range.dispatch(CustomEvent(`data-${prop}`, {detail: newValue}))`` for use with EventListeners.

2. ``range.element().setAttribute(`data-${prop}`, newValue)`` for use with MutationObservers. Note that attributes have very limited legal
characters, so this will silently fail if `data-${prop}` is not a legal attribute name.