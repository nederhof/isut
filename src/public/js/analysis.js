/* Initialization */

window.addEventListener('DOMContentLoaded',
	function (event) {
		if (embeddings.length > 0) {
			initializeCanvas();
			makeFeatures();
			makeFeatureSelection();
			makeLegend();
		}
	});

var embeddingCanvas = null;

function initializeCanvas() {
	const container = $('embedding-canvas');
	if (dimension == 3) {
		embeddingCanvas = new ZoomCanvasPlot3D(container);
		addPoints3D();
	} else if (dimension == 2) {
		embeddingCanvas = new ZoomCanvasPlot2D(container);
		addPoints2D();
	} else {
		embeddingCanvas = new ZoomCanvasPlot2D(container);
		addRegions1D();
	}
	embeddingCanvas.fillInfo = fillInfo;
	embeddingCanvas.selectInfo = selectInfo;
}

function addPoints3D() {
	var points = [];
	for (let i = 0; i < embeddings.length; i++) {
		const glyph = embeddings[i];
		const em = glyph.embedding;
		const point = new Point3D(em[0], em[1], em[2]);
		const radius = 5;
		points.push({ point, radius, glyph });
	}
	embeddingCanvas.points3D = points;
	embeddingCanvas.derive2D();
}

function addPoints2D() {
	var points = [];
	for (let i = 0; i < embeddings.length; i++) {
		const glyph = embeddings[i];
		const em = glyph.embedding;
		const point = new Point(em[0], em[1]);
		const radius = 5;
		points.push({ point, radius, glyph });
	}
	embeddingCanvas.points2D = points;
}

function addRegions1D() {
	embeddings.sort((a, b) => a.embedding[0] - b.embedding[0]);
	const minDist = 0.5 / embeddings.length;
	var rectangles = [];
	for (let i = 0; i < embeddings.length; i++) {
		const glyph = embeddings[i];
		const prev = i > 0 ? embeddings[i-1].embedding[0] : -1;
		const next = i < embeddings.length-1 ? embeddings[i+1].embedding[0] : 1;
		const em = glyph.embedding[0];
		const low = (prev + em) / 2;
		var high = (em + next) / 2;
		if (high-low < minDist)
			high = low + minDist;
		const width = high-low;
		const rectangle = new Rectangle(low, 0, width, 0);
		rectangles.push({ rectangle, low, high, width, glyph });
	}
	const lowWidth = getMinFunction(rectangles, r => r.width).width;
	const area = 1.8 * lowWidth;
	for (let i = 0; i < rectangles.length; i++) {
		const rect = rectangles[i];
		height = area / rect.width;
		rect.rectangle.y = -height / 2;
		rect.rectangle.h = height;
	}
	embeddingCanvas.rectangles = rectangles;
}

var fileToImg = {};
var infoGlyph = null;

function fillInfo(glyph) {
	if (glyph) {
		const info = embeddingCanvas.info
		const name = glyph.name;
		const textname = glyph.textname;
		const path = glyph.path;
		const file = nestedTextFile(path) + '.png';
		if (file in fileToImg) {
			info.append(fileToImg[file]);
		} else {
			const img = document.createElement('img');
			img.src = file;
			info.append(img);
			fileToImg[file] = img;
		}
		if (multipleTexts() || multipleGlyphs()) {
			const label = document.createElement('div');
			label.innerHTML = (multipleTexts() ? textname : '') + 
				(multipleTexts() && multipleGlyphs() ? ': ' : '') +
				(multipleGlyphs() ? name : '');
			info.append(label);
		}
		infoGlyph = glyph;
		setColors();
	} else if (infoGlyph) {
		infoGlyph = null;
		setColors();
	}
}

function selectInfo(glyph) {
	const _id = glyph._id;
	const path = glyph.path;
	const pageIndex = path[1];
	const lineIndex = path[2];
	const glyphIndex = path[3];
	location.href = '../page/view?_id=' + _id + 
		'&index=' + pageIndex + '&lineindex=' + lineIndex + '&glyphindex=' + glyphIndex;
}

