function validate(form) {
	const fileName = $('file').value;
	if (!fileName) {
		alert('Select file');
		return false;
	} else if (imageExtensions.indexOf(extensionOf(fileName)) < 0) {
		alert('Extension should be one of: ' + imageExtensions);
		return false;
	} else {
		return true;
	}
}
