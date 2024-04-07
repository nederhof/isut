const express = require('express');
const fs = require('fs-extra');
const admzip = require('adm-zip');
const multer = require('multer');
const archiver = require('archiver');

const util = require('./util');

const Text = require('../models/text');

const router = express.Router();

const formUpload = multer({ });

async function historyOf(_id) {
	const text = await Text.findOne({ _id }).lean();
	return text && text.history ? text.history : [];
}

async function getNewTextIndex() {
	const texts = await Text.find({ }).lean();
	var index = -1;
	for (var i = 0; i < texts.length; i++)
		index = Math.max(index, texts[i].index);
	return index + 1;
}

async function createText(req, res) {
	const index = await getNewTextIndex();
	const dir = util.nestedTextDir([index]);
	await fs.ensureDir(dir);
	const text = await Text.create({ index,
			name: '', creator: '', provenance: '', period: '', genre: '', notes: '', pages: [], history: [] });
	const username = req.session.username;
	const role = req.session.role;
	const online = util.online;
	const edit = util.mayEditText(req, text);
	res.render('text', { username, role, edit, online, text });
}

async function deleteText(_id, res) {
	const text = await Text.findOneAndRemove({ _id }).lean();
	if (text) {
		const dir = util.nestedTextDir([text.index]);
		await fs.remove(dir);
		res.redirect('../texts/view');
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
}

async function upload(buffer, res) {
	const zip = new admzip(buffer);
	try {
		const record = JSON.parse(zip.readAsText('text.json'));
		const index = await getNewTextIndex();
		record.index = index;
		const text = await Text.create(record);
		zip.deleteFile('text.json');
		zip.extractAllTo('public/texts/' + index);
		res.redirect('../text/view?_id=' + text._id);
	} catch (e) {
		util.reportError(res, e);
	}
}

async function uploads(files, res) {
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const zip = new admzip(file.buffer);
		try {
			const record = JSON.parse(zip.readAsText('text.json'));
			const index = await getNewTextIndex();
			record.index = index;
			const text = await Text.create(record);
			zip.deleteFile('text.json');
			zip.extractAllTo('public/texts/' + index);
		} catch (e) {
			util.reportError(res, 'Not an appropriate zip file compatible with Isut');
			return;
		}
	}
	res.redirect('../texts/view');
}

router.get('/view', async (req, res) => {
	if (!req.query || (!req.query._id && !req.query.textindex)) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.query._id;
	const textindex = req.query.textindex;
	const text = _id ? await Text.findOne({ _id }).lean() : await Text.findOne({ index: textindex }).lean();
	if (text) {
		const username = req.session.username;
		const role = req.session.role;
		const online = util.online;
		const edit = util.mayEditText(req, text);
		res.render('text', { username, role, edit, online, text });
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
});

router.post('/save', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const name = req.body.name ? req.body.name.trim() : '';
	const creator = req.body.creator ? req.body.creator.trim() : '';
	const provenance = req.body.provenance ? req.body.provenance.trim() : '';
	const period = req.body.period ? req.body.period.trim() : '';
	const genre = req.body.genre ? req.body.genre.trim() : '';
	const notes = req.body.notes ? req.body.notes.trim() : '';
	const history = util.extendHistory(await historyOf(_id), req.session.username);
	var text = await Text.findOneAndUpdate({ _id },
		{ $set: { name, creator, provenance, period, genre, notes, history } }, { returnOriginal: false });
	if (text)
		res.redirect('../text/view?_id=' + _id);
	else
		util.reportNotFound(res, 'Text ' + _id);
});

router.post('/create', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	util.textJobs.push(async () => { await createText(req, res); });
});

router.post('/delete', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	util.textJobs.push(async () => { await deleteText(_id, res); });
});

router.get('/download', async (req, res) => {
	if (!req.query || (!req.query._id && !req.query.textindex)) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.query._id;
	const index = req.query.index;
	const text = _id ? await Text.findOne({ _id }).lean() : null;
	delete text._id;
	delete text.__v;
	delete text.index;
	const zipname = text.name.replace(/\s/g, '') + '.zip';
	if (text) {
		const zipper = archiver('zip');
		zipper.pipe(res);
		res.setHeader('Content-type', 'application/zip');
		res.setHeader('Content-disposition', 'attachment; filename=' + zipname);
		zipper.directory('../src/public/texts/' + index, '');
		zipper.append(JSON.stringify(text), { name: 'text.json' });
		zipper.finalize();
	} else {
		util.reportError(res, 'Cannot find text ' + _id);
	}
});

router.get('/upload', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	const username = req.session.username;
	const role = req.session.role;
	const online = util.online;
	await res.render('uploadtext', { username, role, online });
});

router.post('/upload', formUpload.single('file'), async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.file || !req.file.mimetype || req.file.mimetype != 'application/zip') {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	util.textJobs.push(async () => { await upload(req.file.buffer, res); });
});

router.post('/uploads', formUpload.array('file', 500), async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.files) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	for (let i = 0; i < req.files.length; i++)
		if (!req.files[i].mimetype || req.files[i].mimetype != 'application/zip') {
			util.reportError(res, 'Ill-formed request');
			return;
		}
	util.textJobs.push(async () => { await uploads(req.files, res); });
});

router.get('/history', async (req, res) => {
	if (!req.query || !req.query._id) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	const _id = req.query._id;
	const text = _id ? await Text.findOne({ _id }).lean() : null;
	if (text) {
		const username = req.session.username;
		const role = req.session.role;
		const online = util.online;
		res.render('history', { username, role, online, text });
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
});

router.post('/history', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id || !req.body.editstring) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const editstring = req.body.editstring;
	const edits = JSON.parse(editstring);
	const history = edits.map(e => ({ username: e.username, date: new Date(e.date) }));
	var text = await Text.findOneAndUpdate({ _id }, 
			{ $set: { history } })
	if (text)
		res.redirect('../text/view?_id=' + _id);
	else
		util.reportNotFound(res, 'Text ' + _id);
});

module.exports = router;
