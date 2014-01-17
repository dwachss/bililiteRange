multitest("Testing sendkeys", function (rng, el, text, i){
	rng.all(text);
	rng.bounds([1,1]).select();
	$(el).sendkeys('12{backspace}3{leftarrow}4{rightarrow}56{leftarrow}{del}');
	equal(rng.all(), text.replace(/^./, '$&1435'), 'sendkeys keys');
});