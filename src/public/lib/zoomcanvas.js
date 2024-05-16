/*
 * Mouse, touchpad and keyboard control of images.
 *
 * An image is assumed to have:
 * image.scale
 * image.center
 * image.dragged
 * image.dragStart
 * image.touchStart
 * image.isLoaded()
 * image.offsetLeft()
 * image.offsetTop()
 * image.offsetWidth()
 * image.offsetHeight()
 * image.natWidth()
 * image.natHeight()
 * image.adjustZoom()
 * image.redraw()
 * image.initiatePoint(p)
 * image.registerPoint(p)
 * image.unobservePoint()
 * image.observePoint(p)
 * image.processKey(k)
 *
 * assumes:
 * geometry.js
 */

class ImageControl {
	// change of scaling with keys
	static zoomFactorKeys = 1.2;
	// change of scaling with mouse
	static zoomFactorMouse = 1.05;
	// additional factor of scaling for multitouch zoom
	static touchZoomFactor = 0.05;
	// portion of window moved by buttons
	static navigatePortion = 0.2;

	static mousewheelHandler(image) {
		return function (event) {
			event.preventDefault();
			const delta = Math.max(-1, Math.min(1, ImageControl.eventWheel(event)));
			const step = delta > 0 ? 1 : -1;
			ImageControl.zoomMouse(image,
				ImageControl.eventPoint(event).x,
				ImageControl.eventPoint(event).y, step);
		};
	}

	static eventWheel(event) {
		return event.wheelDelta || -event.detail;
	}

	static mousedownHandler(image) {
		return function (event) {
			event.preventDefault();
			if (!image.isLoaded())
				return;
			image.initiatePoint(ImageControl.eventPoint(event));
			image.dragged = false;
		};
	}

	static mouseupHandler(image) {
		return function (event) {
			event.preventDefault();
			if (!image.isLoaded())
				return;
			image.registerPoint(ImageControl.eventPoint(event));
			image.dragged = false;
		};
	}

	static mouseoutHandler(image) {
		return function (event) {
			event.preventDefault();
			if (!image.isLoaded())
				return;
			image.unobservePoint();
			image.dragged = false;
		};
	}

	static mousemoveHandler(image) {
		return function (event) {
			event.preventDefault();
			if (!image.isLoaded())
				return;
			if (image.dragStart) {
				const delta = 5;
				const p = ImageControl.eventPoint(event);
				if (p.distance(image.dragStart) > delta) {
					const diff = image.dragStart.subtract(p);
					image.move(diff);
					image.dragStart = p;
					image.dragged = true;
				}
			} else {
				image.observePoint(ImageControl.eventPoint(event));
			}
		};
	}

	static eventPoint(event) {
		return new Point(event.offsetX || event.layerX, event.offsetY || event.layerY);
	}

	static touchstartHandler(image) {
		return function (event) {
			event.preventDefault();
			if (!image.isLoaded())
				return;
			image.touchStart = ImageControl.touchValue(event, image);
			image.dragged = false;
		};
	}

	static touchendHandler(image) {
		return function (event) {
			event.preventDefault();
			if (image.touchStart.length == 1) {
				image.registerPoint(image.touchStart[0]);
			}
			image.touchStart = [];
			image.dragged = false;
		};
	}

	static touchmoveHandler(image) {
		return function (event) {
			event.preventDefault();
			const delta = 10;
			switch (event.touches.length) {
				case 1:
					if (image.touchStart.length != 1)
						return;
					const next1 = ImageControl.touchValue(event, image);
					const d = next1[0].subtract(image.touchStart[0]);
					if (d.distance(new Point(0, 0)) > delta) {
						const moveFactor = -1;
						image.move(new Point(moveFactor * d.x, moveFactor * d.y));
						image.touchStart = next1;
						image.dragged = true;
					}
					break;
				case 2:
					if (image.touchStart.length != 2)
						return;
					const next2 = ImageControl.touchValue(event, image);
					const dist0 = image.touchStart[0].distance(image.touchStart[1]);
					const dist1 = next2[0].distance(next2[1]);
					const zoom = dist1 - dist0;
					const move0 = next2[0].subtract(image.touchStart[0]);
					const move1 = next2[1].subtract(image.touchStart[1]);
					const angle = Point.absAngleDist(move0.angle(), move1.angle());
					const av = move0.average(move1);
					const moveDist = av.distance(new Point(0, 0));
					if (zoom > delta || zoom < -delta) {
						ImageControl.zoomMouse(image,
							next2[0].x - image.offsetLeft(),
							next2[0].y - image.offsetTop(),
							zoom * ImageControl.touchZoomFactor);
						image.touchStart = next2;
						dragged = true;
					}
					break;
				default:
					image.touchStart = [];
					image.dragged = false;
					break;
			}
		};
	}

	static touchValue(event, image) {
		const rect = image.canvas.getBoundingClientRect();
		var val = [];
		for (var i = 0; i < event.touches.length; i++)
			val.push(new Point(event.touches[i].pageX - rect.left,
						event.touches[i].pageY - rect.top));
		return val;
	}

	static keyHandler(image) {
		return function (event) {
			event.preventDefault();
			switch (event.key) {
				case 'ArrowLeft': ImageControl.moveLeft(image); return true;
				case 'ArrowUp': ImageControl.moveUp(image); return true;
				case 'ArrowRight': ImageControl.moveRight(image); return true;
				case 'ArrowDown': ImageControl.moveDown(image); return true;
				case '<': ImageControl.zoomOutKey(image); return true;
				case '>': ImageControl.zoomInKey(image); return true;
				case 'Enter': image.processKey('\n'); return true;
				case 'Delete': image.processKey('del'); return true;
				case '-': image.processKey('-'); return true;
				case '+': image.processKey('+'); return true;
				case ' ': image.processKey(' '); return true;
				case 'a': image.processKey('a'); return true;
				case 'b': image.processKey('b'); return true;
				case 'c': image.processKey('c'); return true;
				case 'd': image.processKey('d'); return true;
				case 'e': image.processKey('e'); return true;
				case 'f': image.processKey('f'); return true;
				case 'i': image.processKey('i'); return true;
				case 'j': image.processKey('j'); return true;
				case 'm': image.processKey('m'); return true;
				case 'n': image.processKey('n'); return true;
				case 'p': image.processKey('p'); return true;
				case 's': image.processKey('s'); return true;
				case 't': image.processKey('t'); return true;
				case 'u': image.processKey('u'); return true;
				case 'v': image.processKey('v'); return true;
			}
			switch (event.keyCode) {
				case 37: ImageControl.moveLeft(image); return true; // left
				case 38: ImageControl.moveUp(image); return true; // up
				case 39: ImageControl.moveRight(image); return true; // right
				case 40: ImageControl.moveDown(image); return true; // down
				case 188: ImageControl.zoomOutKey(image); return true; // <
				case 190: ImageControl.zoomInKey(image); return true; // >
				case 13: image.processKey('\n'); return true;
				case 46: image.processKey('del'); return true;
				case 189: image.processKey('-'); return true; 
				case 187: image.processKey('+'); return true;
				case 32: image.processKey(' '); return true;
				case 65: image.processKey('a'); return true;
				case 66: image.processKey('b'); return true;
				case 67: image.processKey('c'); return true;
				case 68: image.processKey('d'); return true;
				case 69: image.processKey('e'); return true;
				case 70: image.processKey('f'); return true;
				case 74: image.processKey('j'); return true;
				case 73: image.processKey('i'); return true;
				case 77: image.processKey('m'); return true;
				case 78: image.processKey('n'); return true;
				case 80: image.processKey('p'); return true;
				case 83: image.processKey('s'); return true;
				case 84: image.processKey('t'); return true;
				case 85: image.processKey('u'); return true;
				case 86: image.processKey('v'); return true;
			}
			return false;
		};
	}

	static zoomInKey(image) {
		if (image.isLoaded()) {
			image.scale *= this.zoomFactorKeys;
			image.adjustZoom();
			image.redraw();
		}
	}

	static zoomOutKey(image) {
		if (image.isLoaded()) {
			image.scale /= this.zoomFactorKeys;
			image.adjustZoom();
			image.redraw();
		}
	}

	static zoomMouse(image, x, y, exp) {
		if (image.isLoaded()) {
			const xDiff = (image.offsetWidth() / 2.0 - x) / image.scale;
			const yDiff = (image.offsetHeight() / 2.0 - y) / image.scale;
			const zoom = Math.pow(this.zoomFactorMouse, exp);
			image.scale *= zoom;
			const newCenterX = image.center.x + (1/zoom-1) * xDiff / image.natWidth();
			const newCenterY = image.center.y + (1/zoom-1) * yDiff / image.natHeight();
			image.center = new Point(newCenterX, newCenterY);
			image.adjustZoom();
			image.redraw();
		}
	}

	static moveUp(image) {
		if (image.isLoaded()) {
			image.move(new Point(0, -image.offsetHeight() * this.navigatePortion));
		}
	}

	static moveDown(image) {
		if (image.isLoaded()) {
			image.move(new Point(0, image.offsetHeight() * this.navigatePortion));
		}
	}

	static moveLeft(image) {
		if (image.isLoaded()) {
			image.move(new Point(-image.offsetWidth() * this.navigatePortion, 0));
		}
	}

	static moveRight(image) {
		if (image.isLoaded()) {
			image.move(new Point(image.offsetWidth() * this.navigatePortion, 0));
		}
	}
}

/*
 * Canvas that can be navigated.
 *
 * API:
 *
 * const canvas = new ZoomCanvas(container)
 *	-> creates instance as new child of container
 * canvas.load(src)
 *	-> load image from URL
 * canvas.loadSecondary(src)
 *	-> load secondary image from URL
 * canvas.redraw()
 *	-> redraw image
 * canvas.loadHandlers.push(function)
 *	-> function called once image is loaded
 *	[function has no arguments]
 *
 * assumes:
 * geometry.js
 * imagecontrol.js
 */

class ZoomCanvas {
	scale;
	center;
	dragged;
	dragStart;
	touchStart;
	loadHandlers;
	constructor(container) {
		this.container = container;
		this.container.classList.add('zoom_canvas_container');
		this.container.classList.add('zoom_canvas_row');
		this.display = document.createElement('div'); 
		this.display.classList.add('zoom_canvas_display');
		this.container.append(this.display);
		this.canvas = document.createElement('canvas');
		this.canvas.className = 'zoom_canvas';
		this.canvas.tabIndex = '1';
		this.display.append(this.canvas);

		this.image = null;
		this.images = [];
		this.imageNum = -1;
		this.loaded = false;
		this.scale = null;
		this.center = null;
		this.dragged = false;
		this.dragStart = null;
		this.touchStart = null;
		this.loadHandlers = [];

		this.canvas.addEventListener('mousewheel',
			ImageControl.mousewheelHandler(this));
		this.canvas.addEventListener('DOMMouseScroll',
			ImageControl.mousewheelHandler(this));
		this.canvas.addEventListener('mousedown',
			ImageControl.mousedownHandler(this));
		this.canvas.addEventListener('mouseup',
			ImageControl.mouseupHandler(this));
		this.canvas.addEventListener('mouseout',
			ImageControl.mouseoutHandler(this));
		this.canvas.addEventListener('mousemove',
			ImageControl.mousemoveHandler(this));
		this.canvas.addEventListener('touchstart',
			ImageControl.touchstartHandler(this));
		this.canvas.addEventListener('touchend',
			ImageControl.touchendHandler(this));
		this.canvas.addEventListener('touchmove',
			ImageControl.touchmoveHandler(this));
		this.canvas.addEventListener('keydown',
			ImageControl.keyHandler(this), false);
	}

