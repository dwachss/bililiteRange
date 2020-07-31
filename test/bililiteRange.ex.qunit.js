multitest("Testing bililiteRange ex", function (rng, el, text, i, assert){
	rng.data.stdout = message => rng.exMessage = message;
	if (el.nodeName.toLowerCase() == 'input'){
		assert.expect(0); // line-oriented editing has little meaning for one line elements
		return;
	}
	var text = 'One\nTwo\nThree';
	rng.all(text).ex('2 a foo');
	assert.equal (rng.all(), 'One\nTwo\nfoo\nThree', 'append');
	assert.deepEqual (rng.lines(), [3,3], 'append line set');
	rng.all('One\n\tTwo\nThree').ex('2 a! foo');
	assert.equal (rng.all(), 'One\n\tTwo\n\tfoo\nThree', 'append variant');
	rng.all(text).ex('/Three/c bar');
	assert.equal (rng.all(), 'One\nTwo\nbar', 'change');
	assert.deepEqual (rng.lines(), [3,3], 'change line set');
	rng.all('One\nTwo\n\tThree').ex('/Three/c! bar');
	assert.equal (rng.all(), 'One\nTwo\n\tbar', 'change variant');
	rng.all(text).ex('1,2d');
	assert.equal (rng.all(), 'Three', 'delete');
	assert.deepEqual (rng.lines(), [1,1], 'delete line set');
	rng.ex('put');
	assert.equal (rng.all(), 'Three\nOne\nTwo\n', 'put'); // note that all the insertions will add newlines at the end of the file
	// documentation does not specify new current line for put.
	rng.all(text).ex('%g/e/ c foo');
	assert.equal (rng.all(), 'foo\nTwo\nfoo', 'global');
	rng.all(text).ex('%g!/e/ c foo');
	assert.equal (rng.all(), 'One\nfoo\nThree', 'global variant');
	rng.all(text).ex('%v/e/ c foo');
	assert.equal (rng.all(), 'One\nfoo\nThree', 'global variant2');
	rng.all(text).ex('3i "one\\ttwo"');
	assert.equal (rng.all(), 'One\nTwo\none\ttwo\nThree', 'insert');
	assert.deepEqual (rng.lines(), [3,3], 'insert line set');
	rng.all(text).ex('1j');
	assert.equal (rng.all(), 'One Two\nThree', 'join');
	assert.deepEqual (rng.lines(), [1,1], 'join line set');
	rng.all(text).ex('1j!');
	assert.equal (rng.all(), 'OneTwo\nThree', 'join variant');
	rng.all(text).ex('1m3');
	assert.equal (rng.all(), 'Two\nThree\nOne\n', 'move forward');
	assert.deepEqual (rng.lines(), [3,3], 'move forward line set');
	rng.all(text).ex('3m0');
	assert.equal (rng.all(), 'Three\nOne\nTwo\n', 'move back');
	assert.deepEqual (rng.lines(), [1,1], 'move back line set');
	rng.all(text).ex('/Two/;+1 s/[et]/*/ig');
	assert.equal (rng.all(), 'One\n*wo\n*hr**', 'substitute');
	rng.all(text).ex('1,2y|3put');
	assert.equal (rng.all(), 'One\nTwo\nThree\nOne\nTwo\n', 'yank');
	rng.all(text).ex('1,2=');
	assert.equal (rng.exMessage, '[1, 2]', '=');
	rng.all(text).ex('1,2>');
	assert.equal (rng.all(), '\tOne\n\tTwo\nThree', '>');
	rng.ex('1<');
	assert.equal (rng.all(), 'One\n\tTwo\nThree', '<');
	rng.all(text).ex('%s "/e/f/g"  | %~ //x/g');
	assert.equal (rng.all(), text.replace(/e/g, 'x'), '~');
});
multitest("Testing bililiteRange multi-line commands", function (rng, el, text, i, assert){
	if (el.nodeName.toLowerCase() == 'input') return assert.expect(0);
	rng.all('One\nTwo\nThree').ex('2a foo | 4c bar | %>');
	assert.equal(rng.all(), '\tOne\n\tTwo\n\tfoo\n\tbar', 'multiple commands done');
});
multitest("Testing bililiteRange ex shell escape", function (rng, el, text, i, assert){
	rng.text(text).ex('%! return this.text().toUpperCase()');
	assert.equal(rng.all(), rng.all().toUpperCase(), '!');
	if (el.nodeName.toLowerCase() == 'input') return;
	rng.all('One\nTwo\nThree').ex('2! return this.text().split("").reverse().join("")');
	assert.equal(rng.all(), 'One\nowT\nThree', 'shell escape replaces text');
	rng.ex('! this.data.foo = true');
	assert.equal(rng.all(), 'One\nowT\nThree', 'shell escape that returns undefined does not change text');
	assert.equal(rng.data.foo, true, 'shell escape that returns undefined has side effects');
});
multitest("Testing bililiteRange ex marks", function (rng, el, text, i, assert, done){
	rng.data.stdout = message => rng.exMessage = message;
	if (el.nodeName.toLowerCase() == 'input'){
		assert.expect(0); // line-oriented editing has little meaning for one line elements
		done();
		return;
	}
	assert.expect (4);
	var text = 'One\nTwo\nThree';
	rng.all(text).ex('2mark x').ex("'x=");
	assert.equal (rng.exMessage, '[2]', 'mark has correct line number');
	assert.equal (rng.text(), 'Two', 'mark has correct text');
	rng.bounds([1,1]).text('inserted');
	async(function(){
		rng.ex("'x=");
		assert.equal (rng.exMessage, '[2]', 'mark retains line number');
		assert.equal (rng.text(), 'Two', 'mark stays live');
		done();
	})(); // input events are async, so the live happens after the test
}, true);
multitest("Testing bililiteRange ex options", function (rng, el, text, i, assert){
	rng.data.stdout = message => rng.exMessage = message;
	rng.ex('set ai|ai?');
	assert.equal (rng.exMessage, 'on', 'set boolean');
	rng.ex('set sw=12|set tabSize?');
	assert.equal (rng.exMessage, '[12]', 'set numeric');
});
multitest("Testing bililiteRange ex errors", function (rng, el, text, i, assert){
	rng.data.stderr = message => rng.exMessage = message;
	rng.all(text).ex('foo');
	assert.equal (rng.exMessage.toString(), 'Error: foo not defined', 'Thrown errors are caught');
	rng.ex('set ===');
	assert.equal (rng.exMessage.toString(), 'Error: Bad syntax in set: ===', 'Thrown errors are caught');
});
multitest ('Testing ex read/write', function (rng, el, text, i, assert, done){
	rng.data.stdout = message => rng.exMessage = message;
	assert.expect(12);
	const rng2 = bililiteRange(rng.element).ex(); // initialize ex on the *element*
	rng.data.file = 'test file';
	rng.data.directory = 'C:';
	assert.equal (rng2.data.file, 'test file', 'file name set on element');
	assert.equal (rng2.data.directory, 'C:', 'directory set on element');
	rng.ex('file');
	assert.equal (rng.exMessage, '"test file"', 'file name set in ex');
	rng.ex('dir');
	assert.equal (rng.exMessage, '"C:"', 'directory set in ex');
	rng.ex('dir D:');
	assert.equal (rng.data.directory, 'D:', 'directory changed in ex');
	localStorage.setItem(rng.data.file, text);
	rng.ex('e');
	Promise.resolve().then(
		() => assert.equal (rng.all(), text, 'edit, default file')
	).then(
		() => localStorage.setItem('other file', text.split('').reverse().join(''))
	).then(
		() => rng.ex('e other file')
	).then(
		// input type=date can't be set to arbitrary data
		() => assert.equal (rng.all(), i == 3 ? '' : text.split('').reverse().join(''), 'edit, named file')
	).then(
		() => assert.equal (rng.data.file, 'other file', 'file name changed')
	).then(
		() => rng.ex('file test file')
	).then(
		() => assert.equal (rng.data.file, 'test file', 'file name recorded')
	).then(
		() => rng.all('1969-12-31').ex('write')
	).then(
		() => assert.equal (localStorage.getItem('test file'), '1969-12-31', 'write')
	).then(
		() => rng.ex('write new file')
	).then(
		() => assert.equal (localStorage.getItem('new file'), '1969-12-31', 'write named file')
	).then(
		() => assert.equal (rng.data.file, 'new file', 'write named file changes file name')
	).then(
		() => done()
	);
}, true);
