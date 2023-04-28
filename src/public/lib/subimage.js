class SubImage {
	rect;
	canvas;
	leftMargin;
	topMargin;
	loadHandlers;
	constructor(x, y) {
		this.init(x, y);
		this.loadHandlers = [];
	}

	init(x, y) {
		this.rect = new Rectangle(x, y, 0, 0);
		this.canvas = document.createElement('canvas');
		this.canvas.width = 2 * SubImage.initialMargin();
		this.canvas.height = 2 * SubImage.initialMargin();
		this.leftMargin = SubImage.initialMargin();
		this.topMargin = SubImage.initialMargin();
	}

	static initialMargin() {
		return 25;
	}

	graphics() {
		const ctx = this.canvas.getContext('2d');
		ctx.fillStyle = 'black';
		return ctx;
	}

	load(src) {
		this.image = new Image();
		const thisImage = this;
		this.image.addEventListener('load', function() { thisImage.completeLoading(); }, false); 
		this.image.src = src;
	}

	completeLoading() {
		this.rect.w = this.image.naturalWidth;
		this.rect.h = this.image.naturalHeight;
		this.includePixel(this.rect.x + this.rect.w - 1, this.rect.y + this.rect.h - 1);
		this.graphics().drawImage(this.image, 0, 0, this.rect.w, this.rect.h,
			this.leftMargin, this.topMargin, this.rect.w, this.rect.h);
		for (const h of this.loadHandlers)
			h();
	}

	toDataURL() {
		var sub = document.createElement("canvas");
		sub.width = this.rect.w;
		sub.height = this.rect.h;
		var ctx = sub.getContext("2d");
		ctx.drawImage(this.canvas, this.leftMargin, this.topMargin, this.rect.w, this.rect.h,
			0, 0, this.rect.w, this.rect.h);
		const image = sub.toDataURL();
		const data = image.split(',')[1];
		return data;
	}

	addPixel(x, y) {
		this.includePixel(x, y);
		const ctx = this.graphics();
		ctx.fillRect(x - (this.rect.x - this.leftMargin),
			y - (this.rect.y - this.topMargin), 1, 1);
	}

	addCircle(x, y, r) {
		this.includePixel(x-r, y);
		this.includePixel(x+r, y);
		this.includePixel(x, y-r);
		this.includePixel(x, y+r);
		const xDiff = this.rect.x - this.leftMargin;
		const yDiff = this.rect.y - this.topMargin;
		const ctx = this.graphics();
		ctx.beginPath();
		ctx.arc(x - xDiff,
				y - yDiff, r, 0, 2 * Math.PI);
		ctx.fill();
	}

	addPoly(poly) {
		for (const p of poly) 
			this.includePixel(p.x, p.y);
		const xDiff = this.rect.x - this.leftMargin;
		const yDiff = this.rect.y - this.topMargin;
		const ctx = this.graphics();
		ctx.beginPath();
		ctx.moveTo(poly[0].x - xDiff, poly[0].y - yDiff);
		for (var i = 1; i < poly.length; i++)
			ctx.lineTo(poly[i].x - xDiff, poly[i].y - yDiff);
		ctx.closePath();
		ctx.fill();
	}

	add(other) {
		this.includePixel(other.rect.x, other.rect.y);
		this.includePixel(other.rect.x + other.rect.w - 1, other.rect.y + other.rect.h - 1);
		var xPre = this.rect.x - this.leftMargin;
		var yPre = this.rect.y - this.topMargin;
		this.graphics().drawImage(other.canvas,
			other.leftMargin, other.topMargin, other.rect.w, other.rect.h,
			other.rect.x - xPre, other.rect.y - yPre, other.rect.w, other.rect.h);
	}

	removePixel(x, y) {
		const ctx = this.graphics();
		ctx.clearRect(x - (this.rect.x - this.leftMargin), 
			y - (this.rect.y - this.topMargin), 1, 1);
		this.minimizeRect();
	}

	removeCircle(x, y, r) {
		const ctx = this.graphics();
		ctx.save();
		ctx.beginPath();
		ctx.arc(x - (this.rect.x - this.leftMargin),
				y - (this.rect.y - this.topMargin), r, 0, 2 * Math.PI);
		ctx.clip();
		ctx.clearRect(this.leftMargin, this.topMargin, this.rect.w, this.rect.h);
		ctx.restore();
		this.minimizeRect();
	}

	removePoly(poly) {
		const xDiff = this.rect.x - this.leftMargin;
		const yDiff = this.rect.y - this.topMargin;
		var xMin = poly[0].x - xDiff;
		var xMax = poly[0].x - xDiff;
		var yMin = poly[0].y - yDiff;
		var yMax = poly[0].y - yDiff;
		for (var i = 1; i < poly.length; i++) {
			xMin = Math.min(xMin, poly[i].x - xDiff);
			xMax = Math.max(xMax, poly[i].x - xDiff);
			yMin = Math.min(yMin, poly[i].y - yDiff);
			yMax = Math.max(yMax, poly[i].y - yDiff);
		}
		const ctx = this.graphics();
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(poly[0].x - xDiff, poly[0].y - yDiff);
		for (var i = 1; i < poly.length; i++)
			ctx.lineTo(poly[i].x - xDiff, poly[i].y - yDiff);
		ctx.closePath();
		ctx.clip();
		ctx.clearRect(xMin, yMin, xMax-xMin, yMax-yMin);
		ctx.restore();
		this.minimizeRect();
	}

	includePixel(x, y) {
		if (this.rect.w == 0)
			this.init(x, y);
		var xPre = this.rect.x - this.leftMargin;
		const xMin = Math.min(x, this.rect.x);
		const xMax = Math.max(x, this.rect.x + this.rect.w - 1);
		var yPre = this.rect.y - this.topMargin;
		const yMin = Math.min(y, this.rect.y);
		const yMax = Math.max(y, this.rect.y + this.rect.h - 1);
		const w = xMax - xMin + 1;
		const h = yMax - yMin + 1;
		if (x < xPre || xPre + this.canvas.width <= x ||
				y < yPre || yPre + this.canvas.height <= y) {
			const canvas = document.createElement('canvas');
			canvas.width = w + 2 * SubImage.initialMargin();
			canvas.height = h + 2 * SubImage.initialMargin();
			xPre = xMin - SubImage.initialMargin();
			yPre = yMin - SubImage.initialMargin();
			canvas.getContext('2d').drawImage(this.canvas,
				this.leftMargin, this.topMargin, this.rect.w, this.rect.h,
				this.rect.x - xPre, this.rect.y - yPre, this.rect.w, this.rect.h);
			this.canvas = canvas;
		}
		this.leftMargin = xMin - xPre;
		this.topMargin = yMin - yPre;
		this.rect = new Rectangle(xMin, yMin, w, h);
	}

	copy() {
		const c = new SubImage(0, 0);
		c.rect = new Rectangle(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
		c.canvas.width = this.rect.w + 2 * SubImage.initialMargin();
		c.canvas.height = this.rect.h + 2 * SubImage.initialMargin();
		c.canvas.getContext('2d').drawImage(this.canvas,
			this.leftMargin, this.topMargin, this.rect.w, this.rect.h,
			SubImage.initialMargin(), SubImage.initialMargin(), this.rect.w, this.rect.h);
		return c;
	}

	minimizeRect() {
		const ctx = this.graphics();
		for (var x = this.leftMargin + this.rect.w-1; x >= this.leftMargin; x--) {
			var colEmpty = true;
			for (var y = this.topMargin; y < this.topMargin + this.rect.h-1; y++) {
				const val = ctx.getImageData(x, y, 1, 1).data;
				if (val[3] > 0) {
					colEmpty = false;
					break;
				}
			}
			if (colEmpty)
				this.rect.w--;
			else
				break;
		}
		for (var x = this.leftMargin; x < this.leftMargin + this.rect.w; x++) {
			var colEmpty = true;
			for (var y = this.topMargin; y < this.topMargin + this.rect.h-1; y++) {
				const val = ctx.getImageData(x, y, 1, 1).data;
				if (val[3] > 0) {
					colEmpty = false;
					break;
				}
			}
			if (colEmpty) {
				this.rect.x++;
				this.rect.w--;
				this.leftMargin++;
			} else {
				break;
			}
		}
		for (var y = this.topMargin + this.rect.h-1; y >= this.topMargin; y--) {
			var rowEmpty = true;
			for (var x = this.leftMargin; x < this.leftMargin + this.rect.w-1; x++) {
				const val = ctx.getImageData(x, y, 1, 1).data;
				if (val[3] > 0) {
					rowEmpty = false;
					break;
				}
			}
			if (rowEmpty)
				this.rect.h--;
			else
				break;
		}
		for (var y = this.topMargin; y < this.topMargin + this.rect.h; y++) {
			var rowEmpty = true;
			for (var x = this.leftMargin; x < this.leftMargin + this.rect.w-1; x++) {
				const val = ctx.getImageData(x, y, 1, 1).data;
				if (val[3] > 0) {
					rowEmpty = false;
					break;
				}
			}
			if (rowEmpty) {
				this.rect.y++;
				this.rect.h--;
				this.topMargin++;
			} else {
				break;
			}
		}
	}
}
