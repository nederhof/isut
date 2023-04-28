const sharp = require('sharp');

const PAGE_LIMIT = 11000;
const THUMB_LIMIT = 300;
const GLYPH_LIMIT = 1000;

class ImageStore {
	constructor(path) {
		this.path = path;
	}

	async savePage(buffer) {
		const fullname = this.path + 'full.png';
		const thumbname = this.path + 'thumb.png';
		await this.store(buffer, fullname, PAGE_LIMIT);
		await this.store(buffer, thumbname, THUMB_LIMIT);
	}

	async saveFile(buffer) {
		const fullname = this.path + '.png';
		await this.store(buffer, fullname, PAGE_LIMIT);
	}

	async saveGlyph(buffer) {
		const fullname = this.path + '.png';
		await this.store(buffer, fullname, GLYPH_LIMIT);
	}

	async store(buffer, filename, limit) {
		await sharp(buffer)
			.resize(limit, limit, { fit: sharp.fit.inside, withoutEnlargement: true })
			.toFile(filename);
	}
}

module.exports = ImageStore;
