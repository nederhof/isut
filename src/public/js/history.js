function deleteEdit(elem) {
	const row = elem.parentElement.parentElement;
	const table = row.parentElement;
	table.removeChild(row);
}

function textField(username) {
	const td = document.createElement('td');
	const input = document.createElement('input');
	input.setAttribute('type', 'text');
	input.setAttribute('value', username);
	td.append(input);
	return td;
}

function now() {
	return (new Date()).toISOString().split('.')[0];
}

function dateField() {
	const td = document.createElement('td');
	const input = document.createElement('input');
	input.setAttribute('type', 'datetime-local');
	input.setAttribute('value', now());
	td.append(input);
	return td;
}

function deleteButton() {
	const td = document.createElement('td');
	const button = document.createElement('button');
	button.setAttribute('type', 'button');
	button.className = 'warning';
	button.addEventListener('click', event => deleteEdit(button));
	button.innerHTML = 'Delete';
	td.append(button);
	return td;
}

function addEdit(username) {
	const row = document.createElement('tr');
	row.append(textField(username));
	row.append(dateField());
	row.append(deleteButton());
	$('table').append(row);
}

function submit(_id, name) {
	var edits = [];
	const rows = $('table').getElementsByTagName('tr');
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const inputs = row.getElementsByTagName('input');
		var username = name;
		var date = now();
		for (let j = 0; j < inputs.length; j++) {
			const input = inputs[j];
			if (input.getAttribute('type') == 'text')
				username = input.value;
			if (input.getAttribute('type') == 'datetime-local')
				date = input.value;
		}
		edits.push({ username, date });
	}
	edits.sort((a, b) => a.date < b.date ? -1 : b.date < a.date ? 1 : 0);
	const editstring = JSON.stringify(edits);
	submitForm('../text/history', { _id, editstring });
}
