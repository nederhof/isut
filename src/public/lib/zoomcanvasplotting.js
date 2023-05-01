/*
 * Canvas for plotting in 2D.
 * The points are between -1 and 1 in each dimension.
 * These are conceptually mapped to values between 0 and 2000.
 */

class ZoomCanvasPlot2D extends ZoomCanvas {
	points2D;
	rectangles;
	info;
	constructor(container) {
		super(container);
		this.scale = 0;
		this.center = new Point(0.5, 0.5);
		this.points2D = [];
		this.rectangles = [];
		this.addInfo();
	}

	addInfo() {
		this.info = document.createElement('div');
		this.info.className = 'zoom_canvas_glyph_info';
		this.info.classList.add('zoom_canvas_hidden');
		this.display.append(this.info);
		this.fillInfo = function (glyph, div) { };
		this.fillInfoMemo = function (glyph, div) { };
		this.selectInfo = function (glyph) { };
		this.infoGlyph = null;
		this.infoGlyphs = [];
	}

	isLoaded() {
		return this.canvas;
	}
	
	natWidth() {
		return 2000;
	}

	natHeight() {
		return 2000;
	}

	adjustCanvasSize() {
		if (this.canvas.width != this.canvas.clientWidth ||
				this.canvas.height != this.canvas.clientHeight) {
			this.canvas.width = this.canvas.clientWidth;
			this.canvas.height = this.canvas.clientHeight;
			this.adjustZoom();
		}
	}

	redraw() {
		this.adjustCanvasSize();
		const ctx = this.graphics();
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		for (var i = 0; i < this.points2D.length; i++) {
			const glyph = this.points2D[i];
			this.drawPoint(ctx, glyph);
		}
		for (var i = 0; i < this.rectangles.length; i++) {
			const rectangle = this.rectangles[i];
			this.drawRectangle(ctx, rectangle);
		}
		for (var i = 0; i < this.infoGlyphs.length; i++) {
			const info = this.infoGlyphs[i];
			this.drawInfo(ctx, info);
		}
	}

	adjustZoom() {
		if (this.scale * this.natWidth() < this.offsetWidth() &&
				this.scale * this.natHeight() < this.offsetHeight()) {
			this.scale = Math.min(
						1.0 * this.offsetWidth() / this.natWidth(),
						1.0 * this.offsetHeight() / this.natHeight());
		} else if (this.scale > this.offsetWidth() / 20 ||
				this.scale > this.offsetHeight() / 20) {
			this.scale = Math.min(this.offsetWidth() / 20, this.offsetHeight() / 20);
		}
		this.adjustPos();
	}

	drawPoint(ctx, glyph) {
		const point = glyph.point;
		const radius = glyph.radius;
		const color = glyph.glyph.color;
		const screenP = this.pointToScreen(point);
		ctx.beginPath();
		ctx.fillStyle = color;
		ctx.arc(screenP.x, screenP.y, radius, 0, 2 * Math.PI, false);
		ctx.fill();
	}

	drawRectangle(ctx, rect) {
		const r = rect.rectangle;
		const color = rect.glyph.color;
		const scaledRect = new Rectangle((r.x + 1) * 1000, (r.y + 1) * 1000, r.w * 1000, r.h * 1000);
		const screenRect = scaledRect.toDisplay(this.visibleRect(), this.scale);
		ctx.beginPath();
		ctx.fillStyle = color;
		ctx.rect(screenRect.x, screenRect.y, screenRect.w, screenRect.h);
		ctx.fill();
	}

	pointToScreen(point) {
		return point.add(new Point(1,1)).mult(1000).toDisplay(this.visibleRect(), this.scale);
	}

	observePoint(p) {
		super.observePoint(p);
		const rect = this.visibleRect();
		var near = null;
		for (let i = 0; i < this.points2D.length; i++) {
			const glyph = this.points2D[i];
			const point = glyph.point.add(new Point(1,1)).mult(1000).
				toDisplay(this.visibleRect(), this.scale);
			const dist = point.distance(p);
			if (dist < 10 && (!near || dist < near.dist))
				near = { point, dist, glyph };
		}
		for (let i = 0; i < this.rectangles.length; i++) {
			const glyph = this.rectangles[i];
			var pointLow = new Point((glyph.rectangle.x + 1) * 1000, 0).
				toDisplay(this.visibleRect(), this.scale);
			var pointHigh = new Point((glyph.rectangle.x + glyph.rectangle.w + 1) * 1000, 0).
				toDisplay(this.visibleRect(), this.scale);
			pointHigh.y = p.y;
			if (pointLow.x < p.x && p.x <= pointHigh.x)
				near = { point: pointHigh, glyph };
		}
		if (near)
			this.showInfo(near.glyph, near.point);
		else
			this.hideInfo();
	}

	registerPoint(p) {
		super.registerPoint(p);
		if (this.dragged)
			return;
		if (this.infoGlyph)
			this.selectInfo(this.infoGlyph.glyph);
	}

	clearInfoGlyphs() {
		for (const info of this.infoGlyphs)
			info.div.remove();
		this.infoGlyphs = [];
		this.redraw();
	}