window.addEventListener('resize',
	function (event) {
		if (embeddingCanvas)
			embeddingCanvas.redraw();
	});

/* Features and colors */

var glyphNames = new Set();
var textNames = new Set();
var periodNames = new Set();
var provenanceNames = new Set();
var genreNames = new Set();

var colorMap = {};

var highlighted = null;

function makeFeatures() {
	for (let i = 0; i < embeddings.length; i++) {
		const glyph = embeddings[i];
		glyphNames.add(glyph.name);
		textNames.add(glyph.textname);
		periodNames.add(glyph.period);
		provenanceNames.add(glyph.provenance);
		genreNames.add(glyph.genre);
	}
}

function multipleGlyphs() {
	return glyphNames.size > 1;
}
function multipleTexts() {
	return textNames.size > 1;
}
function multiplePeriods() {
	return periodNames.size > 1;
}
function multipleProvenances() {
	return provenanceNames.size > 1;
}
function multipleGenres() {
	return genreNames.size > 1;
}

function multipleGlyphsInLegend() {
	return multipleGlyphs() && (!$('merge-glyph') || !$('merge-glyph').checked);
}
function multipleTextsInLegend() {
	return multipleTexts() && (!$('merge-text') || !$('merge-text').checked);
}
function multiplePeriodsInLegend() {
	return multiplePeriods() && $('merge-period') && $('merge-period').checked;
}
function multipleProvenancesInLegend() {
	return multipleProvenances() && $('merge-provenance') && $('merge-provenance').checked;
}
function multipleGenresInLegend() {
	return multipleGenres() && $('merge-genre') && $('merge-genre').checked;
}

function makeFeatureSelection() {
	const divSel = $('feature-selections');
	const divForm = $('feature-form');
	if (multipleGlyphs() || multipleTexts()) {
		const mergeLabel = document.createElement('label');
		mergeLabel.innerHTML = 'Merge:';
		divForm.append(mergeLabel);
		if (multipleGlyphs()) {
			const glyphBox = document.createElement('input');
			glyphBox.type = 'checkbox';
			glyphBox.value = 'merge-glyph';
			glyphBox.id = 'merge-glyph';
			divForm.append(glyphBox);
			const glyphLabel = document.createElement('label');
			glyphLabel.innerHTML = 'glyphs';
			glyphLabel.for = 'merge-glyph';
			divForm.append(glyphLabel);
			glyphBox.addEventListener('click', event => redoSelections(event));
			if (multipleTexts()) {
				const textBox = document.createElement('input');
				textBox.type = 'checkbox';
				textBox.value = 'merge-text';
				textBox.id = 'merge-text';
				divForm.append(textBox);
				const textLabel = document.createElement('label');
				textLabel.innerHTML = 'texts';
				textLabel.for = 'merge-text';
				divForm.append(textLabel);
				textBox.addEventListener('click', event => redoSelections(event));
			}
		}
		if (multiplePeriods()) {
			const periodBox = document.createElement('input');
			periodBox.type = 'checkbox';
			periodBox.value = 'merge-period';
			periodBox.id = 'merge-period';
			divForm.append(periodBox);
			const periodLabel = document.createElement('label');
			periodLabel.innerHTML = 'per period';
			periodLabel.for = 'merge-period';
			divForm.append(periodLabel);
			periodBox.addEventListener('click', event => redoSelections(event));
		}
		if (multipleProvenances()) {
			const provenanceBox = document.createElement('input');
			provenanceBox.type = 'checkbox';
			provenanceBox.value = 'merge-provenance';
			provenanceBox.id = 'merge-provenance';
			divForm.append(provenanceBox);
			const provenanceLabel = document.createElement('label');
			provenanceLabel.innerHTML = 'per provenance';
			provenanceLabel.for = 'merge-provenance';
			divForm.append(provenanceLabel);
			provenanceBox.addEventListener('click', event => redoSelections(event));
		}
		if (multipleGenres()) {
			const genreBox = document.createElement('input');
			genreBox.type = 'checkbox';
			genreBox.value = 'merge-genre';
			genreBox.id = 'merge-genre';
			divForm.append(genreBox);
			const genreLabel = document.createElement('label');
			genreLabel.innerHTML = 'per genre';
			genreLabel.for = 'merge-genre';
			divForm.append(genreLabel);
			genreBox.addEventListener('click', event => redoSelections(event));
		}
		divSel.classList.remove('hidden');
	}
}

