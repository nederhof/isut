function validate(form) {
	if ($('username').value.trim() == '') {
		alert('Username should not be empty');
		return false;
	}
	if ($('password').value.trim() == '') {
		alert('Password should not be empty');
		return false;
	}
	return true;
}