	move(p) {
		const diff = new Point(
				p.x / this.scale / this.natWidth(),
				p.y / this.scale / this.natHeight());
		this.center = this.center.add(diff);
		this.adjustZoom();
		this.redraw();
	}

	addImageButton(buttons) {
		this.imageButton = document.createElement('button');
		this.imageButton.className = 'zoom_canvas_button';
		this.imageButton.innerHTML = 'A';
		this.imageButton.title = 'next image [i]';
		const thisCanvas = this;
		this.imageButton.addEventListener('click', function (event) { thisCanvas.nextImage(); }, false);
		this.imageButton.setAttribute('tabindex', '-1');
		buttons.append(this.imageButton);
	}

	addButton(buttons, name, ch, title, fun) {
		this[name] = document.createElement('button');
		this[name].className = 'zoom_canvas_button';
		this[name].innerHTML = ch;
		this[name].title = title;
		const thisCanvas = this;
		this[name].addEventListener('click', function (event) { thisCanvas[fun](); }, false);
		this[name].setAttribute('tabindex', '-1');
		buttons.append(this[name]);
	}

	addSpace(buttons) {
		const space = document.createElement('div');
		space.className = 'zoom_canvas_space';
		buttons.append(space);
	}

	handleLoad() {
		for (const h of this.loadHandlers)
			h();
	}

	graphics() {
		return this.canvas.getContext('2d');
	}

	isLoaded() {
		return this.canvas && this.loaded;
	}

	offsetLeft() {
		return this.canvas.getBoundingClientRect().left;
	}

	offsetTop() {
		return this.canvas.getBoundingClientRect().top;
	}

	offsetWidth() {
		return this.canvas.offsetWidth;
	}

	offsetHeight() {
		return this.canvas.offsetHeight;
	}

	natWidth() {
		return this.image.naturalWidth;
	}

	natHeight() {
		return this.image.naturalHeight;
	}

	rectWithinCanvas(rect) {
		return rect.x >= 0 && rect.x + rect.w < this.canvas.width && 
			rect.y >= 0 && rect.y + rect.h < this.canvas.height;
	}

	pointInImage(p) {
		return p.x >= 0 && p.x < this.natWidth() &&
				p.y >= 0 && p.y < this.natHeight();
	}

	load(src) {
		if (!src)
			return;
		this.loaded = false;
		this.image = new Image();
		const thisCanvas = this;
		this.image.addEventListener('load', function() { thisCanvas.completeLoading(); }, false);
		this.scale = 0.0;
		this.center = new Point(0.5, 0.5);
		this.image.src = src;
	}

	loadSecondary(src) {
		const image = new Image();
		const thisCanvas = this;
		const num = thisCanvas.images.length;
		thisCanvas.images.push(null);
		image.addEventListener('load', function() { 
			thisCanvas.images[num] = image;
			thisCanvas.redraw();
		}, false);
		image.src = src;
	}

	renderPrimary() {
		return this.imageNum < 0 || this.imageNum >= this.images.length ||
			this.images[this.imageNum] == null;
	}

	nextImage() {
		this.imageNum++;
		if (this.imageNum >= this.images.length)
			this.imageNum = -1;
		this.redraw();
		this.imageButton.innerHTML = ALPHABET[this.imageNum+1 % ALPHABET.length];
	}

	setImageNum(num) {
		this.imageNum = num;
		this.redraw();
	}

	completeLoading() {
		this.loaded = true;
		this.canvas.width = 1;
		this.canvas.height = 1;
		this.redraw();
		this.handleLoad();
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
		if (this.isLoaded()) {
			this.adjustCanvasSize();
			const ctx = this.graphics();
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
			const rect = this.visibleRect();
			var sx = rect.x;
			var sy = rect.y;
			var sw = rect.w;
			var sh = rect.h;
			var x = 0;
			var y = 0;
			var w = this.offsetWidth();
			var h = this.offsetHeight();
			if (sx < 0 || sw > this.natWidth()) {
				x = Math.round(-sx * this.scale);
				w = this.offsetWidth() - 2 * x;
				sx = Math.max(0, sx);
				sw = Math.min(this.natWidth(), sw);
			} else if (sx + sw > this.natWidth()) {
				sw = this.natWidth() - sx;
			}
			if (sy < 0 || sh > this.natHeight()) {
				y = Math.round(-sy * this.scale);
				h = this.offsetHeight() - 2 * y;
				sy = Math.max(0, sy);
				sh = Math.min(this.natHeight(), sh);
			} else if (sy + sh > this.natHeight()) {
				sh = this.natHeight() - sy;
			}
			if (w > 0 && h > 0)
				this.drawImage(sx, sy, sw, sh, x, y, w, h);
		} else if (this.canvas) {
			const ctx = this.graphics();
			ctx.fillStyle = 'white';
			ctx.fillText('Loading images',
					Math.max(0, this.canvas.width / 2 - 50),
					Math.max(0, this.canvas.height / 2 - 20));
		}
	}

	drawImage(sx, sy, sw, sh, x, y, w, h) {
		const ctx = this.graphics();
		if (this.renderPrimary()) {
			ctx.drawImage(this.image, sx, sy, sw, sh, x, y, w, h);
		} else {
			const other = this.images[this.imageNum];
			const tx = Math.round(1.0 * sx * other.naturalWidth / this.image.naturalWidth);
			const ty = Math.round(1.0 * sy * other.naturalHeight / this.image.naturalHeight);
			const tw = Math.round(1.0 * sw * other.naturalWidth / this.image.naturalWidth);
			const th = Math.round(1.0 * sh * other.naturalHeight / this.image.naturalHeight);
			ctx.drawImage(other, tx, ty, tw, th, x, y, w, h);
		}
	}

	adjustZoom() {
		if (this.isLoaded()) {
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
	}

	adjustPos() {
		const w = this.offsetWidth() / this.scale / this.natWidth();
		const h = this.offsetHeight() / this.scale / this.natHeight();
		var newCenterX = 0.5;
		var newCenterY = 0.5;
		if (w <= 1) {
			newCenterX = Math.max(this.center.x, w / 2);
			newCenterX = Math.min(newCenterX, 1 - w / 2);
		}
		if (h <= 1) {
			newCenterY = Math.max(this.center.y, h / 2);
			newCenterY = Math.min(newCenterY, 1 - h / 2);
		}
		this.center = new Point(newCenterX, newCenterY);
	}

	setPos(x, y) {
		const centerX = x / this.natWidth();
		const centerY = y / this.natHeight();
		this.center = new Point(centerX, centerY);
		this.adjustPos();
	}

	visibleRect() {
		const x = Math.round(this.center.x * this.natWidth()
				- this.canvas.width / 2.0 / this.scale);
		const y = Math.round(this.center.y * this.natHeight()
				- this.canvas.height / 2.0 / this.scale);
		const w = Math.round(this.canvas.width / this.scale);
		const h = Math.round(this.canvas.height / this.scale);
		if (w < 1 || h < 1)
			return new Rectangle(0, 0, 0, 0);
		else
			return new Rectangle(x, y, w, h);
	}

	setCursor(type) {
		this.canvas.style.cursor = type;
	}

	initiatePoint(p) {
		this.dragStart = p;
		this.canvas.focus();
	}

	registerPoint(p) {
		this.dragStart = null;
	}

	unobservePoint() {
		this.dragStart = null;
	}

	observePoint(p) {
	}

	processKey(k) {
	}

	rightCorner(poly) {
		const p0 = poly[0].toDisplay(this.visibleRect(), this.scale);
		var x = p0.x;
		var y = p0.y;
		for (var i = 1; i < poly.length; i++) {
			var p = poly[i].toDisplay(this.visibleRect(), this.scale);
			if (p.x > x) {
				x = p.x;
				y = p.y;
			}
		}
		return new Point(x, y);
	}

	pointToPolyIndex(p, polys) {
		var minDist = 15;
		var minDistIndex = -1;
		for (const poly of polys) {
			if (poly.length == 1) {
				var pImage = poly[0].toDisplay(this.visibleRect(), this.scale);
				var d = p.distance(pImage);
				if (d < minDist) {
					minDist = d;
					minDistIndex = i;
				}
			}
		}
		if (minDistIndex >= 0)
			return minDistIndex;
		var minSize = Number.MAX_VALUE;
		for (const poly of polys) {
			var rect = Rectangle.bounding(poly);
			if (this.isInPoly(p, poly) && rect.size() < minSize) {
				minSize = rect.size();
				minDistIndex = i;
			}
		}
		return minDistIndex;
	}

	isInPoly(p, poly) {
		if (poly.length < 3)
			return false;
		var pFirst = poly[0].toDisplay(this.visibleRect(), this.scale);
		const ctx = this.graphics();
		ctx.beginPath();
		ctx.moveTo(pFirst.x, pFirst.y);
		for (var i = 1; i < poly.length; i++) {
			var pNext = poly[i].toDisplay(this.visibleRect(), this.scale);
			ctx.lineTo(pNext.x, pNext.y);
		}
		ctx.closePath();
		return ctx.isPointInPath(p.x, p.y);
	}

	static drawTextOverWhite(ctx, text, fontSize, p) {
		const margin = 3;
		if (p.x > 0 && p.y > 0) {
			ctx.save();
			ctx.font = '' + fontSize + 'px Arial';
			const width = ctx.measureText(text).width;
			if (p.x + width + 2*margin > ctx.canvas.clientWidth)
				p.x = Math.max(0, ctx.canvas.clientWidth - width - 2*margin);
			if (p.y > ctx.canvas.clientHeight)
				p.y = ctx.canvas.clientHeight;
			ctx.fillStyle = 'white';
			ctx.fillRect(p.x, p.y-fontSize-1*margin, width+2*margin, fontSize+1*margin);
			ctx.beginPath();
			ctx.lineWidth = '1';
			ctx.strokeStyle = 'blue';
			ctx.rect(p.x, p.y-fontSize-1*margin, width+2*margin, fontSize+1*margin);
			ctx.stroke();
			ctx.fillStyle = 'black';
			ctx.fillText(text, p.x+margin, p.y-margin);
			ctx.restore();
		}
	}

	static redColor = 'rgba(255,0,0,0.8)';
	static blueColor = 'rgba(0,0,255,0.8)';

	static setSolidLine(ctx) {
		ZoomCanvas.setLineDash(ctx, []);
	}

	static setThinLineDash(ctx) {
		ZoomCanvas.setLineDash(ctx, [1,0]);
	}

	static setThickLineDash(ctx) {
		ZoomCanvas.setLineDash(ctx, [5,2]);
	}

	static setLineDash(ctx, list) {
		if (ctx.setLineDash) {
			ctx.setLineDash(list);
		} else {
			ctx.mozDash = list;
			ctx.webkitLineDash = list;
		}
	}
}

/* Canvas with polygons.
 *
 * API:
 *
 * as ZoomCanvas and in addition:
 *
 * canvas.polys = polys
 *	-> add polygons (array of arrays of points)
 * canvas.polyLabels = labels
 *	-> add labels to polygons (array of strings)
 * canvas.resetPolys()
 *	-> remove all polygons
 */

class ZoomCanvasPoly extends ZoomCanvas {
	polys;
	polyLabels;
	constructor(container) {
		super(container);
		this.resetPolys();
		this.editPolyIndex = -1;
	}

	resetPolys() {
		this.polys = [];
		this.polyLabels = [];
	}

	redraw() {
		super.redraw();
		if (this.isLoaded()) {
			const ctx = this.graphics();
			for (var i = 0; i < this.polys.length; i++) {
				const poly = this.polys[i];
				const l = this.polyLabels[i];
				if (poly.length > 0) {
					this.drawPoly(ctx, poly, i == this.editPolyIndex);
					const corner = this.rightCorner(poly);
					ZoomCanvas.drawTextOverWhite(ctx, l, 16,
						corner.add(new Point(3,-3)));
				}
			}
		}
	}