function redoSelections(event) {
	const mText = $('merge-text');
	const mPeriod = $('merge-period');
	const mProvenance = $('merge-provenance');
	const mGenre = $('merge-genre');
	if (event.target == mText && mText.checked) {
		if (mPeriod)
			mPeriod.checked = false;
		if (mProvenance)
			mProvenance.checked = false;
		if (mGenre)
			mGenre.checked = false;
	}
	if (event.target == mPeriod && mPeriod.checked) {
		if (mText)
			mText.checked = false;
		if (mProvenance)
			mProvenance.checked = false;
		if (mGenre)
			mGenre.checked = false;
	}
	if (event.target == mProvenance && mProvenance.checked) {
		if (mText)
			mText.checked = false;
		if (mPeriod)
			mPeriod.checked = false;
		if (mGenre)
			mGenre.checked = false;
	}
	if (event.target == mGenre && mGenre.checked) {
		if (mText)
			mText.checked = false;
		if (mPeriod)
			mPeriod.checked = false;
		if (mProvenance)
			mProvenance.checked = false;
	}
	makeLegend();
}

function makeLegend() {
	colorMap = {};
	var colorNum = 1;
	const nextColor = function () { return COLORS[colorNum++]; };
	removeChildren($('legend'));
	if (multipleGlyphsInLegend())
		for (let glyphName of Array.from(glyphNames).sort())
			if (multipleTextsInLegend()) {
				attachLegendElement(glyphName);
				if (multiplePeriodsInLegend())
					for (let periodName of Array.from(periodNames).sort())
						attachColorLegendElement(nextColor(), 'period', glyphName, periodName); 
				else if (multipleProvenancesInLegend())
					for (let provenanceName of Array.from(provenanceNames).sort())
						attachColorLegendElement(nextColor(), 'provenance', glyphName, provenanceName); 
				else if (multipleGenresInLegend())
					for (let genreName of Array.from(genreNames).sort())
						attachColorLegendElement(nextColor(), 'genre', glyphName, genreName); 
				else
					for (let textName of Array.from(textNames).sort())
						attachColorLegendElement(nextColor(), 'text', glyphName, textName); 
			} else {
				attachColorLegendElement(nextColor(), 'glyph', 'any', glyphName);
			}
	else if (multiplePeriodsInLegend())
		for (let periodName of Array.from(periodNames).sort())
			attachColorLegendElement(nextColor(), 'period', 'any', periodName); 
	else if (multipleProvenancesInLegend())
		for (let provenanceName of Array.from(provenanceNames).sort())
			attachColorLegendElement(nextColor(), 'provenance', 'any', provenanceName); 
	else if (multipleGenresInLegend())
		for (let genreName of Array.from(genreNames).sort())
			attachColorLegendElement(nextColor(), 'genre', 'any', genreName); 
	else if (multipleTextsInLegend())
		for (let textName of Array.from(textNames).sort())
			attachColorLegendElement(nextColor(), 'text', 'any', textName); 
	else
		attachColorLegendElement(nextColor(), 'any', 'any', 'all', event => {});
	setColors();
}

function attachLegendElement(text) {
	const divName = document.createElement('div');
	divName.innerHTML = text;
	$('legend').append(divName);
}

