multitest("Testing bililiteRange ex", function (rng, el, text, i){
	if (el.nodeName.toLowerCase() == 'input'){
		expect(0); // line-oriented editing has little meaning for one line elements
		return;
	}
	var text = 'One\nTwo\nThree';
	rng.all(text).ex('2 a foo');
	equal (rng.all(), 'One\nTwo\nfoo\nThree', 'append');
	rng.all('One\n\tTwo\nThree').ex('2 a! foo');
	equal (rng.all(), 'One\n\tTwo\n\tfoo\nThree', 'append variant');
	rng.all(text).ex('/Three/c bar');
	equal (rng.all(), 'One\nTwo\nbar', 'change');
	rng.all('One\nTwo\n\tThree').ex('/Three/c! bar');
	equal (rng.all(), 'One\nTwo\n\tbar', 'change variant');
	rng.all(text).ex('1,2d');
	equal (rng.all(), 'Three', 'delete');
	rng.ex('put');
	equal (rng.all(), 'Three\nOne\nTwo', 'put');
	rng.all(text).ex('%g/e/ c foo');
	equal (rng.all(), 'foo\nTwo\nfoo', 'global');
	rng.all(text).ex('%g!/e/ c foo');
	equal (rng.all(), 'One\nfoo\nThree', 'global variant');
	rng.all(text).ex('%v/e/ c foo');
	equal (rng.all(), 'One\nfoo\nThree', 'global variant2');
	rng.all(text).ex('3i "one\\ttwo"');
	equal (rng.all(), 'One\nTwo\none\ttwo\nThree', 'insert');
	rng.all(text).ex('1j');
	equal (rng.all(), 'One Two\nThree', 'join');
	rng.all(text).ex('1j!');
	equal (rng.all(), 'OneTwo\nThree', 'join variant');
	rng.all(text).ex('1m3');
	equal (rng.all(), 'Two\nThree\nOne', 'move');
	rng.all(text).ex('/Two/;+1 s/[et]/*/ig');
	equal (rng.all(), 'One\n*wo\n*hr**', 'substitute');
	rng.all(text).ex('1,2y|3put');
	equal (rng.all(), 'One\nTwo\nThree\nOne\nTwo', 'yank');
	rng.all(text).ex('1,2=');
	equal (rng.exMessage, '[1, 2]', '=');
	rng.all(text).ex('1,2>');
	equal (rng.all(), '\tOne\n\tTwo\nThree', '>');
	rng.ex('1<');
	equal (rng.all(), 'One\n\tTwo\nThree', '<');
	rng.all(text).ex('%s "/e/f/g"  | %~ //x/g');
	equal (rng.all(), text.replace(/e/g, 'x'), '~');
});
multitest("Testing bililiteRange ex marks", function (rng, el, text, i){
	if (el.nodeName.toLowerCase() == 'input'){
		expect(0); // line-oriented editing has little meaning for one line elements
		start();
		return;
	}
	expect (2);
	var text = 'One\nTwo\nThree';
	rng.all(text).ex('2mark x').bounds([1,1]).text('inserted');
	async(function(){
		rng.ex("'x=");
		equal (rng.exMessage, '[2]', 'mark retains line number');
		equal (rng.text(), 'Two\n', 'mark stays live');
		start();
	})(); // input events are async, so the live happens after the test
}, true);
multitest("Testing bililiteRange ex options", function (rng, el, text, i){
	rng.ex('set ai|ai?');
	equal (rng.exMessage, 'on', 'set boolean');
	rng.ex('set sw=12|set tabSize?');
	equal (rng.exMessage, '[12]', 'set numeric');
});
multitest("Testing bililiteRange ex escape", function (rng, el, text, i){
	rng.text(text).ex('%! this.text().toUpperCase()');
	equal(rng.all(), rng.all().toUpperCase(), '!');
});
