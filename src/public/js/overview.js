/* Unicode */

const unihiero = new UniHiero();

function saveEncoding(value) {
	if (value.includes('\uFFFD'))
		return;
	var field = $('signname');
	const text = unihiero.nameToText(value);
	if (field.value == '')
		field.value = text;
	else
		field.value += ' ' + text;
}

function cancelEncoding() {
}