	drawPoly(ctx, poly, edited) {
		ctx.save();
		if (edited) {
			ctx.strokeStyle = ZoomCanvas.redColor;
			ctx.fillStyle = ZoomCanvas.redColor;
		} else {
			ctx.strokeStyle = ZoomCanvas.blueColor;
			ctx.fillStyle = ZoomCanvas.blueColor;
		}
		const pFirst = poly[0].toDisplay(this.visibleRect(), this.scale);
		const pLast = poly[poly.length-1].toDisplay(this.visibleRect(), this.scale);
		ZoomCanvas.setSolidLine(ctx);
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(pFirst.x, pFirst.y);
		for (let i = 1; i < poly.length; i++) {
			var p = poly[i].toDisplay(this.visibleRect(), this.scale);
			ctx.lineTo(p.x, p.y);
		}
		ctx.stroke();
		if (poly.length > 2) {
			if (edited)
				ZoomCanvas.setThickLineDash(ctx);
			ctx.beginPath();
			ctx.moveTo(pLast.x, pLast.y);
			ctx.lineTo(pFirst.x, pFirst.y);
			ctx.stroke();
		}
		const circleSize = edited || poly.length == 1 ? 5 : 1;
		ZoomCanvas.setSolidLine(ctx);
		for (let i = 0; i < poly.length-1; i++) {
			ctx.beginPath();
			var p = poly[i].toDisplay(this.visibleRect(), this.scale);
			ctx.arc(p.x, p.y, circleSize, 0, 2 * Math.PI);
			ctx.fill();
		}
		ctx.beginPath();
		ctx.arc(pLast.x, pLast.y, circleSize, 0, 2 * Math.PI);
		ctx.stroke();
		ctx.restore();
	}
}

/*
 * Canvas with polygons for viewing.
 *
 * API:
 *
 * as ZoomCanvasPoly and in addition:
 *
 * canvas.clickHandlers.push(function)
 *	-> function called if clicked in or near polygon
 *	[function has one argument, which is index of polygon]
 * canvas.onHandlers.push(function)
 *	-> function called if moving over polygon
 *	[function has one argument, which is index of polygon]
 */

class ZoomCanvasPolyView extends ZoomCanvasPoly {
	clickHandlers;
	onHandlers;
	constructor(container) {
		super(container);
		this.clickHandlers = [];
		this.onHandlers = [];
	}

	resetPolys() {
		super.resetPolys();
		this.mousePolyIndex = -1;
	}

	handleClick(p) {
		const i = this.pointToPolyIndex(p, this.polys);
		if (i >= 0)
			for (const h of this.clickHandlers)
				h(i);
	}
	
	registerPoint(p) {
		this.handleClick(p);
		super.registerPoint(p);
	}

	observePoint(p) {
		const i = this.pointToPolyIndex(p, this.polys);
		if (this.mousePolyIndex != i) {
			this.mousePolyIndex = i;
			this.redraw();
		}
		for (const h of this.onHandlers)
			h(i);
		this.setCursor(this.mousePolyIndex >= 0 ? 'pointer' : 'default');
	}
}

/*
 * Canvas with polygons for editing.
 *
 * API:
 *
 * as ZoomCanvasPoly and in addition:
 *
 * const canvas = new ZoomCanvasPolyEdit(container, polys)
 *	-> creates instance as new child of container, with polygons
 * canvas.emptyData = function () { return data; }
 *  -> set function that produces data to be put into new polygon
 * canvas.changeHandlers.push(function)
 *	-> function called if polygon is changed
 *	[function has one argument, which is index of polygon, or -1 if the order
 *	of polygons was changed.]
 * canvas.deletionPermitted = function (i) { };
 *  -> function returning whether polygon at index i may be deleted
 */

class ZoomCanvasPolyEdit extends ZoomCanvasPoly {
	changeHandlers;
	deletionPermitted;
	constructor(container, polys) {
		super(container);
		this.addButtons();
		this.changeHandlers = [];
		this.emptyData = function () { return { }; };
		this.deletionPermitted = function (i) { return true; };
		this.draggedPointIndex = -1;
		this.cutting = false;
		this.polys = polys;
		for (var i = 1; i <= polys.length; i++)
			this.polyLabels.push(i);
		this.polyButtons = [];
		this.makePolyList();
		this.setEditFocus(polys.length > 0 ? 0 : -1);
	}

	addButtons() {
		this.buttons = document.createElement('div'); 
		this.buttons.classList.add('zoom_canvas_buttons');
		this.buttons.tabIndex = '-1';
		const thisCanvas = this;
		this.buttons.addEventListener('keydown',
			ImageControl.keyHandler(thisCanvas), false);
		this.container.prepend(this.buttons);
		this.addImageButton(this.buttons);
		this.addButton(this.buttons, 'adder', '&#x25C7;', 'create new polygon', 'addPoly');
		this.addButton(this.buttons, 'backmover', '&#x21E6;', 'move polygon backward', 'movePolyBackward');
		this.addButton(this.buttons, 'foremover', '&#x21E8;', 'move polygon forward', 'movePolyForward');
		this.addButton(this.buttons, 'deleter', '&#x2716;', 'remove all points from polygon', 'deletePoly');
		this.addButton(this.buttons, 'cutter', '&#x2702;', 'remove point that is clicked next', 'toggleCut');
		this.addButton(this.buttons, 'cycler', '&#x267A;', 'move points around', 'cyclePoints');
		this.addSpace(this.buttons);
		this.addPolyButtons();
	}

	addPolyButtons() {
		this.polyList = document.createElement('div');
		this.polyList.classList.add('zoom_canvas_polys');
		this.buttons.append(this.polyList);
	}

	makePolyList() {
		const thisCanvas = this;
		while (this.polyList.firstChild)
			this.polyList.removeChild(this.polyList.firstChild);
		this.polyButtons = [];
		for (var i = 1; i <= this.polys.length; i++) {
			const newFocus = i-1;
			const button = document.createElement('button');
			button.className = 'zoom_canvas_button';
			button.innerHTML = i;
			button.title = 'focus on polygon ' + i;
			button.addEventListener('click', function (event) { 
				if (thisCanvas.editPolyIndex == newFocus)
					thisCanvas.setEditFocus(-1);
				else
					thisCanvas.setEditFocus(newFocus);
			}, false);
			button.setAttribute('tabindex', '-1');
			this.polyList.append(button);
			this.polyButtons.push(button);
		}
	}

	resetPolys() {
		super.resetPolys();
		this.editPolyIndex = -1;
	}

	setEditFocus(i) {
		this.editPolyIndex = i;
		for (var j = 0; j < this.polyButtons.length; j++) {
			if (i == j) 
				this.polyButtons[j].classList.add('zoom_canvas_active');
			else
				this.polyButtons[j].classList.remove('zoom_canvas_active');
		}
		this.redraw();
	}

	handleChange(i) {
		for (const h of this.changeHandlers)
			h(i);
	}

	initiatePoint(p) {
		if (!this.cutting) {
			this.draggedPointIndex = this.closePolyPoint(p);
			if (this.draggedPointIndex < 0)
				this.dragStart = p;
		}
		this.canvas.focus();
	}

	closePolyPoint(p) {
		var minDistIndex = -1;
		if (this.editPolyIndex >= 0) {
			var minDist = 10;
			const poly = this.polys[this.editPolyIndex];
			for (var i = 0; i < poly.length; i++) {
				const point = poly[i];
				var pImage = point.toDisplay(this.visibleRect(), this.scale);
				var d = p.distance(pImage);
				if (d < minDist) {
					minDist = d;
					minDistIndex = i;
				}
			}
		}
		return minDistIndex;
	}
	
	registerPoint(p) {
		if (this.cutting) {
			this.cutFromPoly(p);
		} else {
			if (!this.dragged && this.draggedPointIndex < 0)
				this.addToPoly(p);
			this.draggedPointIndex = -1;
		}
		super.registerPoint(p);
	}

	unobservePoint() {
		this.draggedPointIndex = -1;
		super.unobservePoint();
	}

	observePoint(p) {
		if (this.draggedPointIndex >= 0) {
			const poly = this.polys[this.editPolyIndex];
			const q = p.fromDisplay(this.visibleRect(), this.scale);
			if (this.pointInImage(q)) {
				poly[this.draggedPointIndex] = q;
				this.redraw();
				this.handleChange(this.editPolyIndex);
			}
		}
	}

	cutFromPoly(p) {
		const cutIndex = this.closePolyPoint(p);
		if (cutIndex >= 0) {
			if (this.polys[this.editPolyIndex].length > 2 || this.deletionPermitted(this.editPolyIndex)) {
				this.polys[this.editPolyIndex].splice(cutIndex, 1);
				this.redraw();
				if (this.polys[this.editPolyIndex].length == 2)
					this.handleChange(-1);
				else
					this.handleChange(this.editPolyIndex);
				this.toggleCut();
			}
		}
	}

	addToPoly(p) {
		const q = p.fromDisplay(this.visibleRect(), this.scale);
		if (this.editPolyIndex >= 0 && this.pointInImage(q)) {
			this.polys[this.editPolyIndex].push(q);
			this.redraw();
			if (this.polys[this.editPolyIndex].length == 3)
				this.handleChange(-1);
			else
				this.handleChange(this.editPolyIndex);
		}
	}

	toggleCut() {
		this.cutting = !this.cutting;
		this.setCursor(this.cutting ? 'crosshair' : 'default');
		if (this.cutting) 
			this.cutter.classList.add('zoom_canvas_active');
		else
			this.cutter.classList.remove('zoom_canvas_active');
	}

	deletePoly() {
		if (this.editPolyIndex >= 0 && this.deletionPermitted(this.editPolyIndex)) {
			this.polys.splice(this.editPolyIndex, 1);
			this.polyLabels.pop();
			this.makePolyList();
			this.setEditFocus(-1);
			this.handleChange(-1);
		}
	}

	addPoly() {
		var emptyPoly = [];
		emptyPoly.data = this.emptyData();
		this.polys.push(emptyPoly);
		this.polyLabels.push(this.polys.length);
		this.makePolyList();
		this.setEditFocus(this.polys.length-1);
		this.handleChange(-1);
	}

	movePolyBackward() {
		const i = this.editPolyIndex;
		if (i > 0) {
			const previous = this.polys[i-1];
			const current = this.polys[i];
			this.polys[i-1] = current;
			this.polys[i] = previous;
			this.setEditFocus(i-1);
			this.handleChange(-1);
		}
	}

	movePolyForward() {
		const i = this.editPolyIndex;
		if (0 <= i && i < this.polys.length-1) {
			const current = this.polys[i];
			const next = this.polys[i+1];
			this.polys[i] = next;
			this.polys[i+1] = current;
			this.setEditFocus(i+1);
			this.handleChange(-1);
		}
	}

	cyclePoints() {
		const i = this.editPolyIndex;
		if (i >= 0 && this.polys[i].length > 1) {
			this.polys[i].push(this.polys[i].shift());
			this.redraw();
			this.handleChange(i);
		}
	}
}

/*
 * Canvas with lines and glyphs.
 *
 * API:
 *
 * as ZoomCanvas and in addition:
 *
 * canvas.setAnnotationMode(mode)
 * [mode can be plain/glyphs/lines]
 *
 */

class ZoomCanvasLines extends ZoomCanvas {
	constructor(container, lines) {
		super(container);
		this.lines = lines;
		this.container.classList.remove('zoom_canvas_row');
		this.addAnnotation();
		this.topGlyph = null;
		this.focusRect = null;
		this.mode = 'plain';
		this.infoWrap = function (info) { return document.createTextNode(info); };
	}

