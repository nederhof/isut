function validate() {
	const signName = $('signname').value.trim();
	const textName = $('textname').value.trim();
	if (!signName && !textName) {
		alert('Enter at least sign names or text name');
		return false;
	} else {
		return true;
	}
}

function stopLoading() {
	window.stop();
}

const windowSize = 120;
const innerSize = 60;
const marginSize = (windowSize - innerSize) / 2;
const relMarginSize = marginSize / innerSize;
const relWindowSize = windowSize / innerSize;

var pages = {};

function getImageContext(canvas) {
	const textindex = canvas.getAttribute('data-textindex');
	const index = canvas.getAttribute('data-index');
	const lineindex = canvas.getAttribute('data-lineindex');
	const glyphindex = canvas.getAttribute('data-glyphindex');
	const file = nestedTextFile([textindex, index, lineindex, glyphindex]) + ".png";
	const page = nestedTextFile([textindex, index]) + "/full.png";
	const x = canvas.getAttribute('data-x');
	const y = canvas.getAttribute('data-y');
	const w = canvas.getAttribute('data-w');
	const h = canvas.getAttribute('data-h');
	const ctx = canvas.getContext('2d');
	canvas.width = windowSize;
	canvas.height = windowSize;
	if (!(page in pages)) {
		const img = new Image();
		const glyphs = [];
		img.addEventListener('load', function() { completePageLoading(img, glyphs); }, false);

		pages[page] = { img, glyphs };
	}
	pages[page].glyphs.push({ file, ctx, x, y, w, h });
}

function completePageLoading(imgPage, glyphs) {
	for (let i = 0; i < glyphs.length; i++) {
		const glyph = glyphs[i];
		const m = Math.max(glyph.w, glyph.h);
		const x = glyph.x - Math.round(Math.max(0, m - glyph.w) / 2 + m * relMarginSize);
		const y = glyph.y - Math.round(Math.max(0, m - glyph.h) / 2 + m * relMarginSize);
		glyph.xTarget = marginSize + Math.round(Math.max(0, m - glyph.w) / 2 * innerSize / m);
		glyph.yTarget = marginSize + Math.round(Math.max(0, m - glyph.h) / 2 * innerSize / m);
		glyph.wTarget = Math.round(glyph.w * innerSize / m);
		glyph.hTarget = Math.round(glyph.h * innerSize / m);
		glyph.ctx.drawImage(imgPage, x, y, Math.round(m * relWindowSize), Math.round(m * relWindowSize), 
			0, 0, windowSize, windowSize);
		const imgGlyph = new Image();
		imgGlyph.addEventListener('load', function() { completeGlyphLoading(imgGlyph, glyph); }, false);
		imgGlyph.src = glyph.file;
	}
}

function completeGlyphLoading(img, glyph) {
	const canvasTmp = document.createElement('canvas');
	canvasTmp.width = windowSize;
	canvasTmp.height = windowSize;
	const ctxTmp = canvasTmp.getContext('2d');
	ctxTmp.fillStyle = "#09f";
	ctxTmp.fillRect(0, 0, windowSize, windowSize);
	ctxTmp.globalCompositeOperation = "destination-in";
	ctxTmp.drawImage(img, 0, 0, glyph.w, glyph.h, 
		glyph.xTarget, glyph.yTarget, glyph.wTarget, glyph.hTarget);
	glyph.ctx.drawImage(canvasTmp, 0, 0, windowSize, windowSize, 0, 0, windowSize, windowSize);
}

function loadPages() {
	for (const [page, record] of Object.entries(pages))
		record.img.src = page;
}

function getImageContexts() {
	const canvasses = document.getElementsByTagName('canvas');
	for (let i = 0; i < canvasses.length; i++)
		getImageContext(canvasses[i]);
	loadPages();
}

document.addEventListener('DOMContentLoaded', function() {
	getImageContexts();
});

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
