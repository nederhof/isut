class Point {
	x;
	y;
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	norm() {
		return Math.hypot(this.x, this.y);
	}

	normalize() {
		const n = this.norm();
		return new Point(1.0 * this.x / n, 1.0 * this.y / n);
	}

	distance(p) {
		const dx = this.x - p.x;
		const dy = this.y - p.y;
		return Math.hypot(dx, dy);
	}

	add(p) {
		const sx = this.x + p.x;
		const sy = this.y + p.y;
		return new Point(sx, sy);
	}

	subtract(p) {
		const dx = this.x - p.x;
		const dy = this.y - p.y;
		return new Point(dx, dy);
	}

	average(p) {
		const sum = this.add(p);
		return new Point(sum.x / 2, sum.y / 2);
	}

	mult(f) {
		return new Point(f * this.x, f * this.y);
	}

	angle() {
		return Math.atan2(this.y, this.x);
	}

	static absAngleDist = function(a1, a2) {
		return Math.min(Math.abs(a1-a2), Math.abs(a1-a2+2*Math.PI), Math.abs(a1-a2-2*Math.PI));
	}

	// from point on image to point on canvas, assuming rect is what part of the
	// image is shown in canvas, and scale is canvas pixels per image pixel.
	toDisplay(rect, scale) {
		return new Point(Math.round((this.x - rect.x) * scale), Math.round((this.y - rect.y) * scale));
	}

	// from point on canvas to point on image
	fromDisplay(rect, scale) {
		return new Point(Math.round(this.x / scale + rect.x), Math.round(this.y / scale + rect.y));
	}

	// array of points connecting p1 and p2
	static path(p1, p2) {
		var path = [p1];
		const w = p2.x - p1.x;
		const h = p2.y - p1.y;
		if (Math.abs(w) > Math.abs(h)) {
			const gradient = 1.0 * h / w;
			if (w > 0)
				for (var x = 1; x <= w; x++)
					path.push(new Point(p1.x + x, p1.y + Math.round(x * gradient)));
			else
				for (var x = -1; x >= w; x--)
					path.push(new Point(p1.x + x, p1.y + Math.round(x * gradient)));
		} else if (Math.abs(h) >= Math.abs(w) && h != 0) {
			const gradient = 1.0 * w / h;
			if (h > 0)
				for (var y = 1; y <= h; y++)
					path.push(new Point(p1.x + Math.round(y * gradient), p1.y + y));
			else
				for (var y = -1; y >= h; y--)
					path.push(new Point(p1.x + Math.round(y * gradient), p1.y + y));
		}
		return path;
	}

	// cylinder-like shape between the two points, with radius
	static cylinder(p1, p2, r) {
		if (p1.distance(p2) <= 0)
			return [];
		if (p1.x > p2.x) {
			const tmp = p1;
			p1 = p2;
			p2 = tmp;
		}
	}
}

Point.zero = new Point(0, 0);

class Point3D {
	x;
	y;
	z;
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	distance(p) {
		const dx = this.x - p.x;
		const dy = this.y - p.y;
		const dz = this.z - p.z;
		return Math.hypot(dx, dy, dz);
	}
}

class Matrix3D {
	m11; m12; m13;
	m21; m22; m23;
	m31; m32; m33;
	constructor(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
		this.m11 = m11; this.m12 = m12; this.m13 = m13;
		this.m21 = m21; this.m22 = m22; this.m23 = m23;
		this.m31 = m31; this.m32 = m32; this.m33 = m33;
	}

	map(v) {
		return new Point3D(this.m11 * v.x + this.m12 * v.y + this.m13 * v.z,
						this.m21 * v.x + this.m22 * v.y + this.m23 * v.z,
						this.m31 * v.x + this.m32 * v.y + this.m33 * v.z);
	}

	static rotateX(theta) {
		return new Matrix3D(1, 0, 0, 
							0, Math.cos(theta), -Math.sin(theta),
							0, Math.sin(theta), Math.cos(theta));
	}
	static rotateY(theta) {
		return new Matrix3D(Math.cos(theta), 0, Math.sin(theta), 
							0, 1, 0,
							-Math.sin(theta), 0, Math.cos(theta));
	}
	static rotateZ(theta) {
		return new Matrix3D(Math.cos(theta), -Math.sin(theta), 0,
							Math.sin(theta), Math.cos(theta), 0,
							0, 0, 1);
	}
}

class Rectangle {
	x;
	y;
	w;
	h;
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}

	size() {
		return this.w * this.h;
	}

	toDisplay(rect, scale) {
		const x = Math.round((this.x - rect.x) * scale);
		const y = Math.round((this.y - rect.y) * scale);
		const w = Math.round(this.w * scale);
		const h = Math.round(this.h * scale);
		return new Rectangle(x, y, w, h);
	}
	
	includes(p) {
		return this.x <= p.x && p.x < this.x + this.w &&
				this.y <= p.y && p.y < this.y + this.h;
	}

	overlaps(other) {
		return this.x <= other.x + other.w && other.x <= this.x + this.w &&
			this.y <= other.y + other.h && other.y <= this.y + this.h;
	}

	static bounding(points) {
		if (points.length == 0)
			return new Rectangle(0, 0, 0, 0);
		var xMin = Number.MAX_VALUE;
		var xMax = -Number.MAX_VALUE;
		var yMin = Number.MAX_VALUE;
		var yMax = -Number.MAX_VALUE;
		for (const p of points) {
			xMin = Math.min(xMin, p.x);
			xMax = Math.max(xMax, p.x);
			yMin = Math.min(yMin, p.y);
			yMax = Math.max(yMax, p.y);
		}
		return new Rectangle(xMin, yMin, xMax - xMin + 1, yMax - yMin + 1);
	}

	static boundingRects(rects) {
		const pointss = rects.map(r => 
			[new Point(r.x, r.y), 
				new Point(r.x + r.w - 1, r.y), 
				new Point(r.x, r.y + r.h - 1), 
				new Point(r.x + r.w - 1, r.y + r.h - 1)]);
		const points = [].concat(...pointss);
		return Rectangle.bounding(points);
	}
}

class Bezier {
	pFrom;
	pCtr1;
	pCtr2;
	pTo;
	constructor(pFrom, pCtr1, pCtr2, pTo) {
		this.pFrom = pFrom;
		this.pCtr1 = Ctr1;
		this.pCtr2 = Ctr2;
		this.pTo = pTo;
	}

	toDisplay(rect, scale) {
		return new Bezier(
				this.pFrom.toDisplay(rect, scale),
				this.pCtr1.toDisplay(rect, scale),
				this.pCtr2.toDisplay(rect, scale),
				this.pTo.toDisplay(rect, scale));
	}
}
