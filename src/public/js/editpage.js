function deletePage(_id, index) {
	if (!confirm('Delete page?'))
		return;
	submitForm('../page/delete', { _id, index });
}

function addImage(_id, index) {
	submitForm('../page/addimage', { _id, index }); 
}

function deleteImage(_id, index, type) {
	if (!confirm('Delete image ' + type + '?'))
		return;
	submitForm('../page/deleteimage', { _id, index, type }); 
}

/* Util */

function pathToPoly(p) {
	var poly = [];
	for (var i = 0; i < p.length; i++)
		poly.push(new Point(p[i].x, p[i].y));
	return poly;
}

function polyToPath(p) {
	var path = [];
	for (var i = 0; i < p.length; i++)
		path.push({ x: p[i].x, y: p[i].y });
	return path;
}

/* Data */

const defaultDirection = 'hrl';
const allDirections = ['hrl', 'vrl'];

var saveTimeout = null;
var versionCurrent = 0;
var versionSaved = 0;

var changedGlyphs = [];

function processUpdated(versionUpdated) {
	versionSaved = Math.max(versionSaved, versionUpdated);
	changedGlyphs = changedGlyphs.filter(g => g.version > versionSaved);
	setSaved();
}

window.addEventListener('DOMContentLoaded',
	function (event) {
		initializePage();
	});

function setSaved() {
	if (versionSaved < versionCurrent) {
		$('autosaving').value = 'autosaving';
	} else {
		$('autosaving').value = 'Save';
	}
}

function registerChange() {
	versionCurrent++;
	prepareForSave(1000);
}

function registerChangeNow() {
	versionCurrent++;
	prepareForSave(1);
}

function registerGlyphChange(glyph) {
	changedGlyphs = changedGlyphs.filter(g => 
		g.data.lineIndex != glyph.data.lineIndex || g.data.index != glyph.data.index);
	versionCurrent++;
	glyph.version = versionCurrent;
	changedGlyphs.push(glyph);
	prepareForSave(2000);
}

function prepareForSave(delay) {
	setSaved();
	if (saveTimeout)
		clearTimeout(saveTimeout);
	saveTimeout = setTimeout(savePage, delay);
}

function changeName() {
	page.name = $('name').value.trim();
	registerChangeNow();
}

function changeType() {
	page.type = $('type').value.trim();
	registerChangeNow();
}

function savePage() {
	const request = new XMLHttpRequest();
	request.onload = function () {
		if (request.status == 200) {
			const versionReturned = parseInt(request.responseText, 10);
			processUpdated(versionReturned);
		} else { // 404 not found
			alert(request.responseText); 
		}
	};
	request.open('post', '../page/save');
	var formData = new FormData();
	formData.append('_id', _id);
	formData.append('page', JSON.stringify(page));
	const canvas = document.createElement('canvas');
	canvas.width = 10;
	canvas.height = 10;
	var added = [];
	var removed = [];
	for (const glyph of changedGlyphs) {
		const path = [textIndex, page.index, glyph.data.lineIndex, glyph.data.index];
		if (glyph.exists) {
			const data = glyph.toDataURL();
			added.push({ path, data });
		} else {
			removed.push(path);
		}
	}
	const addedStr = JSON.stringify(added);
	const removedStr = JSON.stringify(removed);
	formData.append('added', addedStr);
	formData.append('removed', removedStr);
	formData.append('version', String(versionCurrent));
	request.send(formData);
}

window.addEventListener('beforeunload',
	function (event) {
		if (versionSaved < versionCurrent) {
			event.preventDefault();
			event.returnValue = '';
		}
	});

function unusedLineIndex() {
	const s = new Set();
	for (var i = 0; i < page.lines.length; i++)
		s.add(page.lines[i].index);
	for (var i = 0; i <= page.lines.length; i++)
		if (!s.has(i))
			return i;
}

/* All images */

window.addEventListener('resize',
	function (event) {
		redrawCanvasses();
	});

function redrawCanvasses() {
	if (!pageCanvas)
		return;
	pageCanvas.redraw();
	for (var i = 0; i < page.lines.length; i++) {
		const canvas = pageCanvas.polys[i].data.canvas;
		if (canvas)
			canvas.redraw();
	}
}