	addAnnotation() {
		this.annotationCanvas = document.createElement('canvas');
		this.annotationCanvas.className = 'zoom_canvas_overlay';
		this.display.append(this.annotationCanvas);
		this.glyphTree = null;
		this.infoGlyph = null;
		this.infoLine = -1;
	}

	completeLoading() {
		super.completeLoading();
		this.glyphTree = new Quadtree(new Rectangle(0, 0, this.natWidth(), this.natHeight()), 5, 5);
		for (var i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			for (var j = 0; j < line.glyphs.length; j++) {
				const glyph = line.glyphs[j];
				this.glyphTree.insert(glyph.rect, glyph);
				glyph.info = this.makeGlyphInfo(glyph);
				this.display.append(glyph.info);
			}
		}
		this.refreshAnnotation();
	}

	makeGlyphInfo(glyph) {
		const info = document.createElement('div'); 
		info.className = 'zoom_canvas_glyph_info';
		info.classList.add('zoom_canvas_hidden');
		info.style['border-color'] = glyph.color;
		const label = document.createElement('div');
		label.className = 'zoom_canvas_glyph_info_label';
		label.append(this.infoWrap(glyph.name));
		info.append(label);
		const text = document.createElement('div');
		text.className = 'zoom_canvas_glyph_info_text';
		text.innerHTML = glyph.text;
		info.append(text);
		return info;
	}

	annotationGraphics() {
		return this.annotationCanvas.getContext('2d');
	}

	setAnnotationMode(m) {
		this.mode = m;
		this.refreshAnnotation();
	}

	refreshAnnotation() {
		if (this.mode == 'glyphs') {
			this.removeInfo();
			this.annotationCanvas.classList.remove('zoom_canvas_hidden');
		} else if (this.mode == 'lines') {
			if (this.infoLine >=0)
				this.addInfoLine(this.infoLine);
			this.annotationCanvas.classList.remove('zoom_canvas_hidden');
		} else {
			this.removeInfo();
			this.annotationCanvas.classList.add('zoom_canvas_hidden');
		}
		this.redraw();
	}

	adjustCanvasSize() {
		if (this.canvas.width != this.canvas.clientWidth ||
				this.canvas.height != this.canvas.clientHeight) {
			this.canvas.width = this.canvas.clientWidth;
			this.canvas.height = this.canvas.clientHeight;
			this.annotationCanvas.width = this.canvas.clientWidth;
			this.annotationCanvas.height = this.canvas.clientHeight;
			this.adjustZoom();
		}
	}

	redraw() {
		super.redraw();
		if (this.isLoaded()) {
			const ctxAnn = this.annotationGraphics();
			ctxAnn.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
			ctxAnn.globalCompositeOperation = 'lighter';
			const rect = this.visibleRect();
			for (var i = 0; i < this.lines.length; i++) {
				if (this.mode == 'glyphs' || this.mode == 'lines' && this.infoLine == i) {
					const glyphs = this.lines[i].glyphs;
					for (var j = 0; j < glyphs.length; j++) {
						const glyph = glyphs[j];
						if (glyph != this.topGlyph)
							this.drawGlyph(glyph, ctxAnn, rect);
					}
				}
			}
			ctxAnn.globalCompositeOperation = 'source-over';
			if (this.topGlyph)
				this.drawGlyph(this.topGlyph, ctxAnn, rect);
			this.adjustInfoLine();
			if (this.focusRect) {
				const r = this.focusRect.toDisplay(rect, this.scale);
				const margin = 3;
				const rWide = new Rectangle(r.x - margin, r.y - margin, r.w + 2 * margin, r.h + 2 * margin);
				const ctx = this.graphics();
				ctx.beginPath();
				ctx.lineWidth = "2";
				ctx.strokeStyle = "red";
				ctx.rect(rWide.x, rWide.y, rWide.w, rWide.h);
				ctx.stroke();
			}
		}
	}

	drawGlyph(glyph, ctx, rect) {
		const glyphDest = glyph.rect.toDisplay(rect, this.scale);
		if (glyph.canvas) {
			ctx.drawImage(glyph.canvas, 0, 0, glyph.canvas.width, glyph.canvas.height,
				glyphDest.x, glyphDest.y, glyphDest.w, glyphDest.h);
		}
	}

	registerPoint(p) {
		super.registerPoint(p);
		if (!this.isLoaded() || this.dragged || this.mode != 'lines')
			return;
		const rect = this.visibleRect();
		const pImage = p.fromDisplay(rect, this.scale);
		const glyphs = Array.from(this.glyphTree.findPoint(pImage));
		if (glyphs.length > 0) {
			const glyph = getMinFunction(glyphs, g => g.rect.w * g.rect.h);
			if (glyph.line != this.infoLine) {
				this.removeInfo();
				this.infoLine = glyph.line;
				this.addInfoLine(glyph.line);
			}
		} else {
			this.removeInfo();
			this.infoLine = -1;
		}
		this.redraw();
	}

	removeInfo() {
		for (let i = 0; i < page.lines.length; i++) {
			const line = page.lines[i];
			for (var j = 0; j < line.glyphs.length; j++) {
				const glyph = line.glyphs[j];
				if (glyph.info)
					glyph.info.classList.add('zoom_canvas_hidden');
			}
		}
	}

	addInfoLine(i) {
		const line = this.lines[i];
		for (var j = 0; j < line.glyphs.length; j++) {
			const glyph = line.glyphs[j];
			if (glyph.info)
				glyph.info.classList.remove('zoom_canvas_hidden');
		}
	}

	adjustInfoLine() {
		if (this.infoLine < 0 || this.mode != 'lines')
			return;
		this.addInfoLine(this.infoLine);
		const line = this.lines[this.infoLine];
		const rect = this.visibleRect();
		const lineRect = line.rect.toDisplay(rect, this.scale);
		const extendedRects = line.glyphs.map(g => {
				const w = g.info.offsetWidth;
				const h = g.info.offsetHeight;
				const gRect = g.rect.toDisplay(rect, this.scale);
				return this.superimposedRect(gRect, w, h);
		});
		const extendedBound = Rectangle.boundingRects(extendedRects);
		var xDiff = 0;
		var yDiff = 0;
		if (lineRect.w > lineRect.h) {
			if (lineRect.y + lineRect.h + extendedBound.h <= this.canvas.height) {
				yDiff = lineRect.h + Math.max(0, lineRect.y - extendedBound.y);
			} else if (lineRect.y - extendedBound.h >= 0) {
				yDiff = -lineRect.h - Math.max(0, extendedBound.y + extendedBound.h - (lineRect.y + lineRect.h));
			} 
		} else {
			if (lineRect.x + lineRect.w + extendedBound.w <= this.canvas.width) {
				xDiff = lineRect.w + Math.max(0, lineRect.x - extendedBound.x);
			} else if (lineRect.x - extendedBound.w >= 0) {
				xDiff = -lineRect.w - Math.max(0, extendedBound.x + extendedBound.w - (lineRect.x + lineRect.w));
			} 
		}
		for (var j = 0; j < line.glyphs.length; j++) {
			const glyph = line.glyphs[j];
			const glyphDest = glyph.rect.toDisplay(rect, this.scale);
			glyphDest.x += xDiff;
			glyphDest.y += yDiff;
			const w = glyph.info.offsetWidth;
			const h = glyph.info.offsetHeight;
			const expRect = this.superimposedRect(glyphDest, w, h);
			if (this.rectWithinCanvas(expRect)) {
				glyph.info.style.left = expRect.x + 'px';
				glyph.info.style.top = expRect.y + 'px';
			} else {
				glyph.info.classList.add('zoom_canvas_hidden');
			}
		}
	}
	
	observePoint(p) {
		super.observePoint(p);
		if (!this.isLoaded())
			return;
		const rect = this.visibleRect();
		const pImage = p.fromDisplay(rect, this.scale);
		if (this.infoGlyph) 
			this.infoGlyph.info.classList.add('zoom_canvas_hidden');
		this.infoGlyph = null;
		const glyphs = Array.from(this.glyphTree.findPoint(pImage));
		if (glyphs.length > 0) {
			const newGlyph = getMinFunction(glyphs, g => g.rect.size());
			if (newGlyph !== this.topGlyph) {
				if (this.topGlyph)
					this.topGlyph.info.style['z-index'] = 20;
				this.topGlyph = newGlyph;
				this.topGlyph.info.style['z-index'] = 30;
				this.redraw();
			}
			if (this.mode == 'glyphs') {
				newGlyph.info.classList.remove('zoom_canvas_hidden');
				const glyphDest = newGlyph.rect.toDisplay(rect, this.scale);
				const infoPos = this.infoPosition(glyphDest, newGlyph.info.offsetWidth, newGlyph.info.offsetHeight);
				newGlyph.info.style.left = infoPos.x + 'px';
				newGlyph.info.style.top = infoPos.y + 'px';
				this.infoGlyph = newGlyph;
			}
		} else {
			if (this.topGlyph) {
				this.topGlyph.info.style['z-index'] = 20;
				this.topGlyph = null;
				this.redraw();
			}
		}
	}

	infoPosition(rect, w, h) {
		const margin = Math.min(Math.round(w / 3), Math.round(h / 3));
		const xMid = rect.x + Math.round(rect.w / 2) - Math.round(w / 2);
		const yMid = rect.y + Math.round(rect.h / 2) - Math.round(h / 2);
		const above = new Rectangle(xMid, rect.y - margin - h, w, h);
		const below = new Rectangle(xMid, rect.y + rect.h + margin, w, h);
		const left = new Rectangle(rect.x - margin - w, yMid, w, h);
		const right = new Rectangle(rect.x + rect.w + margin, yMid, w, h);
		const fallback = new Rectangle(margin, margin, w, h);
		if (this.rectWithinCanvas(below))
			return below;
		else if (this.rectWithinCanvas(above))
			return above;
		else if (this.rectWithinCanvas(left))
			return left;
		else if (this.rectWithinCanvas(right))
			return right;
		else
			return fallback;
	}

	superimposedRect(rect, w, h) {
		const xMid = rect.x + Math.round(rect.w / 2) - Math.round(w / 2);
		const yMid = rect.y + Math.round(rect.h / 2) - Math.round(h / 2);
		return new Rectangle(xMid, yMid, w, h);
	}

	setFocus(lineIndex, glyphIndex) {
		for (var i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			if (line.index == lineIndex) {
				for (var j = 0; j < line.glyphs.length; j++) {
					const glyph = line.glyphs[j];
					if (glyph.index == glyphIndex) {
						this.focusRect = glyph.rect;
						this.redraw();
					}
				}
			}
		}
	}
}

/*
 * Canvas with image that is clipped form of another image.
 *
 * API:
 *
 * as ZoomCanvas and in addition:
 *
 * canvas.load(image, clip)
 *	-> load image and show clip from it.
 * canvas.loadSecondaries(images)
 *	-> load secondary images
 */

class ZoomCanvasClipped extends ZoomCanvas {
	constructor(container) {
		super(container);
		this.clip = [];
	}

	natWidth() {
		return this.clipW();
	}

	natHeight() {
		return this.clipH();
	}

	clipMinX() {
		const xs = this.clip.map(p => p.x);
		return getMin(xs);
	}

	clipMaxX() {
		const xs = this.clip.map(p => p.x);
		return getMax(xs); 
	}

	clipMinY() {
		const ys = this.clip.map(p => p.y);
		return getMin(ys);
	}

	clipMaxY() {
		const ys = this.clip.map(p => p.y);
		return getMax(ys);
	}

	clipW() {
		const xs = this.clip.map(p => p.x);
		return getMax(xs) - getMin(xs) + 1;
	}

	clipH() {
		const ys = this.clip.map(p => p.y);
		return getMax(ys) - getMin(ys) + 1;
	}

	load(image, clip) {
		this.image = image;
		this.clip = clip;
		this.scale = 0.0;
		this.center = new Point(0.5, 0.5);
		this.completeLoading();
	}