function attachColorLegendElement(color, kind, glyphname, name) {
	const div = document.createElement('div');
	div.className = 'legend-item';
	const span = document.createElement('span');
	span.innerHTML = name;
	div.addEventListener('mouseover', makeHighlighted(kind, glyphname, name));
	div.addEventListener('mouseout', makeNoHighlighted());
	div.append(bulletCanvas(color));
	div.append(span);
	$('legend').append(div);
	const coverage = colorCoverage(kind, glyphname, name);
	colorMap[coverage] = color;
}

function makeHighlighted(kind, glyphname, name) {
	return function (event) {
		highlighted = colorCoverage(kind, glyphname, name);
		setColors();
	};
}

function makeNoHighlighted() {
	return function (event) {
		highlighted = null;
		setColors();
	};
}

function setColors() {
	for (let i = 0; i < embeddings.length; i++)
		setColor(embeddings[i]);
	embeddingCanvas.redraw();
}

function setColor(glyph) {
	if (glyph == infoGlyph) {
		glyph.color = 'black';
		return;
	}
	if (highlighted && notHighlighted(glyph)) {
		glyph.color = 'yellow';
		return;
	}
	if (tryCoverGlyph(glyph, 'period', glyph.name, glyph.period)) return;
	if (tryCoverGlyph(glyph, 'provenance', glyph.name, glyph.provenance)) return;
	if (tryCoverGlyph(glyph, 'genre', glyph.name, glyph.genre)) return;
	if (tryCoverGlyph(glyph, 'text', glyph.name, glyph.textname)) return;
	if (tryCoverGlyph(glyph, 'glyph', 'any', glyph.name)) return;
	if (tryCoverGlyph(glyph, 'period', 'any', glyph.period)) return;
	if (tryCoverGlyph(glyph, 'provenance', 'any', glyph.provenance)) return;
	if (tryCoverGlyph(glyph, 'genre', 'any', glyph.genre)) return;
	if (tryCoverGlyph(glyph, 'text', 'any', glyph.textname)) return;
	if (tryCoverGlyph(glyph, 'any', 'any', 'all')) return;
	glyph.color = 'black';
}

function notHighlighted(glyph) {
	return !isHighlighted('period', glyph.name, glyph.period) &&
		!isHighlighted('provenance', glyph.name, glyph.provenance) &&
		!isHighlighted('genre', glyph.name, glyph.genre) &&
		!isHighlighted('text', glyph.name, glyph.textname) &&
		!isHighlighted('glyph', 'any', glyph.name) &&
		!isHighlighted('period', 'any', glyph.period) &&
		!isHighlighted('provenance', 'any', glyph.provenance) &&
		!isHighlighted('genre', 'any', glyph.genre) &&
		!isHighlighted('text', 'any', glyph.textname) &&
		!isHighlighted('any', 'any', 'all');
}

function isHighlighted(kind, glyphname, name) {
	return colorCoverage(kind, glyphname, name) == highlighted;
}

function tryCoverGlyph(glyph, kind, glyphname, name) {
	const coverage = colorCoverage(kind, glyphname, name);
	if (coverage in colorMap) {
		glyph.color = colorMap[coverage];
		return true;
	} else {
		return false;
	}
}

function colorCoverage(kind, glyphname, name) {
	return kind + ',' + glyphname + ',' + name;
}

function bulletCanvas(color) {
	const radius = 5;
	const canvas = document.createElement('canvas');
	canvas.width = 2 * radius;
	canvas.height = 2 * radius;
	canvas.className = 'bullet';
	const ctx = canvas.getContext('2d');
	ctx.beginPath();
	ctx.fillStyle = color;
	ctx.arc(radius, radius, radius, 0, 2 * Math.PI, false);
	ctx.fill();
	return canvas;
}

/* Unicode */

const unihiero = new UniHiero();

function takeEncoding(value) {
	var field = $('signname');
	const text = unihiero.nameToText(value);
	if (field.value == '')
		field.value = text;
	else
		field.value += ' ' + text;
}
