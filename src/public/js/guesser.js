/* Initialization */

var canvas = null;

window.addEventListener('DOMContentLoaded',
	function (event) {
		setupDrawing();
	});

const unihiero = new UniHiero();

function paint() {
	canvas.paint();
}

function erase() {
	canvas.erase();
}

function clean() {
	canvas.clean();
	clearCandidates();
}

function guess() {
	const request = new XMLHttpRequest();
	request.responseType = 'json';
	request.onload = function () {
		if (request.status == 200) {
			listCandidates(request.response);
		} else { // 404
			alert(request.response.message);
		}
	};
	request.open('post', '../signs/classify');
	const image = canvas.sign.toDataURL();
	const imageStr = JSON.stringify(image);
	var formData = new FormData();
	formData.append('sign', imageStr);
	request.send(formData);
	setWait();
}

function setupDrawing() {
	const container = $('container');
	canvas = new DrawCanvas(container);
	canvas.setSize(400, 400);
	canvas.paintThick = 10;
	canvas.eraseThick = 30;
	canvas.process = guess;
}

function clearCandidates() {
	const candidateList = $('candidates');
	removeChildren(candidateList);
}

function setWait() {
	clearCandidates();
	const candidateList = $('candidates');
	const li = document.createElement('li');
	const span = document.createElement('span');
	span.innerHTML = '&#8987;';
	span.className = 'wait';
	li.append(span);
	candidateList.append(li);
}

function addCandidate(candidate) {
	const candidateList = $('candidates');
	const li = document.createElement('li');
	const cand = document.createElement('div');
	const perc = document.createElement('span');
	const name = document.createElement('span');
	const text = document.createElement('span');
	cand.className = 'candidate';
	name.className = 'candidate-name';
	text.className = 'candidate-text';
	perc.innerHTML = String(candidate.portion) + '%';
	name.innerHTML = candidate.name;
	text.innerHTML = unihiero.nameToText(candidate.name);
	cand.append(name);
	cand.append(text);
	li.append(perc);
	li.append(cand);
	candidateList.append(li);
}

function listCandidates(candidates) {
	clearCandidates();
	candidates.forEach(c => addCandidate(c));
}