	loadSecondaries(images) {
		this.images = images;
	}

	drawImage(sx, sy, sw, sh, x, y, w, h) {
		const ctx = this.graphics();
		const minX = this.clipMinX();
		const minY = this.clipMinY();
		ctx.save();
		ctx.fillStyle = 'lightgray';
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.clipCanvas(ctx, minX, minY, sx, sy, x, y);
		if (this.renderPrimary()) {
			ctx.drawImage(this.image, sx+minX, sy+minY, sw, sh, x, y, w, h);
		} else {
			const other = this.images[this.imageNum];
			const tx = Math.round(1.0 * (sx+minX) * other.naturalWidth / this.image.naturalWidth);
			const ty = Math.round(1.0 * (sy+minY) * other.naturalHeight / this.image.naturalHeight);
			const tw = Math.round(1.0 * sw * other.naturalWidth / this.image.naturalWidth);
			const th = Math.round(1.0 * sh * other.naturalHeight / this.image.naturalHeight);
			ctx.drawImage(other, tx, ty, tw, th, x, y, w, h);
		}
		ctx.restore();
	}

	visibleRectClipped() {
		var rect = this.visibleRect();
		rect.x += this.clipMinX();
		rect.y += this.clipMinY();
		return rect;
	}

	clipCanvas(ctx, minX, minY, sx, sy, x, y) {
		ctx.beginPath();
		for (var i = 0; i < this.clip.length; i++) {
			const p = this.clip[i];
			const xTarget = (p.x-sx-minX) * this.scale + x;
			const yTarget = (p.y-sy-minY) * this.scale + y;
			if (i == 0)
				ctx.moveTo(xTarget, yTarget);
			else
				ctx.lineTo(xTarget, yTarget);
		}
		ctx.clip();
	}
}

/*
 * Canvas with image that is clipped form of another image,
 * annotated with glyphs.
 *
 * API:
 *
 * as ZoomCanvasClipped and in addition:
 *
 * const canvas = new ZoomCanvasClippedAnnotated(container, direction, glyphs, nameToText, textToName,
 *	nameEditor)
 *	-> creates instance as new child of container, with directions and glyphs
 * [glyphs is array of SubImages;
 * nameToText produces alternative textual form of glyph name and textToName
 * is the reverse]
 * canvas.emptyData = function () { return data; }
 *	-> set function that produces data to be put into new glyph.
 * canvas.globalChangeHandlers.push(function)
 *  -> function called if there is a global change
 * [function has no arguments]
 * canvas.glyphChangeHandlers.push(function)
 *  -> function called if glyph changes
 * [function has one argument, which is glyph]
 * canvas.glyphDeleteHandlers.push(function)
 *  -> function called if glyph is deleted
 * [function has one argument, which is glyph]
 */

class ZoomCanvasClippedAnnotated extends ZoomCanvasClipped {
	directions;
	direction;
	glyphs;
	emptyData;
	globalChangeHandlers;
	glyphChangeHandlers;
	glyphDeleteHandlers;
	constructor(container, direction, glyphs, nameToText, textToName, nameEditor, nameGuesser) {
		super(container);
		this.imageCanvas = null;
		this.imagesCanvas = [];
		this.directions = ['hlr', 'hrl', 'vlr', 'vrl'];
		this.direction = direction;
		this.addButtons();
		this.annotationCanvas = document.createElement('canvas');
		this.annotationCanvas.className = 'zoom_canvas_annotation';
		this.display.append(this.annotationCanvas);
		this.addSliders();
		this.addGlyphList();
		this.glyphs = glyphs;
		this.nameToText = nameToText;
		this.textToName = textToName;
		this.nameEditor = nameEditor;
		this.nameGuesser = nameGuesser;
		this.blobs = [];
		this.paintStart = null;
		this.paintPointer = null;
		this.paintRadius = 20;
		this.startView();
		this.makeGlyphList();
		this.emptyData = function () { return { }; };
		this.globalChangeHandlers = [];
		this.glyphChangeHandlers = [];
		this.glyphDeleteHandlers = [];
	}

	loadSecondaries(images) {
		super.loadSecondaries(images);
		this.imagesCanvas = Array(images.length).fill(null);
	}

	currentImageCanvas() {
		if (!this.loaded)
			return null;
		if (this.renderPrimary()) {
			if (this.imageCanvas == null) {
				this.imageCanvas = document.createElement('canvas');
				this.imageCanvas.width = this.image.naturalWidth;
				this.imageCanvas.height = this.image.naturalHeight;
				this.imageCanvas.getContext('2d').drawImage(this.image, 0, 0);
			}
			return this.imageCanvas;
		} else {
			if (this.imagesCanvas[this.imageNum] == null) {
				this.imagesCanvas[this.imageNum] = document.createElement('canvas');
				this.imagesCanvas[this.imageNum].width = this.image.naturalWidth;
				this.imagesCanvas[this.imageNum].height = this.image.naturalHeight;
				this.imagesCanvas[this.imageNum].getContext('2d').
					drawImage(this.images[this.imageNum], 0, 0);
			}
			return this.imagesCanvas[this.imageNum];
		}
	}

	imageIsDark(p) {
		const canvas = this.currentImageCanvas();
		if (canvas == null)
			return false;
		const ctx = canvas.getContext('2d');
		return this.isDark(canvas, ctx, p);
	}

	addButtons() {
		this.buttons = document.createElement('div');
		this.buttons.classList.add('zoom_canvas_buttons');
		this.buttons.tabIndex = '-1';
		const thisCanvas = this;
		this.buttons.addEventListener('keydown',
			ImageControl.keyHandler(thisCanvas), false);
		this.container.prepend(this.buttons);
		this.addImageButton(this.buttons);
		this.addDirectionButton(this.buttons);
		this.addButton(this.buttons, 'viewer', '&#x25A1;', 'view [v]', 'startView');
		this.addButton(this.buttons, 'painter', '&#x25C9;', 'paint [p]', 'startPaint');
		this.addButton(this.buttons, 'tracer', '&#x25D0;', 'trace [t]', 'startTrace');
		this.addButton(this.buttons, 'eraser', '&#x25EF;', 'erase [e]', 'startErase');
		this.addButton(this.buttons, 'blobber', '&#x274B;', 'find blobs [b]', 'startBlob');
		this.addButton(this.buttons, 'filler', '&#x2B19;', 'fill blobs [f]', 'startFill');
		this.addSpace(this.buttons);
		this.addButton(this.buttons, 'unselecter', '&#x2205;', 'unselect all glyphs [u]', 'unactivate');
		this.addButton(this.buttons, 'allselecter', '&#x2200;', 'select all glyphs [a]', 'activateAll');
		this.addButton(this.buttons, 'merger', '&#x29D3;', 'merge glyphs [m]', 'mergeGlyphs');
		this.addButton(this.buttons, 'splitter', '&#x29CE;', 'split glyphs [s]', 'splitGlyphs');
		this.addButton(this.buttons, 'copier', '&#x2687;', 'copy glyph [c]', 'copyGlyph');
		this.addButton(this.buttons, 'decreaser', '&#x290B;', 'decrease paint thickness [-]', 'decreasePaint');
		this.addButton(this.buttons, 'increaser', '&#x290A;', 'increase paint thickness [+]', 'increasePaint');
		this.addButton(this.buttons, 'adjuster', '&#x21FF;', 'adjust parameters [j]', 'toggleParameters');
		this.addButton(this.buttons, 'guesser', '?', 'guess names [n]', 'guessNames');
	}

	addDirectionButton(buttons) {
		this.dirButton = document.createElement('button');
		this.dirButton.className = 'zoom_canvas_button';
		this.dirButton.title = 'change text direction [d]'
		const thisCanvas = this;
		this.dirButton.addEventListener('click', function (event) { thisCanvas.changeDirection(); }, false);
		this.dirButton.setAttribute('tabindex', '-1');
		buttons.append(this.dirButton);
		this.setDirection();
	}

	changeDirection() {
		var i = this.directions.indexOf(this.direction);
		i = i >= 0 ? i : 0;
		this.direction = this.directions[(i+1) % this.directions.length];
		this.setDirection();
		this.resortGlyphs();
		this.handleGlobalChange();
	}

	setDirection(dir) {
		var ch = '&#x27A1'; // hlr
		switch (this.direction) {
			case 'hrl':
				ch = '&#x2B05';
				break;
			case 'vrl':
				ch = '&#x2B0B';
				break;
			case 'vlr':
				ch = '&#x2B0A';
				break;
		}
		this.dirButton.innerHTML = ch;
		if (['hlr', 'hrl'].includes(this.direction)) {
			this.container.classList.remove('zoom_canvas_column');
			this.container.classList.add('zoom_canvas_row');
		} else {
			this.container.classList.remove('zoom_canvas_row');
			this.container.classList.add('zoom_canvas_column');
		}
		this.redraw();
	}

	addSliders() {
		const canvas = this;
		this.adjustSliders = document.createElement('div');
		this.adjustSliders.className = 'zoom_canvas_slider_holder';
		this.adjustSliders.style.height = '90px';
		this.addSlider(this.adjustSliders, 5, 'adjustSize', 'size', -1, 14, 5,
			function (event) { 
				if (canvas.mode == 'blob')
					canvas.findBlobs(); 
				else (canvas.mode == 'fill')
					canvas.fillBlobs(); 
			},
			this.expSliderMapping);
		this.addSlider(this.adjustSliders, 25, 'adjustRed', 'red', 0, 100, 50,
			function (event) { 
				if (canvas.mode == 'blob')
					canvas.findBlobs(); 
			},
			v => v);
		this.addSlider(this.adjustSliders, 45, 'adjustGreen', 'green', 0, 100, 50,
			function (event) { 
				if (canvas.mode == 'blob')
					canvas.findBlobs(); 
			},
			v => v);
		this.addSlider(this.adjustSliders, 65, 'adjustBlue', 'blue', 0, 100, 50,
			function (event) { 
				if (canvas.mode == 'blob')
					canvas.findBlobs(); 
			},
			v => v);
		this.adjustSliders.classList.add('zoom_canvas_hidden');
		this.display.append(this.adjustSliders);
	}

	addSlider(sliders, top, type, text, min, max, value, fun, mapping) {
		const title = document.createElement('span');
		const slider = document.createElement('input');
		const val = document.createElement('span');
		title.style.top = '' + top + 'px';
		title.innerHTML = text;
		title.className = 'zoom_canvas_slider_title';
		slider.style.top = '' + (top-7) + 'px';
		slider.setAttribute('type', 'range');
		slider.setAttribute('min', min);
		slider.setAttribute('max', max);
		slider.setAttribute('value', value);
		slider.className = 'zoom_canvas_slider';
		slider.addEventListener('input', function (event) { val.innerHTML = mapping(slider.value); }, false);
		if (fun)
			slider.addEventListener('change', fun, false);
		val.style.top = '' + top + 'px';
		val.innerHTML = '' + mapping(value);
		val.className = 'zoom_canvas_slider_value';
		sliders.append(title);
		sliders.append(slider);
		sliders.append(val);
		this[type] = slider;
	}

	expSliderMapping(v) {
		if (v < 0)
			return 0;
		else
			return Math.pow(2, v);
	}

	addGlyphList() {
		this.glyphList = document.createElement('div');
		this.glyphList.className = 'zoom_canvas_glyphs';
		this.container.append(this.glyphList);
	}

	static isSorted(ar, cmp) {
		for (var i = 0; i < ar.length-1; i++)
			if (cmp(ar[i], ar[i+1]) > 1)
				return false;
		return true;
	}

