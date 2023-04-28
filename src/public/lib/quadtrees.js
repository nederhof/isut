class Quadtree {
	// M is minimum size of areas
	// N is maximum number of leaves
	constructor(rect, M, N) {
		this.M = M;
		this.N = N;
		this.rect = rect;
		this.rects = [];
		this.nw = null;
		this.ne = null;
		this.sw = null;
		this.se = null;
	}

	insert(rect, obj) {
		if (!this.rect.overlaps(rect)) {
			return;
		}
		this.rects.push({ rect, obj });
		if (!this.nw && this.rects.length > this.N && rect.w/2 >= this.M && rect.h/2 >= this.M) {
			const xWest = this.rect.x;
			const wWest = Math.floor(this.rect.w / 2);
			const xEast = xWest + wWest;
			const wEast = this.rect.w - wWest;
			const yNorth = this.rect.y;
			const hNorth = Math.floor(this.rect.h / 2);
			const ySouth = yNorth + hNorth;
			const hSouth = this.rect.h - hNorth;
			this.nw = new Quadtree(new Rectangle(xWest, yNorth, wWest, hNorth), this.M, this.N);
			this.ne = new Quadtree(new Rectangle(xEast, yNorth, wEast, hNorth), this.M, this.N);
			this.sw = new Quadtree(new Rectangle(xWest, ySouth, wWest, hSouth), this.M, this.N);
			this.se = new Quadtree(new Rectangle(xEast, ySouth, wEast, hSouth), this.M, this.N);
		}
		if (this.nw) {
			for (const pair of this.rects) {
				this.nw.insert(pair.rect, pair.obj);
				this.ne.insert(pair.rect, pair.obj);
				this.sw.insert(pair.rect, pair.obj);
				this.se.insert(pair.rect, pair.obj);
			}
			this.rects = [];
		}
	}

	findRect(rect) {
		if (!this.rect.overlaps(rect)) {
			return new Set();
		}
		var objs = new Set();
		if (this.nw) {
			this.nw.findRect(rect).forEach(obj => objs.add(obj));
			this.ne.findRect(rect).forEach(obj => objs.add(obj));
			this.sw.findRect(rect).forEach(obj => objs.add(obj));
			this.se.findRect(rect).forEach(obj => objs.add(obj));
		} else {
			this.rects.forEach(pair => { if (pair.rect.overlaps(rect)) objs.add(pair.obj); });
		}
		return objs;
	}

	findPoint(p) {
		if (!this.rect.includes(p)) {
			return new Set();
		}
		var objs = new Set();
		if (this.nw) {
			this.nw.findPoint(p).forEach(obj => objs.add(obj));
			this.ne.findPoint(p).forEach(obj => objs.add(obj));
			this.sw.findPoint(p).forEach(obj => objs.add(obj));
			this.se.findPoint(p).forEach(obj => objs.add(obj));
		} else {
			this.rects.forEach(pair => { if (pair.rect.includes(p)) objs.add(pair.obj); });
		}
		return objs;
	}
}
