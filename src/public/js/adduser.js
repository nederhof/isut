function validate(form) {
	if ($('username').value.trim() == '') {
		alert('Username should not be empty');
		return false;
	}
	if ($('name').value.trim() == '' && !confirm('Name to be left blank?'))
		return false;
	if ($('password1').value.trim() == '') {
		alert('Password should not be empty');
		return false;
	}
	const p1 = $('password1').value.trim();
	const p2 = $('password2').value.trim();
	if ((p1 != '' || p2 != '') && p1 != p2) {
		alert('Passwords should be identical');
		return false;
	}
	return true;
}
