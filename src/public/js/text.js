function deleteText(_id) {
	if (!confirm("Delete text?"))
		return;
	submitForm('../text/delete', { _id });
}

function addPage(_id) {
	submitForm('../page/create', { _id });
}

function movePageUp(_id, index) {
	submitForm('../page/up', { _id, index });
}

function movePageDown(_id, index) {
	submitForm('../page/down', { _id, index });
}

function downloadText(_id, index) {
	window.open('../text/download?_id=' + _id + '&index=' + index);
}
