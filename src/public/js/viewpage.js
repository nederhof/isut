/* Set up */

var pageCanvas = null;

window.addEventListener('DOMContentLoaded',
	function (event) {
		initializePage();
	});

window.addEventListener('resize',
	function (event) {
		if (pageCanvas)
			pageCanvas.redraw();
	});

var redrawTimeout = null;

function prepareForRedraw() {
	if (redrawTimeout)
		clearTimeout(redrawTimeout);
	redrawTimeout = setTimeout(() => pageCanvas.refreshAnnotation(), 500);
}

function initializePage() {
	const pageRect = computeRects();
	const tree = new Quadtree(pageRect, 5, 5);
	computeColors(tree);
	loadGlyphs();
	makeAnnotationSelection();
	makeImageSelection();
	const container = $('page-canvas');
	pageCanvas = new ZoomCanvasLines(container, page.lines);
	pageCanvas.infoWrap = (info) => {
		const span = document.createElement('span');
		span.innerHTML = info;
		span.className = 'hierojax';
		span.setAttribute('data-fontsize', 30);
		span.setAttribute('data-dir', 'hrl');
		hierojax.processFragment(span);
		return span;
	};
	pageCanvas.setFocus(lineIndex, glyphIndex);
	const dir = nestedTextDir([textIndex, page.index]);
	pageCanvas.load(dir + 'full.png');
	for (var i = 0; i < page.images.length; i++)
		pageCanvas.loadSecondary(dir + page.images[i] + '.png');
}

function computeRects() {
	for (let i = 0; i < page.lines.length; i++) {
		const line = page.lines[i];
		for (let j = 0; j < line.glyphs.length; j++) {
			const glyph = line.glyphs[j];
			glyph.rect = new Rectangle(glyph.position.x, glyph.position.y, 
				glyph.position.w, glyph.position.h);
		}
		const lineRects = line.glyphs.map(g => g.rect);
		line.rect = Rectangle.boundingRects(lineRects);
	}
	const pageRects = page.lines.map(l => l.rect);
	return Rectangle.boundingRects(pageRects);
}

function computeColors(tree) {
	const colors = ['blue', 'green', 'red', 'fuchsia', 'aqua', 'yellow', 'lime', 'purple',
			'teal', 'maroon', 'navy', 'olive'];
	var prevColors = ['none', 'none'];
	for (let i = 0; i < page.lines.length; i++) {
		const line = page.lines[i];
		for (let j = 0; j < line.glyphs.length; j++) {
			const glyph = line.glyphs[j];
			const neighColors = Array.from(tree.findRect(glyph.rect));
			const otherColors = colors.filter(c => neighColors.indexOf(c) < 0 && prevColors.indexOf(c) < 0)
			const prevColor = otherColors.length > 0 ? otherColors[0] : 'blue';
			glyph.color = prevColor;
			tree.insert(glyph.rect, prevColor);
			prevColors.push(prevColor);
			prevColors.shift();
		}
	}
}

function loadGlyphs() {
	for (let i = 0; i < page.lines.length; i++) {
		const line = page.lines[i];
		for (let j = 0; j < line.glyphs.length; j++) {
			const glyph = line.glyphs[j];
			const src = nestedTextFile([textIndex, page.index, line.index, glyph.index]) + '.png';
			const image = new Image();
			image.addEventListener('load', function() { completeLoading(glyph); }, false);
			image.src = src;
			glyph.image = image;
			glyph.text = nameToText(glyph.name);
			glyph.line = i;
		}
	}
}

function completeLoading(glyph) {
	glyph.canvas = document.createElement('canvas');
	glyph.canvas.width = glyph.image.width;
	glyph.canvas.height = glyph.image.height;
	var ctx = glyph.canvas.getContext("2d");
	ctx.drawImage(glyph.image, 0, 0);
	var data = ctx.getImageData(0, 0, glyph.canvas.width, glyph.canvas.height);
	var pixels = data.data;
	var vec = rgb(glyph.color);
	for (let i = 0; i < pixels.length; i += 4) {
		pixels[i] = Math.round(255 * vec[0] / 100);
		pixels[i+1] = Math.round(255 * vec[1] / 100);
		pixels[i+2] = Math.round(255 * vec[2] / 100);
	}
	ctx.putImageData(data, 0, 0);
	prepareForRedraw();
}

function makeAnnotationSelection() {
	const selection = $('annotation-mode');
	selection.onchange = function (e) {
		const m = e.target.value;
		pageCanvas.setAnnotationMode(m);
	};
}

function makeImageSelection() {
	const container = $('display-fields');
	const selection = $('display-mode');
	var sel = imageInput(page.type, true);
	for (var i = 0; i < page.images.length; i++)
		sel += imageInput(page.images[i], false);
	selection.innerHTML = sel;
	selection.onchange = function (e) {
		const t = e.target.value;
		pageCanvas.setImageNum(page.images.indexOf(t));
	};
	if (page.images.length == 0)
		container.classList.add('hidden');
	else
		container.classList.remove('hidden');
}

function imageInput(type, def) {
	return '<input type="radio" name="display" ' +
		'id="display-' + type + '" ' +
		'value="' + type + '"' + (def ? ' checked>' : '>') +
		'<label for="display-' + type + '">' + type + '</label>';
}

const unihiero = new UniHiero();

function nameToText(name) {
	return unihiero.nameToText(name);
}
