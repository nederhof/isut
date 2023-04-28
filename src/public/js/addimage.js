function validate(form) {
	const fileName = $('file').value;
	const typeName = $('type').value.trim();
	if (!fileName) {
		alert('Select file');
		return false;
	} else if (imageExtensions.indexOf(extensionOf(fileName)) < 0) {
		alert('Extension should be one of: ' + imageExtensions);
		return false;
	} else if (typeName == 'full' || typeName == 'thumb') {
		alert('Not a valid type: ' + typeName);
		return false;
	} else if (/^[a-z]+$/.test(typeName)) {
		return true;
	} else {
		alert('Enter type (lowercase letters only)');
		return false;
	}
}