/* Page image */

var pageCanvas = null;

function initializePage() {
	const container = $('page-canvas');
	var polys = [];
	for (var i = 0; i < page.lines.length; i++) {
		const line = page.lines[i];
		const points = pathToPoly(line.points);
		points.data = { index: line.index, name: line.name, direction: line.direction, canvas: null };
		polys.push(points);
	}
	pageCanvas = new ZoomCanvasPolyEdit(container, polys);
	pageCanvas.loadHandlers.push(function () { 
		initializeLines(); 
		pageCanvas.redraw(); 
		scrollToIndex();
	});
	const dir = nestedTextDir([textIndex, page.index]);
	pageCanvas.load(dir + 'full.png');
	for (var i = 0; i < page.images.length; i++)
		pageCanvas.loadSecondary(dir + page.images[i] + '.png');
	pageCanvas.changeHandlers.push(lineChangeHandler);
	pageCanvas.deletionPermitted = function (i) { 
		return page.lines[i].glyphs.length == 0; 
	};
	pageCanvas.emptyData = function () {
		return { index: unusedLineIndex(), name: '', direction: defaultDirection, canvas: null }; 
	};
	for (var i = 0; i < page.lines.length; i++) {
		if (page.lines[i].index == lineIndex)
			pageCanvas.setEditFocus(i);
	}
}

function initializeLines() {
	const lines = $('line-list');
	removeChildren(lines);
	for (var i = 0; i < page.lines.length; i++) {
		const data = pageCanvas.polys[i].data;
		if (page.lines[i].points.length > 2) {
			addLine(data, lines, i);
		} else {
			data.canvas = null;
		}
	}
}

function lineChangeHandler(i) {
	if (i < 0) {
		page.lines = [];
		for (var i = 0; i < pageCanvas.polys.length; i++)
			page.lines.push(makeLine(i));
		initializeLines();
	} else {
		page.lines[i] = makeLine(i);
		const canvas = pageCanvas.polys[i].data.canvas;
		if (canvas) {
			canvas.clip = page.lines[i].points;
			canvas.adjustZoom();
			canvas.redraw();
		}
	}
	registerChange();
}

function makeLine(i) {
	const canvas = pageCanvas.polys[i].data.canvas;
	const index = pageCanvas.polys[i].data.index;
	const name = pageCanvas.polys[i].data.name;
	const points = polyToPath(pageCanvas.polys[i]);
	const direction = canvas ? canvas.direction : pageCanvas.polys[i].data.direction;
	const glyphs = [];
	if (canvas) {
		for (const g of canvas.glyphs) {
			const glyphIndex = g.data.index;
			const glyphName = g.button ? g.button.label.textContent : '';
			const position = { x: g.rect.x, y: g.rect.y, w: g.rect.w, h: g.rect.h };
			glyphs.push({ index: glyphIndex, name: glyphName, position });
		}
	}
	return { index, name, points, direction, glyphs };
}

function scrollToIndex() {
	for (var i = 0; i < page.lines.length; i++) {
		const line = page.lines[i];
		if (line.index == lineIndex && line.points.length > 2) {
			pageCanvas.polys[i].data.canvas.container.scrollIntoView();
		}
	}
}

/* Lines */

