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
let range = bililiteRange( document.querySelector('div.editor'));
range.data.hilighter = 'Prism';

// elsewhere in the code
let range2 = bililiteRange( document.querySelector('div.editor'));
console.log(range.data.hilighter); // 'Prism'
````