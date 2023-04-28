const express = require('express');
const fs = require('fs-extra');
const multer = require('multer');

const util = require('./util');

const Text = require('../models/text');

const router = express.Router();

const formUpload = multer({ });
const ImageStore = require('./imagestore');

async function getNewPageIndex(text) {
	const pages = text.pages;
	var index = -1;
	for (var i = 0; i < pages.length; i++)
		index = Math.max(index, pages[i].index);
	return index + 1;
}

async function upload(_id, name, buffer, res, username) {
	var text = await Text.findOne({ _id }).lean();
	if (text) {
		const textIndex = text.index;
		const index = await getNewPageIndex(text);
		const dir = util.nestedTextDir([textIndex, index])
		await fs.ensureDir(dir);
		const store = new ImageStore(dir);
		await store.savePage(buffer);
		const lines = [];
		const page = { index, name, lines };
		const pages = text.pages.concat(page);
		const history = util.extendHistory(text.history, username);
		text = await Text.findOneAndUpdate({ _id }, 
			{ $set: { pages, history } }, { returnOriginal: false });
		res.redirect('../page/edit?_id=' + _id + '&index=' + index);
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
}

async function uploadimage(_id, index, type, buffer, res, username) {
	var text = await Text.findOne({ _id }).lean();
	if (text) {
		const pages = text.pages;
		const pos = await util.posOfIndex(pages, index);
		if (pos < 0) {
			util.reportNotFound(res, 'Page in ' + _id);
		} else if (type == 'full' || type == 'thumb') {
			util.reportError(res, 'Wrong type ' + type);
		} else {
			const textIndex = text.index;
			const dir = util.nestedTextDir([textIndex, index]);
			await fs.ensureDir(dir);
			const file = util.nestedTextFile([textIndex, index, type]);
			const store = new ImageStore(file);
			await store.saveFile(buffer);
			pages[pos].images = pages[pos].images.filter(t => t !== type).concat(type);
			const history = util.extendHistory(text.history, username);
			text = await Text.findOneAndUpdate({ _id }, 
				{ $set: { pages, history } }, { returnOriginal: false });
			res.redirect('../page/edit?_id=' + _id + '&index=' + index);
		}
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
}

async function deleteimage(_id, index, type, res, username) {
	var text = await Text.findOne({ _id }).lean();
	if (text) {
		const pages = text.pages;
		const pos = await util.posOfIndex(pages, index);
		if (pos < 0) {
			util.reportNotFound(res, 'Page in ' + _id);
		} else {
			const textIndex = text.index;
			const file = util.nestedTextFile([textIndex, index, type]) + '.png';
			await fs.remove(file);
			pages[pos].images = pages[pos].images.filter(t => t !== type);
			const history = util.extendHistory(text.history, username);
			text = await Text.findOneAndUpdate({ _id }, 
				{ $set: { pages, history } }, { returnOriginal: false });
			res.redirect('../page/edit?_id=' + _id + '&index=' + index);
		}
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
}

async function save(_id, page, added, removed, version, res, username) {
	var text = await Text.findOne({ _id }).lean();
	if (text) {
		const pages = text.pages;
		const pos = await util.posOfIndex(pages, page.index);
		if (pos < 0) {
			util.reportNotFound(res, 'Page in ' + _id);
		} else {
			pages[pos] = page;
			const history = util.extendHistory(text.history, username);
			text = await Text.findOneAndUpdate({ _id }, 
				{ $set: { pages, history } }, { returnOriginal: false });
			added.forEach(pathData => {
				const path = pathData.path;
				const data = pathData.data;
				const file = util.nestedTextFile(path) + '.png';
				const buf = Buffer.from(data, 'base64');
				fs.outputFileSync(file, buf);
			});
			removed.forEach(path => {
				if (path.length == 4) {
					const file = util.nestedTextFile(path) + '.png';
					fs.removeSync(file);
				} else if (path.length == 3) {
					const dir = util.nestedTextDir(path);
					fs.removeSync(dir);
				}
			});
			res.status(200).send(version);
		}
	} else {
		res.status(404).send('Text ' + _id + 'not found');
	}
}

async function deletePage(_id, index, res, username) {
	var text = await Text.findOne({ _id }).lean();
	if (text) {
		const pages = text.pages;
		const pos = await util.posOfIndex(pages, index);
		if (pos < 0) {
			util.reportNotFound(res, 'Page in ' + _id);
		} else {
			pages.splice(pos, 1);
			const history = util.extendHistory(text.history, username);
			text = await Text.findOneAndUpdate({ _id }, 
				{ $set: { pages, history } }, { returnOriginal: false });
			const textIndex = text.index;
			const dir = util.nestedTextDir([textIndex, index])
			await fs.remove(dir);
			res.redirect('../text/view?_id=' + _id);
		}
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
}

async function up(_id, index, res, username) {
	var text = await Text.findOne({ _id }).lean();
	if (text) {
		const pages = text.pages;
		const pos = await util.posOfIndex(pages, index);
		if (pos < 0) {
			util.reportNotFound(res, 'Page in ' + _id);
		} else {
			if (pos > 0) {
				const page = pages[pos];
				const previousPage = pages[pos-1];
				pages[pos-1] = page;
				pages[pos] = previousPage;
				const history = util.extendHistory(text.history, username);
				text = await Text.findOneAndUpdate({ _id }, 
					{ $set: { pages, history } }, { returnOriginal: false });
			}
			res.redirect('../text/view?_id=' + _id);
		}
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
}

async function down(_id, index, res, username) {
	var text = await Text.findOne({ _id }).lean();
	if (text) {
		const pages = text.pages;
		const pos = await util.posOfIndex(pages, index);
		if (pos < 0) {
			util.reportNotFound(res, 'Page in ' + _id);
		} else {
			if (pos < pages.length - 1) {
				const page = pages[pos];
				const nextPage = pages[pos+1];
				pages[pos+1] = page;
				pages[pos] = nextPage;
				const history = util.extendHistory(text.history, username);
				text = await Text.findOneAndUpdate({ _id }, 
					{ $set: { pages, history } }, { returnOriginal: false });
			}
			res.redirect('../text/view?_id=' + _id);
		}
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
}

router.get('/view', async (req, res) => {
	if (!req.query || !req.query._id || !req.query.index) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.query._id;
	const index = req.query.index;
	const lineindex = req.query.lineindex ? req.query.lineindex : -1;
	const glyphindex = req.query.glyphindex ? req.query.glyphindex : -1;
	const text = await Text.findOne({ _id }).lean();
	if (text) {
		const pages = text.pages;
		const pos = await util.posOfIndex(pages, index);
		if (pos < 0) {
			util.reportNotFound(res, 'Page in ' + _id);
		} else {
			const prev = pos > 0 ? pages[pos-1].index : -1;
			const next = pos < pages.length-1 ? pages[pos+1].index : -1;
			const page = pages[pos];
			const username = req.session.username;
			const role = req.session.role;
			const online = util.online;
			res.render('viewpage', { username, role, online, text, page, lineindex, glyphindex,
				prev, next });
		}
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
});

router.get('/edit', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.query || !req.query._id || !req.query.index) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.query._id;
	const index = req.query.index;
	const lineindex = req.query.lineindex ? req.query.lineindex : -1;
	const glyphindex = req.query.glyphindex ? req.query.glyphindex : -1;
	const text = await Text.findOne({ _id }).lean();
	if (text) {
		const pages = text.pages;
		const pos = await util.posOfIndex(pages, index);
		if (pos < 0) {
			util.reportNotFound(res, 'Page in ' + _id);
		} else {
			const prev = pos > 0 ? pages[pos-1].index : -1;
			const next = pos < pages.length-1 ? pages[pos+1].index : -1;
			const page = pages[pos];
			const username = req.session.username;
			const role = req.session.role;
			const online = util.online;
			res.render('editpage', { username, role, online, text, page, lineindex, glyphindex,
				prev, next });
		}
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
});

router.post('/upload', formUpload.single('file'), async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.file || !req.file.mimetype || !req.file.mimetype.startsWith('image') ||
			req.file.mimetype == 'image/x-portable-pixmap' ||
			!req.body._id) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const name = req.body.name ? req.body.name : '';
	util.textJobs.push(async () => { await upload(_id, name, req.file.buffer, res, req.session.username); });
});

router.post('/imageupload', formUpload.single('file'), async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.file || !req.file.mimetype || !req.file.mimetype.startsWith('image') ||
			req.file.mimetype == 'image/x-portable-pixmap' ||
			!req.body._id || !req.body.index || !req.body.type) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const index = req.body.index;
	const type = req.body.type;
	util.textJobs.push(async () => { await uploadimage(_id, index, type, req.file.buffer, res, req.session.username); });
});

router.post('/save', formUpload.none(), async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id || 
			!req.body.page || !req.body.added || !req.body.removed || !req.body.version) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const page = JSON.parse(req.body.page);
	const added = JSON.parse(req.body.added);
	const removed = JSON.parse(req.body.removed);
	const version = req.body.version;
	util.textJobs.push(async () => { await save(_id, page, added, removed, version, res, req.session.username); });
});

