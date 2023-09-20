const express = require('express');

const util = require('./util');

const Text = require('../models/text');

const router = express.Router();

async function allTexts() {
	return await Text.find({ }).lean();
}

async function selectTexts(name, creator, provenance, period, genre) {
	const all = await allTexts();
	var texts = [];
	for (let i = 0; i < all.length; i++) {
		const text = all[i];
		if (util.textMatches(text, name, creator, provenance, period, genre)) 
			texts.push(text);
	}
	texts.sort((t1,t2) => t1.name.localeCompare(t2.name));
	return texts;
}

router.get('/view', async (req, res) => {
	if (!util.online) {
		req.session.username = util.defaultUser;
		req.session.role = 'editor';
		req.session.texts = '';
	}
	const name = req.query && req.query.name ? req.query.name.trim() : '';
	const creator = req.query && req.query.creator ? req.query.creator.trim() : '';
	const provenance = req.query && req.query.provenance ? req.query.provenance.trim() : '';
	const period = req.query && req.query.period ? req.query.period.trim() : '';
	const genre = req.query && req.query.genre ? req.query.genre.trim() : '';
	const texts = await selectTexts(name, creator, provenance, period, genre);
	const username = req.session.username;
	const role = req.session.role;
	const online = util.online;
	await res.render('texts', { username, role, online, texts, name, creator, provenance, period, genre });
});

module.exports = router;