	processKey(k) {
		if (k == ' ') {
			if (!this.infoGlyph) {
				this.clearInfoGlyphs();
			} else if (this.infoGlyphs.map(info => info.glyph).includes(this.infoGlyph)) {
				this.infoGlyphs.forEach(info => {if (info.glyph == this.infoGlyph) info.div.remove()});
				this.infoGlyphs = this.infoGlyphs.filter(info => info.glyph != this.infoGlyph);
			} else {
				const x = this.infoGlyph.point.x;
				const y = this.infoGlyph.point.y;
				const section = this.sectionOf(x, y);
				const nSameSection = this.nSections(section);
				const glyph = this.infoGlyph;
				const div = document.createElement('div');
				const info = { glyph, div, section };
				div.className = 'zoom_canvas_glyph_info';
				if (section == 'topleft' || section == 'bottomleft')
					div.style.left = '10px';
				else
					div.style.right = '10px';
				if (section == 'topleft' || section == 'topright')
					div.style.top = '' + (this.bottomMost(section) + 10) + 'px';
				else
					div.style.bottom = '' + (this.topMost(section) + 10) + 'px';
				this.infoGlyphs.push(info);
				this.display.append(div);
				this.fillInfo(glyph.glyph, info.div);
			}
			this.redraw();
		}
	}

	sectionOf(x, y) {
		if (x < 0) {
			if (y < 0) {
				return 'topleft';
			} else {
				return 'bottomleft';
			}
		} else {
			if (y < 0) {
				return 'topright';
			} else {
				return 'bottomright';
			}
		}
	}

	nSections(section) {
		return this.infoGlyphs.filter(g => g.section == section).length;
	}

	bottomMost(section) {
		const sameSections = this.infoGlyphs.filter(g => g.section == section);
		return Math.max(0,
			getMax(sameSections.map(g => g.div.offsetTop + g.div.offsetHeight)));
	}

	topMost(section) {
		const sameSections = this.infoGlyphs.filter(g => g.section == section);
		return Math.max(0, 
			getMax(sameSections.map(g => this.display.offsetHeight - g.div.offsetTop)));
	}

	showInfo(glyph, p) {
		if (this.infoGlyph == glyph)
			return;
		this.infoGlyph = glyph;
		removeChildren(this.info);
		this.fillInfoMemo(glyph.glyph, this.info);
		const margin = 30;
		const w = Math.max(this.info.offsetWidth, 140);
		const h = Math.max(this.info.offsetHeight, 140);
		if (p.x + w + 2 * margin <= this.canvas.width)
			this.info.style.left = (p.x + margin) + 'px';
		else
			this.info.style.left = (p.x - w - margin) + 'px';
		if (p.y + h + margin <= this.canvas.height)
			this.info.style.top = p.y + 'px';
		else
			this.info.style.top = (p.y - h) + 'px';
		this.info.classList.remove('zoom_canvas_hidden');
	}

	hideInfo() {
		this.info.classList.add('zoom_canvas_hidden');
		this.infoGlyph = null;
		this.fillInfoMemo(null, null);
	}

	drawInfo(ctx, info) {
		const section = info.section;
		const div = info.div;
		const color = info.glyph.glyph.color;
		const x = div.offsetLeft +
				(section == 'topright' || section == 'bottomright' ? 0 :
					Math.round(div.offsetWidth));
		const y = div.offsetTop + Math.round(div.offsetHeight / 2);
		const screenP = this.pointToScreen(info.glyph.point);
		if ('rectangle' in info.glyph) {
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 3;
		} else {
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;
		}
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(screenP.x, screenP.y);
		ctx.stroke();
	}
}

/*
 * Canvas for plotting in 3D.
 * The points are between -1 and 1 in each dimension.
 * These are mapped to 2D points.
 */

class ZoomCanvasPlot3D extends ZoomCanvasPlot2D {
	points3D;
	constructor(container) {
		super(container);
		this.scale = 0;
		this.polar = 0;
		this.azimuth = 0;
		this.points3D = [];
	}

	move(p) {
		const diff = new Point(
			p.x / this.scale / this.natWidth(),
			p.y / this.scale / this.natHeight());
		this.polar += 2 * diff.x;
		this.azimuth -= 2 * diff.y;
		this.azimuth = Math.max(this.azimuth, -Math.PI / 4);
		this.azimuth = Math.min(this.azimuth, Math.PI / 4);
		this.derive2D();
		this.redraw();
	}

	derive2D() {
		this.points2D = [];
		this.cameraY = 2.0;
		for (let i = 0; i < this.points3D.length; i++) {
			const p = this.points3D[i];
			const glyph = p.glyph;
			const rotated0 = p.point;
			const rotated1 = Matrix3D.rotateZ(this.polar).map(rotated0);
			const rotated2 = Matrix3D.rotateX(this.azimuth).map(rotated1);
			const distance = this.cameraY - rotated2.y;
			const radius = this.cameraY / distance * p.radius;
			const point2D = new Point(rotated2.x, rotated2.z);
			this.points2D.push({ point: point2D, distance, radius, glyph });
			this.infoGlyphs.forEach(info => { 
				if (info.glyph.glyph == glyph)
					info.glyph.point = point2D;
			});
		}
		this.points2D.sort((a,b) => b.distance - a.distance);
	}

	visibleRect() {
		const x = Math.round(0.5 * this.natWidth()
				- this.canvas.width / 2.0 / this.scale);
		const y = Math.round(0.5 * this.natHeight()
				- this.canvas.height / 2.0 / this.scale);
		const w = Math.round(this.canvas.width / this.scale);
		const h = Math.round(this.canvas.height / this.scale);
		if (w < 1 || h < 1)
			return new Rectangle(0, 0, 0, 0);
		else
			return new Rectangle(x, y, w, h);
	}
}
