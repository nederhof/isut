const express = require('express');
const fs = require('fs-extra');
const multer = require('multer');
const { spawn } = require('child_process');

const util = require('./util');
const unipoints = require('./unipoints');

const Text = require('../models/text');

const formUpload = multer({ });

const UniHiero = unipoints.UniHiero;
const unihiero = new UniHiero();

const router = express.Router();

async function allTexts() {
	return await Text.find({ }).lean();
}

async function findTokens(textPred, glyphPred) {
	var tokens = [];
	const all = await allTexts();
	for (let i = 0; i < all.length; i++) {
		const text = all[i];
		const textname = text.name;
		const provenance = text.provenance;
		const period = text.period;
		const genre = text.genre;
		const _id = text._id;
		if (textPred(text))
			for (const page of text.pages)
				for (const line of page.lines)
					for (const glyph of line.glyphs)
						if (glyphPred(glyph)) {
							const name = unihiero.nameToText(glyph.name);
							const path = [text.index, page.index, line.index, glyph.index];
							tokens.push({ name, path, _id, textname, provenance, period, genre });
						}
	}
	return tokens;
}

async function findSignRecords(textPred, glyphPred, context) {
	var signRecords = {};
	const all = await allTexts();
	for (let i = 0; i < all.length; i++) {
		const text = all[i];
		const _id = text._id;
		if (textPred(text))
			for (const page of text.pages)
				for (const line of page.lines)
					for (const glyph of line.glyphs) {
						if (glyphPred(glyph)) {
							const path = [text.index, page.index, line.index, glyph.index];
							if (!(glyph.name in signRecords))
								signRecords[glyph.name] = {
									name: glyph.name,
									text: unihiero.nameToText(glyph.name),
									texts: unihiero.nameToTexts(glyph.name),
									tokens: [] };
							if (context)
								signRecords[glyph.name].tokens.push({
									_id, path, textname: text.name, linename: line.name,
									position: glyph.position });
							else
								signRecords[glyph.name].tokens.push({
									_id, path, textname: text.name, linename: line.name });
						}
					}
		
	}
	return signRecords;
}

router.get('/list', async (req, res) => {
	const signname = req.query && req.query.signname ? req.query.signname.trim() : '';
	const textname = req.query && req.query.textname ? req.query.textname.trim() : '';
	const creator = req.query && req.query.creator ? req.query.creator.trim() : '';
	const provenance = req.query && req.query.provenance ? req.query.provenance.trim() : '';
	const period = req.query && req.query.period ? req.query.period.trim() : '';
	const genre = req.query && req.query.genre ? req.query.genre.trim() : '';
	const context = req.query && req.query.context ? req.query.context : '';
	const signnames = signname.length > 0 ? signname.split(/\s+/) : [];
	const glyphnames = signnames.map(n => unihiero.textToName(n));
	const all = await allTexts();
	if ('signname' in req.query) {
		const textPred = function (text) {
			return util.textMatches(text, textname, creator, provenance, period, genre);
		};
		const glyphPred = function (glyph) {
			if (glyphnames.length == 0 && textname.length > 0)
				return true;
			else
				for (let i = 0; i < glyphnames.length; i++) {
					const glyphname = glyphnames[i];
					if (glyph.name.indexOf(glyphname) >= 0)
						return true;
				}
			return false;
		};
		var signRecords = await findSignRecords(textPred, glyphPred, context);
	} else {
		var signRecords = {};
	}
	var signs = Object.values(signRecords);
	signs.sort((r1, r2) => {
		const cmp = UniHiero.cmpTexts(r1.texts, r2.texts);
		if (cmp != 0)
			return cmp;
		else
			return r1.name.localeCompare(r2.name);
	});
	const username = req.session.username;
	const role = req.session.role;
	const online = util.online;
	await res.render('signs', { username, role, online,
				signname, textname, creator, provenance, period, genre, signs, context });
});

