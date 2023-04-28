/* header */

function logout(userPage) {
	const request = new XMLHttpRequest();
	request.onload = function () {
		if (userPage)
			location.href = '../texts/view';
		else
			location.reload(true);
	};
	request.open('post', '../admin/logout');
	request.send();
}

function toggleMenu() {
	$('nav').classList.toggle('responsive');
}

document.addEventListener('DOMContentLoaded', function() {
	$('hamburger-menu').addEventListener('click', toggleMenu);
});
