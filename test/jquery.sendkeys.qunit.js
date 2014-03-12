multitest("Testing bililiteRange.sendkeys", function (rng, el, text, i){
	rng.all(text);
	rng.bounds([1,1]).sendkeys('12{backspace}3{leftarrow}4{rightarrow}56{leftarrow}{del}');
	equal(rng.all(), text.replace(/^./, '$&1435'), 'sendkeys bililiteRange');
});
multitest("Testing jquery.sendkeys", function (rng, el, text, i){
	rng.all(text);
	rng.bounds([1,1]).select();
	$(el).sendkeys('12{backspace}3{leftarrow}4{rightarrow}56{leftarrow}{del}');
	equal(rng.all(), text.replace(/^./, '$&1435'), 'sendkeys jquery');
});