	glyphCmp() {
		var cmp = (g1,g2) => g1.rect.x - g2.rect.x;
		switch (this.direction) {
			case 'hlr':
				break;
			case 'hrl':
				break;
			case 'vlr':
				cmp = (g1,g2) => g1.rect.y - g2.rect.y;
				break;
			case 'vrl':
				cmp = (g1,g2) => g1.rect.y - g2.rect.y;
				break;
		}
		return cmp;
	}

	makeGlyphList() {
		this.sortGlyphs();
		while (this.glyphList.firstChild)
			this.glyphList.removeChild(this.glyphList.firstChild);
		const hs = this.glyphs.map(g => g.rect.h);
		const maxH = Math.max(...hs);
		for (var i = 0; i < this.glyphs.length; i++) {
			const glyph = this.glyphs[i];
			glyph.button = this.appendedGlyphButton(glyph);
			if (maxH > 0)
				glyph.lineH = maxH;
			this.formGlyphButton(glyph);
		}
	}

	resortGlyphs() {
		if (!ZoomCanvasClippedAnnotated.isSorted(this.glyphs, this.glyphCmp()))
			this.makeGlyphList();
	}

	sortGlyphs() {
		const cmp = this.glyphCmp();
		if (ZoomCanvasClippedAnnotated.isSorted(this.glyphs, cmp)) {
			return false;
		} else {
			this.glyphs.sort(cmp);
			return true;
		}
	}

	appendedGlyphButton(glyph) {
		const thisCanvas = this;
		const div = document.createElement('div');
		div.className = 'zoom_canvas_glyph';
		const canvas = document.createElement('canvas');
		div.append(canvas);
		const label = document.createElement('button');
		label.className = 'zoom_canvas_label';
		label.title = 'change label';
		label.innerHTML = glyph.data.name;
		label.addEventListener('click', function (event) {
			event.stopPropagation();
			thisCanvas.nameEditor(glyph); },
		false);
		div.append(label);
		const text = document.createElement('input');
		text.className = 'zoom_canvas_text';
		text.setAttribute('type', 'text');
		text.value = this.nameToText(glyph.data.name);
		text.addEventListener('change', function (event) {
			glyph.data.name = thisCanvas.textToName(text.value);
			label.innerHTML = glyph.data.name;
			thisCanvas.handleGlobalChange(); },
		false);
		text.addEventListener('click', function (event) {
			event.stopPropagation(); },
		false);
		div.append(text);
		this.glyphList.append(div);
		div.addEventListener('click', function (event) { 
			glyph.active = !glyph.active; 
			if (glyph.active)
				thisCanvas.setPosCenterGlyph(glyph);
			thisCanvas.formGlyphButton(glyph); 
			thisCanvas.redraw(); 
			thisCanvas.canvas.focus(); }, 
		false);
		return { div, canvas, label, text };
	}

	formGlyphButton(glyph) {
		if (glyph.rect.w == 0 || glyph.rect.h == 0) {
			glyph.button.div.classList.add('zoom_canvas_hidden');
			return;
		} else {
			glyph.button.div.classList.remove('zoom_canvas_hidden');
		}
		const canvasSize = 30;
		const lineH = Math.max(glyph.lineH, glyph.rect.h);
		if (glyph.active) 
			glyph.button.div.classList.add('zoom_canvas_active');
		else 
			glyph.button.div.classList.remove('zoom_canvas_active');
		var scale = 1.0 * glyph.rect.h / lineH;
		var h = Math.round(canvasSize * scale);
		var w = Math.round(canvasSize * scale * glyph.rect.w / glyph.rect.h);
		if (w > canvasSize) {
			w = canvasSize;
			h = Math.round(1.0 * canvasSize / w * h);
		}
		glyph.button.canvas.width = w;
		glyph.button.canvas.height = canvasSize;
		const ctx = glyph.button.canvas.getContext('2d');
		ctx.clearRect(0, 0, w, canvasSize);
		ctx.drawImage(glyph.canvas, glyph.leftMargin, glyph.topMargin, glyph.rect.w, glyph.rect.h,
							0, canvasSize-h, w, h);
	}

	setPosCenterGlyph(glyph) {
		this.setPos(glyph.rect.x + glyph.rect.w / 2, glyph.rect.y + glyph.rect.h / 2);
	}

	setPos(x, y) {
		const centerX = (x - this.clipMinX()) / this.natWidth();
		const centerY = (y - this.clipMinY()) / this.natHeight();
		this.center = new Point(centerX, centerY);
		this.adjustPos();
	}

	static insertLabel(label, textValue) {
		for (var i = 0; i < label.parentNode.childNodes.length; i++) {
			const child = label.parentNode.childNodes[i];
			if (child.classList.contains('zoom_canvas_text')) {
				child.value = textValue;
				const e = new Event('change');
				child.dispatchEvent(e);
			}
		}
	}

	startView() {
		this.mode = 'view';
		this.canvas.classList.remove('zoom_canvas_annotated');
		this.viewer.classList.add('zoom_canvas_active');
		this.painter.classList.remove('zoom_canvas_active');
		this.tracer.classList.remove('zoom_canvas_active');
		this.eraser.classList.remove('zoom_canvas_active');
		this.blobber.classList.remove('zoom_canvas_active');
		this.filler.classList.remove('zoom_canvas_active');
		this.unselecter.classList.remove('zoom_canvas_inactive');
		this.allselecter.classList.remove('zoom_canvas_inactive');
		this.merger.classList.remove('zoom_canvas_inactive');
		this.splitter.classList.remove('zoom_canvas_inactive');
		this.copier.classList.remove('zoom_canvas_inactive');
		this.decreaser.classList.add('zoom_canvas_inactive');
		this.increaser.classList.add('zoom_canvas_inactive');
		this.redraw();
		this.canvas.focus();
	}

	startPaint() {
		this.mode = 'paint';
		this.canvas.classList.add('zoom_canvas_annotated');
		this.viewer.classList.remove('zoom_canvas_active');
		this.painter.classList.add('zoom_canvas_active');
		this.tracer.classList.remove('zoom_canvas_active');
		this.eraser.classList.remove('zoom_canvas_active');
		this.blobber.classList.remove('zoom_canvas_active');
		this.filler.classList.remove('zoom_canvas_active');
		this.unselecter.classList.remove('zoom_canvas_inactive');
		this.allselecter.classList.add('zoom_canvas_inactive');
		this.merger.classList.remove('zoom_canvas_inactive');
		this.splitter.classList.remove('zoom_canvas_inactive');
		this.copier.classList.remove('zoom_canvas_inactive');
		this.decreaser.classList.remove('zoom_canvas_inactive');
		this.increaser.classList.remove('zoom_canvas_inactive');
		this.redraw();
		this.canvas.focus();
	}

	startTrace() {
		this.mode = 'trace';
		this.canvas.classList.add('zoom_canvas_annotated');
		this.viewer.classList.remove('zoom_canvas_active');
		this.painter.classList.remove('zoom_canvas_active');
		this.tracer.classList.add('zoom_canvas_active');
		this.eraser.classList.remove('zoom_canvas_active');
		this.blobber.classList.remove('zoom_canvas_active');
		this.filler.classList.remove('zoom_canvas_active');
		this.unselecter.classList.remove('zoom_canvas_inactive');
		this.allselecter.classList.add('zoom_canvas_inactive');
		this.merger.classList.remove('zoom_canvas_inactive');
		this.splitter.classList.remove('zoom_canvas_inactive');
		this.copier.classList.remove('zoom_canvas_inactive');
		this.decreaser.classList.remove('zoom_canvas_inactive');
		this.increaser.classList.remove('zoom_canvas_inactive');
		this.redraw();
		this.canvas.focus();
	}

	startErase() {
		this.mode = 'erase';
		this.canvas.classList.add('zoom_canvas_annotated');
		this.viewer.classList.remove('zoom_canvas_active');
		this.painter.classList.remove('zoom_canvas_active');
		this.tracer.classList.remove('zoom_canvas_active');
		this.eraser.classList.add('zoom_canvas_active');
		this.blobber.classList.remove('zoom_canvas_active');
		this.filler.classList.remove('zoom_canvas_active');
		this.unselecter.classList.remove('zoom_canvas_inactive');
		this.allselecter.classList.remove('zoom_canvas_inactive');
		this.merger.classList.remove('zoom_canvas_inactive');
		this.splitter.classList.remove('zoom_canvas_inactive');
		this.copier.classList.remove('zoom_canvas_inactive');
		this.decreaser.classList.remove('zoom_canvas_inactive');
		this.increaser.classList.remove('zoom_canvas_inactive');
		this.redraw();
		this.canvas.focus();
	}

	startBlob() {
		this.mode = 'blob';
		this.canvas.classList.remove('zoom_canvas_annotated');
		this.viewer.classList.remove('zoom_canvas_active');
		this.painter.classList.remove('zoom_canvas_active');
		this.tracer.classList.remove('zoom_canvas_active');
		this.eraser.classList.remove('zoom_canvas_active');
		this.blobber.classList.add('zoom_canvas_active');
		this.filler.classList.remove('zoom_canvas_active');
		this.unselecter.classList.add('zoom_canvas_inactive');
		this.allselecter.classList.remove('zoom_canvas_inactive');
		this.merger.classList.add('zoom_canvas_inactive');
		this.splitter.classList.add('zoom_canvas_inactive');
		this.copier.classList.add('zoom_canvas_inactive');
		this.decreaser.classList.add('zoom_canvas_inactive');
		this.increaser.classList.add('zoom_canvas_inactive');
		this.findBlobs();
		this.canvas.focus();
	}

	startFill() {
		this.mode = 'fill';
		this.canvas.classList.add('zoom_canvas_annotated');
		this.viewer.classList.remove('zoom_canvas_active');
		this.painter.classList.remove('zoom_canvas_active');
		this.tracer.classList.remove('zoom_canvas_active');
		this.eraser.classList.remove('zoom_canvas_active');
		this.blobber.classList.remove('zoom_canvas_active');
		this.filler.classList.add('zoom_canvas_active');
		this.unselecter.classList.add('zoom_canvas_inactive');
		this.allselecter.classList.remove('zoom_canvas_inactive');
		this.merger.classList.add('zoom_canvas_inactive');
		this.splitter.classList.add('zoom_canvas_inactive');
		this.copier.classList.add('zoom_canvas_inactive');
		this.decreaser.classList.add('zoom_canvas_inactive');
		this.increaser.classList.add('zoom_canvas_inactive');
		this.fillBlobs();
		this.canvas.focus();
	}

	handleGlobalChange() {
		for (const h of this.globalChangeHandlers)
			h();
	}
	
	handleGlyphChange(glyph) {
		for (const h of this.glyphChangeHandlers)
			h(glyph);
	}

	handleGlyphDelete(glyph) {
		for (const h of this.glyphDeleteHandlers)
			h(glyph);
	}

	toggleParameters() {
		this.adjustSliders.classList.toggle('zoom_canvas_hidden');
	}

	nActives() {
		return this.glyphs.filter(x => x.active).length;
	}

	anyActive() {
		return this.nActives() > 0;
	}

	decreasePaint() {
		if (!['paint', 'trace', 'erase'].includes(this.mode))
			return;
		this.paintRadius -= Math.max(1, Math.round(this.paintRadius * 0.2));
		this.paintRadius = Math.max(1, this.paintRadius);
		this.redraw();
	}

	increasePaint() {
		if (!['paint', 'trace', 'erase'].includes(this.mode))
			return;
		this.paintRadius += Math.max(1, Math.round(this.paintRadius * 0.2));
		this.paintRadius = Math.min(this.natWidth(), this.natHeight(), this.paintRadius);
		this.redraw();
	}

	annotationGraphics() {
		return this.annotationCanvas.getContext('2d');
	}

