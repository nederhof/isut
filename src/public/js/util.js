/* Files */

const imageExtensions = ['jpeg', 'jpg', 'gif', 'png', 'tiff', 'tif', 'raw', 'svg'];

function extensionOf(filename) {
	const parts = filename.split('.');
	return parts.length == 0 ? '' : parts.pop().toLowerCase();
}

/* Forms */

function makeFormAttribute(name, value) {
	var field = document.createElement('input');
	field.setAttribute('type', 'hidden');
	field.setAttribute('name', name);
	field.setAttribute('value', value);
	return field;
}

function submitForm(action, properties) {
	var form = document.createElement('form');
	form.setAttribute('method', 'post');
	form.setAttribute('action', action);
	for (const [key, value] of Object.entries(properties))
		form.appendChild(makeFormAttribute(key, value));
	document.body.appendChild(form);
	form.submit();
}

function highlight(elem) {
	elem.classList.add('changed');
}

/* Images */

const textsRoot = '../texts/';

function nestedTextDir(l) {
	var dir = textsRoot;
	for (var i = 0; i < l.length; i++)
		dir += l[i] + '/';
	return dir;
}

function nestedTextFile(l) {
	var dir = textsRoot;
	for (var i = 0; i < l.length; i++)
		dir += i < l.length - 1 ? l[i] + '/' : l[i];
	return dir;
}

function canvasToImageData(canvas) {
	const image = canvas.toDataURL();
	const data = image.split(',')[1];
	return data;
}
