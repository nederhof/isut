const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pointSchema = new Schema({
	x: Number,
	y: Number,
}, { _id : false });

const squareSchema = new Schema({
	x: Number,
	y: Number,
	w: Number,
	h: Number,
}, { _id : false });

const glyphSchema = new Schema({
	index: Number,
	name: { type: String, default: '' },
	position: { type: squareSchema, required: true },
}, { _id : false });

const lineSchema = new Schema({
	index: Number,
	name: { type: String, default: '' },
	points: { type: [pointSchema], default: [] },
	direction: { type: String, enum: ['hlr', 'hrl', 'vlr', 'vrl'], default: 'hlr' },
	glyphs: { type: [glyphSchema], default: [] },
}, { _id : false });

const pageSchema = new Schema({
	index: Number,
	name: { type: String, default: '' },
	type: { type: String, default: '' },
	images: [{ type: String }],
	lines: { type: [lineSchema], default: [] },
}, { _id : false });

const editSchema = new Schema({
	username: { type: String },
	date: { type: Date },
}, { _id : false });

const textSchema = new Schema({
	index: Number,
	name: { type: String, default: '' },
	creator: { type: String, default: '' },
	provenance: { type: String, default: '' },
	period: { type: String, default: '' },
	genre: { type: String, default: '' },
	notes: { type: String, default: '' },
	pages: { type: [pageSchema], default: [] },
	history: { type: [editSchema], default: [] },
}, { collection: 'text' });

module.exports = mongoose.model('Text', textSchema);