function addLine(data, lines, i) {
	const line = page.lines[i];
	const li = document.createElement('h3');
	li.className = 'line-title';
	li.innerHTML = 'Line ' + (i+1) + ' ( ';
	const lineName = document.createElement('input');
	lineName.className = 'line-name';
	lineName.setAttribute('type', 'text');
	lineName.setAttribute('value', line.name);
	lineName.addEventListener('change', function () {
		data.name = lineName.value.trim();
		page.lines[i] = makeLine(i);
		registerChange();
	});
	li.appendChild(lineName);
	li.appendChild(document.createTextNode(' )'));
	const container = document.createElement('div');
	var glyphs = [];
	const hs = line.glyphs.map(g => g.position.h);
	const maxH = Math.max(...hs);
	for (const glyph of line.glyphs) {
		const gImage = new SubImage(glyph.position.x, glyph.position.y);
		gImage.lineH = maxH;
		gImage.data = { index: glyph.index, lineIndex: line.index, name: glyph.name };
		gImage.src = nestedTextFile([textIndex, page.index, line.index, glyph.index]) + '.png';
		if (line.index == lineIndex && glyph.index == glyphIndex)
			gImage.active = true;
		glyphs.push(gImage);
	}
	const lineCanvas = new ZoomCanvasClippedAnnotated(container, line.direction, glyphs, 
		nameToText, textToName, nameEditor, nameGuesser);
	lineCanvas.directions = allDirections;
	lineCanvas.globalChangeHandlers.push(function () { globalChangeHandlers(i); });
	lineCanvas.glyphChangeHandlers.push(function (g) { glyphChangeHandler(i, g); });
	lineCanvas.glyphDeleteHandlers.push(function (g) { glyphDeleteHandler(i, g); });
	lineCanvas.emptyData = function () { 
		return { index: unusedGlyphIndex(lineCanvas), lineIndex: line.index, name: '' }; };
	lines.appendChild(li);
	lines.appendChild(container);
	lineCanvas.load(pageCanvas.image, line.points);
	lineCanvas.loadSecondaries(pageCanvas.images);
	const loadCounter = { count: glyphs.length };
	for (const g of glyphs) {
		g.loadHandlers.push(function () { 
			lineCanvas.formGlyphButton(g);
			loadCounter.count--;
			if (loadCounter.count == 0) {
				lineCanvas.redraw();
			}
		});
		g.load(g.src);
	}
	data.canvas = lineCanvas;
}

function globalChangeHandlers(i) {
	page.lines[i] = makeLine(i);
	registerChange();
}

function glyphChangeHandler(i, glyph) {
	glyph.exists = true;
	page.lines[i] = makeLine(i);
	registerGlyphChange(glyph);
}

function glyphDeleteHandler(i, glyph) {
	glyph.exists = false;
	page.lines[i] = makeLine(i);
	registerGlyphChange(glyph);
}

function unusedGlyphIndex(line) {
	const s = new Set();
	for (var i = 0; i < line.glyphs.length; i++) {
		if (line.glyphs[i].data)
			s.add(line.glyphs[i].data.index);
	}
	for (var i = 0; i <= line.glyphs.length; i++)
		if (!s.has(i))
			return i;
}

var editedGlyph = null;

function nameEditor(glyph) {
	editedGlyph = glyph;
	const value = glyph.button.label.textContent;
	if (value) {
		const encoded = encodeURIComponent(value);
		window.open('../lib/edit.html?encoding=' + encoded, '_blank');
	} else {
		window.open('../lib/edit.html?encoding=\uFFFD', '_blank');
	}
}

function saveEncoding(value) {
	if (editedGlyph && !value.includes('\uFFFD')) {
		editedGlyph.data.name = value;
		const text = nameToText(editedGlyph.data.name);
		ZoomCanvasClippedAnnotated.insertLabel(editedGlyph.button.label, text);
	}
	editedGlyph = null;
}

function cancelEncoding() {
}

const unihiero = new UniHiero();

function nameToText(name) {
	return unihiero.nameToText(name);
}

function textToName(text) {
	return unihiero.textToName(text);
}

function nameGuesser(glyph) {
	if (changedGlyphs.length > 0) {
		setTimeout(function() { nameGuesser(glyph); }, 2000);
		return;
	}
	const request = new XMLHttpRequest();
	request.addEventListener('load', function() {
		if (request.status == 200) {
			glyph.data.name = request.responseText;
			const text = nameToText(glyph.data.name);
			ZoomCanvasClippedAnnotated.insertLabel(glyph.button.label, text);
		} else { // 404 not found
			alert(request.responseText);
		}
	});
	var params = new URLSearchParams();
	params.set('text', textIndex);
	params.set('page', page.index);
	params.set('line', glyph.data.lineIndex);
	params.set('glyph', glyph.data.index);
	request.open('get', '../signs/guess?' + params);
	request.send();
}
