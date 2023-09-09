class DrawCanvas {
	constructor(container) {
		this.sign = document.createElement('canvas');
		this.canvas = document.createElement('canvas');
		this.canvas.tabIndex = '0';
		container.append(this.canvas);

		this.mode = 'paint';
		this.dragged = false;
		this.dragStart = null;
		this.touchStart = null;
		this.current = null;
		this.setSize(100, 100);
		this.paintThick = 5;
		this.eraseThick = 10;

		this.canvas.addEventListener('mousedown', this.mousedownHandler());
		this.canvas.addEventListener('mouseup', this.mouseupHandler());
		this.canvas.addEventListener('mouseout', this.mouseoutHandler());
		this.canvas.addEventListener('mousemove', this.mousemoveHandler());
		this.canvas.addEventListener('touchstart', this.touchstartHandler());
		this.canvas.addEventListener('touchend', this.touchendHandler());
		this.canvas.addEventListener('touchmove', this.touchmoveHandler());
		this.canvas.addEventListener('keydown', this.keyHandler(), false);

		this.process = null;
	}

	static eventPoint(event) {
		return new Point(event.offsetX || event.layerX, event.offsetY || event.layerY);
	}

	static touchValue(event) {
		const rect = this.canvas.getBoundingClientRect();
		var val = [];
		for (var i = 0; i < event.touches.length; i++)
			val.push(new Point(event.touches[i].pageX - rect.left,
					event.touches[i].pageY - rect.top));
		return val;
	}

	mousedownHandler() {
		const drawcanvas = this;
		return function (event) {
			event.preventDefault();
			drawcanvas.current = DrawCanvas.eventPoint(event);
			drawcanvas.dragStart = drawcanvas.current;
			drawcanvas.dragged = false;
			drawcanvas.canvas.focus();
			drawcanvas.redraw();
		};
	}
	mouseupHandler() {
		const drawcanvas = this;
		return function (event) {
			event.preventDefault();
			drawcanvas.current = DrawCanvas.eventPoint(event);
			drawcanvas.dragStart = null;
			drawcanvas.dragged = false;
			drawcanvas.redraw();
		};
	}
	mouseoutHandler() {
		const drawcanvas = this;
		return function (event) {
			event.preventDefault();
			drawcanvas.current = null;
			drawcanvas.dragStart = null;
			drawcanvas.dragged = false;
			drawcanvas.redraw();
		};
	}
	mousemoveHandler() {
		const drawcanvas = this;
		return function (event) {
			event.preventDefault();
			if (drawcanvas.dragStart) {
				drawcanvas.current = DrawCanvas.eventPoint(event);
				if (drawcanvas.current.distance(drawcanvas.dragStart) > 0) {
					drawcanvas.move(drawcanvas.dragStart, drawcanvas.current);
					drawcanvas.dragStart = drawcanvas.current;
					drawcanvas.dragged = true;
				}
			} else {
				drawcanvas.observe(DrawCanvas.eventPoint(event));
			}
			drawcanvas.canvas.focus();
		};
	}

	touchstartHandler() {
		const drawcanvas = this;
		return function (event) {
			event.preventDefault();
			drawcanvas.touchStart = DrawCanvas.touchValue(event);
			drawcanvas.dragged = false;
			drawcanvas.canvas.focus();
		};
	}
	touchendHandler() {
		const drawcanvas = this;
		return function (event) {
			event.preventDefault();
			if (drawcanvas.touchStart.length == 1)
				drawcanvas.dragStart = null;
			drawcanvas.dragged = false;
		};
	}
	touchmoveHandler() {
		const drawcanvas = this;
		return function (event) {
			event.preventDefault();
			const delta = 10;
			switch (event.touches.length) {
				case 1:
					if (drawcanvas.touchStart.length != 1)
						return;
					const nextVal = DrawCanvas.touchValue(event);
					if (nextVal[0].distance(drawcanvas.touchStart[0]) > 0) {
						drawcanvas.move(drawcanvas.touchStart[0], nextVal[0]);
						drawcanvas.touchStart = nextVal;
						drawcanvas.dragged = true;
					}
					break;
				default:
					drawcanvas.touchStart = [];
					drawcanvas.dragged = false;
					break;
			}
		};
	}

	observe(p) {
		this.current = p;
		this.redraw();
	}

	move(p1, p2) {
		if (!this.dragged)
			return;
		const ctx = this.sign.getContext('2d');
		if (this.mode == 'paint') {
			DrawCanvas.fillCircle(ctx, p1, this.paintThick, 'black');
			DrawCanvas.fillLine(ctx, p1, p2, this.paintThick, 'black');
		} else {
			DrawCanvas.fillCircle(ctx, p1, this.eraseThick, 'white');
			DrawCanvas.fillLine(ctx, p1, p2, this.eraseThick, 'white');
		}
		this.redraw();
	}

	keyHandler() {
		const drawcanvas = this;
		return function (event) {
			switch (event.key) {
				case 'Enter': drawcanvas.processKey('\n'); 
					event.preventDefault(); return true;
				case 'Delete': drawcanvas.processKey('del'); 
					event.preventDefault(); return true;
				case 'e': drawcanvas.processKey('e'); 
					event.preventDefault(); return true;
				case 'p': drawcanvas.processKey('p'); 
					event.preventDefault(); return true;
			}
			switch (event.keyCode) {
				case 13: drawcanvas.processKey('\n'); 
					event.preventDefault(); return true;
				case 46: drawcanvas.processKey('del'); 
					event.preventDefault(); return true;
				case 69: drawcanvas.processKey('e'); 
					event.preventDefault(); return true;
				case 80: drawcanvas.processKey('p'); 
					event.preventDefault(); return true;
			}
			return false;
		};
	}
	enter() {
		this.processKey('\n');
	}
	clean() {
		this.processKey('del');
	}
	erase() {
		this.processKey('e');
	}
	paint() {
		this.processKey('p');
	}
	processKey(k) {
		switch (k) {
			case '\n': this.process(); break;
			case 'del': this.del(); break;
			case 'e': this.mode = 'erase'; break;
			case 'p': this.mode = 'paint'; break;
		}
		this.redraw();
	}

	setSize(w, h) {
		this.sign.width = w;
		this.sign.height = h;
		this.canvas.width = w;
		this.canvas.height = h;
		this.del();
	}

	del() {
		const ctx = this.sign.getContext('2d');
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, this.sign.width, this.sign.height);
		this.redraw();
	}

	redraw() {
		const ctx = this.canvas.getContext('2d');
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.drawImage(this.sign, 0, 0);
		if (this.current) {
			if (this.mode == 'paint')
				DrawCanvas.strokeCircle(ctx, this.current, this.paintThick, 'black');
			else
				DrawCanvas.strokeCircle(ctx, this.current, this.eraseThick, 'red');
		}
	}

	static fillCircle(ctx, p, thick, color) {
		ctx.save();
		ctx.beginPath();
		ctx.fillStyle = color;
		ctx.setLineDash([]);
		ctx.arc(p.x, p.y, thick, 0, 2 * Math.PI);
		ctx.fill();
		ctx.restore();
	}

	static strokeCircle(ctx, p, thick, color) {
		ctx.save();
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.setLineDash([1, 1]);
		ctx.arc(p.x, p.y, thick, 0, 2 * Math.PI);
		ctx.stroke();
		ctx.restore();
	}

	static fillLine(ctx, p1, p2, thick, color) {
		ctx.lineWidth = 2 * thick;
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();
	}
}