router.get('/overview', async (req, res) => {
	const signname = req.query && req.query.signname ? req.query.signname.trim() : '';
	const textname = req.query && req.query.textname ? req.query.textname.trim() : '';
	const creator = req.query && req.query.creator ? req.query.creator.trim() : '';
	const provenance = req.query && req.query.provenance ? req.query.provenance.trim() : '';
	const period = req.query && req.query.period ? req.query.period.trim() : '';
	const genre = req.query && req.query.genre ? req.query.genre.trim() : '';
	const context = req.query && req.query.context ? req.query.context : '';
	const signnames = signname.length > 0 ? signname.split(/\s+/) : [];
	const glyphnames = signnames.map(n => unihiero.textToName(n));
	const all = await allTexts();
	const textPred = function (text) {
		return util.textMatches(text, textname, creator, provenance, period, genre);
	};
	const glyphPred = function (glyph) {
		if (glyphnames.length == 0)
			return true;
		else
			for (let i = 0; i < glyphnames.length; i++) {
				const glyphname = glyphnames[i];
				if (glyph.name.indexOf(glyphname) >= 0)
					return true;
			}
		return false;
	};
	var signRecords = await findSignRecords(textPred, glyphPred, context);
	var textNames = new Set();
	var signFrequencies = Object.values(signRecords).map(r => {
		const name = r.name; 
		const text = r.text; 
		const texts = r.texts; 
		const signTexts = r.tokens.map(t => t.textname);
		const freqs = util.freqDist(signTexts);
		signTexts.forEach(t => textNames.add(t));
		return { name, text, texts, freqs }; 
	});
	signFrequencies.sort((r1, r2) => {
		const cmp = UniHiero.cmpTexts(r1.texts, r2.texts);
		if (cmp != 0)
			return cmp;
		else
			return r1.name.localeCompare(r2.name);
	});
	textNames = Array.from(textNames).sort();
	const username = req.session.username;
	const role = req.session.role;
	const online = util.online;
	await res.render('overview', { username, role, online,
				signname, textname, creator, provenance, period, genre, textNames, signFrequencies });
});

router.get('/analysis', async (req, res) => {
	const signname = req.query && req.query.signname ? req.query.signname.trim() : '';
	const textname = req.query && req.query.textname ? req.query.textname.trim() : '';
	const creator = req.query && req.query.creator ? req.query.creator.trim() : '';
	const provenance = req.query && req.query.provenance ? req.query.provenance.trim() : '';
	const period = req.query && req.query.period ? req.query.period.trim() : '';
	const genre = req.query && req.query.genre ? req.query.genre.trim() : '';
	const method = req.query && req.query.method ? req.query.method : 'PCA';
	const dimension = req.query && req.query.dimension ? req.query.dimension : '2';
	const signnames = signname.length > 0 ? signname.split(/\s+/) : [];
	const glyphnames = signnames.map(n => unihiero.textToName(n));
	const textPred = function (text) {
		return util.textMatches(text, textname, creator, provenance, period, genre);
	};
	const glyphPred = function (glyph) {
		return glyphnames.indexOf(glyph.name) >= 0;
	};
	const tokens = glyphnames.length ? await findTokens(textPred, glyphPred) : [];
	var embeddings = [];
	var message = '';
	const username = req.session.username;
	const role = req.session.role;
	const online = util.online;

	if (tokens.length == 0) {
		res.render('analysis', { message,
			signname, textname, creator, provenance, period, genre,
			method, dimension, embeddings, username, role, online });
		return;
	}

	const tokensStr = JSON.stringify(tokens);
	const process = spawn(util.python, ['./python/reduction.py', method, dimension, tokensStr]);

	process.stdout.on('data', (data) => {
		const file = data.toString();
		embeddings = fs.readJsonSync(file);
		fs.removeSync(file);
	});

	process.stderr.on('data', (data) => {
		message = 'Only ' + tokens.length + ' token(s) found';
	});

	process.on('close', (code) => {
		res.render('analysis', { message,
			signname, textname, creator, provenance, period, genre,
			method, dimension, embeddings, username, role, online });
	});

	process.stdin.end();
});

router.get('/guess', async (req, res) => {
	if (!req.query || !req.query.text || !req.query.page || !req.query.line || !req.query.glyph ) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const text = req.query.text;
	const page = req.query.page;
	const line = req.query.line;
	const glyph = req.query.glyph;

	const process = spawn(util.python, ['./python/classification.py', text, page, line, glyph]);

	var name = '';
	var error = '';

	process.stdout.on('data', (data) => {
		name = data;
	});

	process.stderr.on('data', (data) => {
		error = data;
	});

	process.on('close', (code) => {
		if (error)
			res.status(404).send(error);
		else
			res.status(200).send(name);
	});

	process.stdin.end();
});

router.get('/guesser', async (req, res) => {
	const username = req.session.username;
	const online = util.online;
	await res.render('guesser', { username, online });
});

router.post('/classify', formUpload.none(), async (req, res) => {
	if (!req.body || !req.body.sign) {
		res.status(404).send('Ill-formed request');
		return;
	}
	const sign = req.body.sign;
	var results = [];
	var message = '';

	const process = spawn(util.python, ['./python/guess.py', sign]);

	process.stdout.on('data', (data) => {
		results = JSON.parse(data.toString());
	});

	process.stderr.on('data', (data) => {
		message = data.toString();
	});

	process.on('close', (code) => {
		if (message != '')
			res.status(404).json({ message });
		else
			res.status(200).json(results);
	});

	process.stdin.end();
});

module.exports = router;
