const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
	username: { type: String, unique: true, required: true },
	name: { type: String, default: '' },
	hashed: { type: String, required: true },
	role: { type: String, enum: ['editor', 'contributor'], required: true },
	texts: { type: String, default: '' },
}, { collection: 'user' });

module.exports = mongoose.model('User', userSchema);