	adjustCanvasSize() {
		if (this.canvas.width != this.display.offsetWidth ||
				this.canvas.height != this.display.offsetHeight) {
			this.canvas.width = this.display.offsetWidth;
			this.canvas.height = this.display.offsetHeight;
			this.annotationCanvas.width = this.display.offsetWidth;
			this.annotationCanvas.height = this.display.offsetHeight;
			this.adjustZoom();
		}
	}

	redraw() {
		super.redraw();
		if (this.isLoaded()) {
			const ctx = this.annotationGraphics();
			ctx.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
			const rect = this.visibleRectClipped();
			for (var i = 0; i < this.glyphs.length; i++) {
				const glyph = this.glyphs[i];
				const glyphDest = glyph.rect.toDisplay(rect, this.scale);
				if (['view', 'paint', 'trace', 'erase'].includes(this.mode)) {
					if (glyph.active && this.mode != 'view')
						ctx.drawImage(glyph.canvas, glyph.leftMargin, glyph.topMargin, glyph.rect.w, glyph.rect.h,
							glyphDest.x, glyphDest.y, glyphDest.w, glyphDest.h);
					ctx.save();
					ctx.strokeStyle = 'red';
					if (glyph.active) {
						ctx.setLineDash([]);
						ctx.lineWidth = 2;
					} else {
						ctx.setLineDash([2, 2]);
						ctx.lineWidth = 1;
					}
					ctx.strokeRect(glyphDest.x, glyphDest.y, glyphDest.w, glyphDest.h);
					ctx.restore();
				}
			}
			if (this.mode == 'blob') {
				ctx.save();
				ctx.strokeStyle = 'red';
				ctx.setLineDash([]);
				ctx.lineWidth = 2;
				for (var i = 0; i < this.blobs.length; i++) {
					const blob = this.blobs[i];
					const blobDest = blob.rect.toDisplay(rect, this.scale);
					ctx.drawImage(blob.canvas, blob.leftMargin, blob.topMargin, blob.rect.w, blob.rect.h,
						blobDest.x, blobDest.y, blobDest.w, blobDest.h);
					ctx.strokeRect(blobDest.x, blobDest.y, blobDest.w, blobDest.h);
				}
				ctx.restore();
			}
			if (this.mode == 'fill') {
				ctx.save();
				for (var i = 0; i < this.blobs.length; i++) {
					const filled = this.blobs[i];
					if (filled) {
						const filledDest = filled.rect.toDisplay(rect, this.scale);
						ctx.drawImage(filled.canvas, filled.leftMargin, filled.topMargin, filled.rect.w, filled.rect.h,
							filledDest.x, filledDest.y, filledDest.w, filledDest.h);
						ctx.strokeRect(filledDest.x, filledDest.y, filledDest.w, filledDest.h);
					}
				}
				ctx.restore();
			}
			if (this.paintPointer) {
				if (['paint', 'trace'].includes(this.mode)) {
					ctx.save();
					ctx.beginPath();
					ctx.setLineDash([]);
					ctx.arc(this.paintPointer.x, this.paintPointer.y, this.paintRadius * this.scale, 0, 2 * Math.PI);
					ctx.stroke();
					ctx.restore();
				} else if (this.mode == 'erase') {
					ctx.save();
					ctx.beginPath();
					ctx.setLineDash([1, 1]);
					ctx.arc(this.paintPointer.x, this.paintPointer.y, this.paintRadius * this.scale, 0, 2 * Math.PI);
					ctx.stroke();
					ctx.restore();
				}
			}
		}
	}

	setCursor(type) {
		this.canvas.style.cursor = type;
		this.annotationCanvas.style.cursor = type;
	}

	initiatePoint(p) {
		if (['paint', 'trace', 'erase'].includes(this.mode)) {
			this.paintStart = p;
			this.canvas.focus();
		} else if (this.mode == 'view') {
			const i = this.pointToRectIndex(p, this.glyphs.map(g => g.rect));
			if (i >= 0) {
				const glyph = this.glyphs[i];
				glyph.active = !glyph.active;
				this.formGlyphButton(glyph);
				this.redraw();
			} else {
				super.initiatePoint(p);
			}
		} else if (this.mode == 'blob') {
			const i = this.pointToRectIndex(p, this.blobs.map(g => g.rect));
			if (i >= 0) {
				this.transferBlob(i);
				this.makeGlyphList();
				this.redraw();
			} else {
				super.initiatePoint(p);
			}
		} else if (this.mode == 'fill') {
			const i = this.pointToRectIndex(p, this.blobs.map(g => g ? g.rect : new Rectangle(0, 0, 0, 0)));
			if (i >= 0) {
				this.transferFill(i);
				this.redraw();
			} else {
				super.initiatePoint(p);
			}
		} else {
			super.initiatePoint(p);
		}
	}

	registerPoint(p) {
		this.paintStart = null;
		super.registerPoint(p);
	}

	unobservePoint() {
		this.paintStart = null;
		super.unobservePoint();
	}

	observePoint(p) {
		if (this.mode == 'paint') {
			const rect = this.visibleRectClipped();
			const lastP = p.fromDisplay(rect, this.scale);
			if (this.paintStart) {
				const firstP = this.paintStart.fromDisplay(rect, this.scale);
				if (firstP.distance(lastP) > 0) {
					const dir = firstP.subtract(lastP);
					const perpen1 = (new Point(-dir.y, dir.x)).normalize().mult(this.paintRadius);
					const perpen2 = (new Point(dir.y, -dir.x)).normalize().mult(this.paintRadius);
					const rect = [firstP.add(perpen1), firstP.add(perpen2), 
							lastP.add(perpen2), lastP.add(perpen1)]
					if (!this.anyActive()) {
						const empty = new SubImage(lastP.x, lastP.y);
						empty.active = true;
						empty.data = this.emptyData();
						this.glyphs.push(empty);
						empty.addCircle(lastP.x, lastP.y, this.paintRadius);
						empty.addPoly(rect);
						this.makeGlyphList();
						this.handleGlyphChange(empty);
					} else {
						for (var i = 0; i < this.glyphs.length; i++) {
							const glyph = this.glyphs[i];
							if (glyph.active) {
								glyph.addCircle(lastP.x, lastP.y, this.paintRadius);
								glyph.addPoly(rect);
								this.formGlyphButton(glyph);
								this.handleGlyphChange(glyph);
							}
						}
					}
				}
				this.paintStart = p;
			}
			this.paintPointer = p;
			this.redraw();
		} else if (this.mode == 'trace') {
			const rect = this.visibleRectClipped();
			const lastP = p.fromDisplay(rect, this.scale);
			if (this.paintStart) {
				const firstP = this.paintStart.fromDisplay(rect, this.scale);
				if (!this.anyActive()) {
					const empty = new SubImage(lastP.x, lastP.y);
					empty.active = true;
					empty.data = this.emptyData();
					const added = this.addTracedCircle(empty, lastP.x, lastP.y, this.paintRadius);
					if (added) {
						this.glyphs.push(empty);
						this.makeGlyphList();
						this.handleGlyphChange(empty);
					}
				} else {
					for (var i = 0; i < this.glyphs.length; i++) {
						const glyph = this.glyphs[i];
						if (glyph.active) {
							this.addTracedCircle(glyph, lastP.x, lastP.y, this.paintRadius);
							this.formGlyphButton(glyph);
							this.handleGlyphChange(glyph);
						}
					}
				}
				this.paintStart = p;
			}
			this.paintPointer = p;
			this.redraw();
		} else if (this.mode == 'erase') {
			const rect = this.visibleRectClipped();
			const lastP = p.fromDisplay(rect, this.scale);
			if (this.paintStart && this.anyActive()) {
				const firstP = this.paintStart.fromDisplay(rect, this.scale);
				if (firstP.distance(lastP) > 0) {
					const dir = firstP.subtract(lastP);
					const perpen1 = (new Point(-dir.y, dir.x)).normalize().mult(this.paintRadius);
					const perpen2 = (new Point(dir.y, -dir.x)).normalize().mult(this.paintRadius);
					const rect = [firstP.add(perpen1), firstP.add(perpen2), 
							lastP.add(perpen2), lastP.add(perpen1)]
					for (var i = 0; i < this.glyphs.length; i++) {
						const glyph = this.glyphs[i];
						if (glyph.active) {
							glyph.removeCircle(lastP.x, lastP.y, this.paintRadius);
							glyph.removePoly(rect);
							if (glyph.rect.w == 0) {
								this.glyphs.splice(i, 1);
								this.makeGlyphList();
								this.handleGlyphDelete(glyph);
							} else {
								this.formGlyphButton(glyph);
								this.handleGlyphChange(glyph);
							}
						}
					}
					this.paintStart = p;
				}
			} 
			this.paintPointer = p;
			this.redraw();
		} else {
			super.observePoint(p);
		}
	}

	addTracedCircle(glyph, x, y, r) {
		var added = false;
		for (var i = 0; i < r; i++) 
			for (var j = 0; i*i + j*j < r*r; j++) {
				added = this.addTracedPixel(glyph, x+i, y+j) || added;
				added = this.addTracedPixel(glyph, x-i, y+j) || added;
				added = this.addTracedPixel(glyph, x+i, y-j) || added;
				added = this.addTracedPixel(glyph, x-i, y-j) || added;
			}
		return added;
	}

	addTracedPixel(glyph, x, y) {
		const ctx = this.graphics();
		const p = new Point(x, y);
		const q = p.toDisplay(this.visibleRectClipped(), this.scale);
		if (this.imageIsDark(p)) {
			glyph.addPixel(x, y);
			return true;
		} else {
			return false;
		}
	}

	pointToRectIndex(p, rects) {
		var smallestIndex = -1;
		var smallestSize = Number.MAX_VALUE;
		for (var i = 0; i < rects.length; i++) {
			const rect = rects[i];
			const displayRect = rect.toDisplay(this.visibleRectClipped(), this.scale);
			if (displayRect.includes(p) && rect.size() < smallestSize) {
				smallestIndex = i;
				smallestSize = rect.size();
			}
		}
		return smallestIndex;
	}

	unactivate() {
		if (this.mode == 'blob')
			return;
		if (this.mode == 'fill') {
			this.setAllActive(false);
			this.fillBlobs();
		} else {
			this.setAllActive(false);
		}
		this.redraw();
	}

	activateAll() {
		if (['paint', 'trace'].includes(this.mode)) {
			return;
		} else if (this.mode == 'blob') {
			for (var i = this.blobs.length - 1; i >= 0; i--)
				this.transferBlob(i);
			this.makeGlyphList();
			this.startView();
		} else if (this.mode == 'fill') {
			for (var i = this.blobs.length - 1; i >= 0; i--)
				if (this.blobs[i])
					this.transferFill(i);
			this.redraw();
		} else {
			this.setAllActive(true);
			this.redraw();
		}
	}

	setAllActive(b) {
		for (var i = 0; i < this.glyphs.length; i++) {
			const glyph = this.glyphs[i];
			glyph.active = b;
			this.formGlyphButton(glyph);
		}
	}

	transferBlob(i) {
		const blob = this.blobs[i];
		this.blobs.splice(i, 1);
		blob.active = false;
		blob.data = this.emptyData();
		this.glyphs.push(blob);
		this.handleGlyphChange(blob);
	}
	
	transferFill(i) {
		const filled = this.blobs[i];
		const glyph = this.glyphs[i];
		glyph.active = false;
		glyph.rect = filled.rect;
		glyph.canvas = filled.canvas;
		glyph.leftMargin = filled.leftMargin;
		glyph.topMargin = filled.topMargin;
		this.blobs[i] = null;
		this.formGlyphButton(glyph);
		this.handleGlyphChange(glyph);
	}
	