router.post('/create', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const text = await Text.findOne({ _id }).lean();
	if (text) {
		const username = req.session.username;
		const role = req.session.role;
		const online = util.online;
		res.render('createpage', { username, role, online, text });
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
});

router.post('/delete', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id || !req.body.index) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const index = req.body.index;
	util.textJobs.push(async () => { await deletePage(_id, index, res, req.session.username); });
});

router.post('/up', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id || !req.body.index) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const index = req.body.index;
	util.textJobs.push(async () => { await up(_id, index, res, req.session.username); });
});

router.post('/down', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id || !req.body.index) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const index = req.body.index;
	util.textJobs.push(async () => { await down(_id, index, res, req.session.username); });
});

router.post('/addimage', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id || !req.body.index) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const index = req.body.index;
	const text = await Text.findOne({ _id }).lean();
	if (text) {
		const pages = text.pages;
		const pos = await util.posOfIndex(pages, index);
		if (pos < 0) {
			util.reportNotFound(res, 'Page in ' + _id);
		} else {
			const page = pages[pos];
			const username = req.session.username;
			const role = req.session.role;
			const online = util.online;
			res.render('addimage', { username, role, online, text, page });
		}
	} else {
		util.reportNotFound(res, 'Text ' + _id);
	}
});

router.post('/deleteimage', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body || !req.body._id || !req.body.index || !req.body.type) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const _id = req.body._id;
	const index = req.body.index;
	const type = req.body.type;
	util.textJobs.push(async () => { await deleteimage(_id, index, type, res, req.session.username); });
});

module.exports = router;
