function validate(form) {
	if ($('name').value.trim() == '' &&
			!confirm('Name to be left blank?'))
		return false;
	const p1 = $('password1').value.trim();
	const p2 = $('password2').value.trim();
	if ((p1 != '' || p2 != '') && p1 != p2) {
		alert('Passwords are not identical');
		return false;
	}
	return true;
}

function train() {
	$('wait').classList.remove('hidden');
	location.href='../admin/train';
}