	mergeGlyphs() {
		if (this.mode == 'blob' || this.mode == 'fill' || this.nActives() < 2)
			return;
		const firstActive = this.glyphs.findIndex(b => b.active);
		for (var i = this.glyphs.length - 1; i > firstActive; i--) {
			const glyph = this.glyphs[i];
			if (glyph.active) {
				this.glyphs[firstActive].add(glyph);
				this.glyphs.splice(i, 1);
				this.handleGlyphDelete(glyph);
			}
		}
		this.makeGlyphList();
		this.redraw();
		this.handleGlyphChange(this.glyphs[firstActive]);
	}

	findBlobs() {
		this.setCursor('wait');
		const thisCanvas = this;
		setTimeout(function() {
			const size = thisCanvas.expSliderMapping(thisCanvas.adjustSize.value);
			thisCanvas.blobs = [];
			const canvas = thisCanvas.imageCopy();
			const ctx = canvas.getContext('2d');
			for (var x = 0; x < canvas.width; x++) {
				for (var y = 0; y < canvas.height; y++) {
					const p = new Point(x, y);
					if (thisCanvas.isDark(canvas, ctx, p)) {
						const blob = thisCanvas.getBlob(canvas, ctx, p);
						if (blob.length >= size)
							thisCanvas.addBlob(blob);
					}
				}
			}
			thisCanvas.setCursor('default');
			thisCanvas.redraw();
		}, 50);
	}

	fillBlobs() {
		this.blobs = [];
		this.setCursor('wait');
		const thisCanvas = this;
		setTimeout(function() {
			for (var i = 0; i < thisCanvas.glyphs.length; i++) {
				const glyph = thisCanvas.glyphs[i];
				if (glyph.active) {
					const filling = thisCanvas.filling(glyph);
					thisCanvas.blobs.push(filling);
				} else {
					thisCanvas.blobs.push(null);
				}
			}
			thisCanvas.setCursor('default');
			thisCanvas.redraw();
		}, 50);
	}

	splitGlyphs() {
		if (this.mode == 'blob' || this.mode == 'fill' || this.nActives() == 0)
			return;
		var changes = false;
		this.setCursor('wait');
		for (var i = this.glyphs.length - 1; i >= 0; i--) {
			const glyph = this.glyphs[i];
			if (glyph.active) {
				const glyphs = this.segment(glyph);
				if (glyphs.length > 1) {
					this.glyphs.splice(i, 1, ...glyphs);
					for (var j = 0; j < glyphs.length; j++)
						this.glyphs[i + j].data = this.emptyData();
					for (var j = 0; j < glyphs.length; j++)
						this.handleGlyphChange(this.glyphs[i + j]);
					changes = true;
				}
			}
		}
		this.setCursor('default');
		if (changes) {
			this.makeGlyphList();
			this.redraw();
		}
	}

	copyGlyph() {
		if (this.mode == 'blob' || this.mode == 'fill' || this.nActives() == 0)
			return;
		var copies = [];
		for (var i = 0; i < this.glyphs.length; i++) {
			const glyph = this.glyphs[i];
			if (glyph.active) {
				const copy = glyph.copy();
				copy.active = true;
				copy.data = this.emptyData();
				copies.push(copy);
			}
		}
		for (var i = 0; i < copies.length; i++) {
			this.glyphs.push(copies[i]);
			this.handleGlyphChange(copies[i]);
		}
		this.makeGlyphList();
		this.redraw();
	}

	segment(glyph) {
		var blobs = [];
		const canvas = this.glyphCopy(glyph);
		const ctx = canvas.getContext('2d');
		for (var x = 0; x < canvas.width; x++) {
			for (var y = 0; y < canvas.height; y++) {
				const p = new Point(x, y);
				if (this.isDark(canvas, ctx, p)) {
					const pixels = this.getBlob(canvas, ctx, p);
					const blob = this.makeBlob(pixels, glyph.rect.x, glyph.rect.y);
					blobs.push(blob);
				}
			}
		}
		return blobs;
	}

	filling(glyph) {
		const size = this.expSliderMapping(this.adjustSize.value);
		const w = glyph.rect.w;
		const h = glyph.rect.h;
		const visited = this.glyphCopy(glyph);
		const glyphFilled = glyph.copy();
		const ctx = visited.getContext('2d');
		for (var x = 0; x < w; x++) {
			for (var y = 0; y < h; y++) {
				const p = new Point(x, y);
				if (this.isLight(visited, ctx, p)) {
					const pixels = this.getGap(visited, ctx, p);
					const atBorder = pixels.find(p => p.x == 0 || p.x == w-1 || p.y == 0 || p.y == h-1);
					if (!atBorder && pixels.length <= size)
						for (const pixel of pixels)
							glyphFilled.addPixel(glyph.rect.x + pixel.x, glyph.rect.y + pixel.y);
				}
			}
		}
		return glyphFilled;
	}

	getBlob(canvas, ctx, p) {
		this.setWhite(ctx, p);
		var toVisit = [p];
		var pixels = []
		while (toVisit.length > 0) {
			const p = toVisit.pop();
			pixels.push(p);
			const p1 = new Point(p.x+1, p.y);
			const p2 = new Point(p.x, p.y+1);
			const p3 = new Point(p.x-1, p.y);
			const p4 = new Point(p.x, p.y-1);
			if (this.isDark(canvas, ctx, p1)) {
				this.setWhite(ctx, p1);
				toVisit.push(p1);
			}
			if (this.isDark(canvas, ctx, p2)) {
				this.setWhite(ctx, p2);
				toVisit.push(p2);
			}
			if (this.isDark(canvas, ctx, p3)) {
				this.setWhite(ctx, p3);
				toVisit.push(p3);
			}
			if (this.isDark(canvas, ctx, p4)) {
				this.setWhite(ctx, p4);
				toVisit.push(p4);
			}
		}
		return pixels;
	}

	getGap(canvas, ctx, p) {
		this.setDark(ctx, p);
		var toVisit = [p];
		var pixels = []
		while (toVisit.length > 0) {
			const p = toVisit.pop();
			pixels.push(p);
			const p1 = new Point(p.x+1, p.y);
			const p2 = new Point(p.x, p.y+1);
			const p3 = new Point(p.x-1, p.y);
			const p4 = new Point(p.x, p.y-1);
			if (this.isLight(canvas, ctx, p1)) {
				this.setDark(ctx, p1);
				toVisit.push(p1);
			}
			if (this.isLight(canvas, ctx, p2)) {
				this.setDark(ctx, p2);
				toVisit.push(p2);
			}
			if (this.isLight(canvas, ctx, p3)) {
				this.setDark(ctx, p3);
				toVisit.push(p3);
			}
			if (this.isLight(canvas, ctx, p4)) {
				this.setDark(ctx, p4);
				toVisit.push(p4);
			}
		}
		return pixels;
	}

	isDark(canvas, ctx, p) {
		const red = this.adjustRed.value;
		const green = this.adjustGreen.value;
		const blue = this.adjustBlue.value;
		if (p.x < 0 || p.x >= canvas.width || p.y < 0 || p.y >= canvas.height)
			return false;
		const data = ctx.getImageData(p.x, p.y, 1, 1).data;
		return data[3] >= 128 && 
				data[0] * (100-red) / 100 + 
				data[1] * (100-green) / 100 + 
				data[2] * (100-blue) / 100 < 200;
	}

	setWhite(ctx, p) {
		const d = ctx.getImageData(p.x, p.y, 1, 1);
		d.data[3] = 0;
		ctx.putImageData(d, p.x, p.y);
	}

	isLight(canvas, ctx, p) {
		if (p.x < 0 || p.x >= canvas.width || p.y < 0 || p.y >= canvas.height)
			return false;
		const data = ctx.getImageData(p.x, p.y, 1, 1).data;
		return data[3] < 128 || (data[0] >= 128 && data[1] >= 128 && data[2] >= 128);
	}
	
	setDark(ctx, p) {
		const d = ctx.getImageData(p.x, p.y, 1, 1);
		d.data[0] = 255;
		d.data[1] = 0;
		d.data[2] = 0;
		d.data[3] = 255;
		ctx.putImageData(d, p.x, p.y);
	}

	imageCopy() {
		const minX = this.clipMinX();
		const minY = this.clipMinY();
		const w = this.clipW();
		const h = this.clipH();
		const blobCanvas = this.emptyCanvas(w, h);
		const ctx = blobCanvas.getContext('2d');
		ctx.beginPath();
		for (var i = 0; i < this.clip.length; i++) {
			const p = this.clip[i];
			if (i == 0)
				ctx.moveTo(p.x - minX, p.y - minY);
			else
				ctx.lineTo(p.x - minX, p.y - minY);
		}
		ctx.clip();
		if (this.renderPrimary()) {
			var image = this.image;
			var scale = 1;
		} else {
			var image = this.images[this.imageNum];
			var scale = this.images[this.imageNum].naturalWidth / this.image.naturalWidth;
		}
		ctx.drawImage(image, scale * minX, scale * minY, scale * w, scale * h, 0, 0, w, h);
		return blobCanvas;
	}

	glyphCopy(glyph) {
		const w = glyph.rect.w;
		const h = glyph.rect.h;
		const copyCanvas = this.emptyCanvas(w, h);
		const ctx = copyCanvas.getContext('2d');
		ctx.drawImage(glyph.canvas, glyph.leftMargin, glyph.topMargin, w, h, 0, 0, w, h);
		return copyCanvas;
	}

	emptyCanvas(w, h) {
		const copyCanvas = document.createElement('canvas');
		copyCanvas.width = w;
		copyCanvas.height = h;
		return copyCanvas;
	}

	addBlob(b) {
		const x = this.clipMinX();
		const y = this.clipMinY();
		const xs = b.map(p => p.x);
		const ys = b.map(p => p.y);
		const minX = getMin(xs);
		const maxX = getMax(xs);
		const minY = getMin(ys);
		const maxY = getMax(ys);
		const w = maxX - minX + 1;
		const h = maxY - minY + 1;
		for (const glyph of this.glyphs) {
			if (glyph.rect.overlaps(new Rectangle(x + minX, y + minY, w, h)))
				return;
		}
		const image = new SubImage(minX, minY);
		for (const p of b)
			image.addPixel(x + p.x, y + p.y);
		this.blobs.push(image);
	}

	makeBlob(b, x, y) {
		const xs = b.map(p => p.x);
		const ys = b.map(p => p.y);
		const minX = getMin(xs);
		const maxX = getMax(xs);
		const minY = getMin(ys);
		const maxY = getMax(ys);
		const w = maxX - minX + 1;
		const h = maxY - minY + 1;
		const image = new SubImage(x + b[0].x, y + b[0].y);
		for (const p of b)
			image.addPixel(x + p.x, y + p.y);
		image.active = true;
		return image;
	}

	guessNames() {
		for (const glyph of this.glyphs)
			if (glyph.button && !glyph.button.label.textContent)
				this.nameGuesser(glyph);
	}

	processKey(k) {
		if (k == 'a') {
			this.activateAll();
		} else if (k == 'b') {
			this.startBlob();
		} else if (k == 'c') {
			this.copyGlyph();
		} else if (k == 'd') {
			this.changeDirection();
		} else if (k == 'e') {
			this.startErase();
		} else if (k == 'f') {
			this.startFill();
		} else if (k == 'i') {
			this.nextImage();
		} else if (k == 'j') {
			this.toggleParameters();
		} else if (k == 'm') {
			this.mergeGlyphs();
		} else if (k == 'n') {
			this.guessNames();
		} else if (k == 'p') {
			this.startPaint();
		} else if (k == 's') {
			this.splitGlyphs();
		} else if (k == 't') {
			this.startTrace();
		} else if (k == 'u') {
			this.unactivate();
		} else if (k == 'v') {
			this.startView();
		} else if (k == '-') {
			this.decreasePaint();
		} else if (k == '+') {
			this.increasePaint();
		}
	}
}
