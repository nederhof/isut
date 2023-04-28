const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classifySchema = new Schema({
	sign: String,
	text: Number,
	page: Number,
	line: Number,
	glyph: Number,
	ratio: Number,
	grid: [[Boolean]],
	pca: [Number],
}, { collection: 'classify' });

module.exports = mongoose.model('Classify', classifySchema);
