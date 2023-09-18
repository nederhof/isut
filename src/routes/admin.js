const express = require('express');
const bcrypt = require('bcrypt');

const util = require('./util');

const SALT = require('./salt');

const User = require('../models/userschema');

const router = express.Router();

router.get('/login', async (req, res) => {
	res.render('login', { username: '', message: '', online: true });
});

router.post('/login', async (req, res) => {
	if (!req.body.username || !req.body.password) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const username = (req.body.username || '').trim();
	const password = (req.body.password || '').trim();
	if (username == '') {
		res.render('login', { username, message: 'Username missing' });
	} else if (password == '') {
		res.render('login', { username, message: 'Password missing' });
	} else {
		const hashed = bcrypt.hashSync(password, SALT);
		const record = await User.findOne({ username, hashed });
		if (record) {
				req.session.username = username;
				req.session.role = record.role;
				req.session.texts = record.texts;
				res.redirect('../texts/view');
		} else {
			res.render('login', { username, message: 'Username/password not recognized', online: true });
		}
	}
});

router.post('/logout', async (req, res) => {
	req.session.username = '';
	req.session.role = '';
	req.session.texts = '';
	res.status(200).end();
});

router.get('/users', async (req, res) => {
	const username = req.session.username;
	const role = req.session.role;
	if (!username) {
		util.reportNotLoggedIn(res);
		return;
	}
	const user = await User.findOne({ username }).lean();
	if (!user) {
		util.reportNotFound(res, 'User ' + username);
		return;
	}
	const name = user.name;
	const online = util.online;
	const others = await User.find({ username: { $ne: username } }).sort('username').lean();
	res.render('users', { username, name, role, online, others });
});

router.post('/update', async (req, res) => {
	if (!req.body.username || !req.body.texts) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	await User.updateOne({ username: req.body.username }, 
		{ $set: { texts: req.body.texts } });
	const username = req.session.username;
	const role = req.session.role;
	if (!username) {
		util.reportNotLoggedIn(res);
		return;
	}
	const user = await User.findOne({ username }).lean();
	if (!user) {
		util.reportNotFound(res, 'User ' + username);
		return;
	}
	const name = user.name;
	const online = util.online;
	const others = await User.find({ username: { $ne: username } }).sort('username').lean();
	res.render('users', { username, name, role, online, others });
});

router.post('/user', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body.username) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const username = req.body.username;
	const name = req.body.name ? req.body.name : '';
	if (req.body.password1) {
		const password = req.body.password1;
		const hashed = bcrypt.hashSync(password, SALT);
		await User.updateOne({ username }, { $set: { name, hashed } });
	} else {
		await User.updateOne({ username }, { $set: { name } });
	}
	res.redirect('../admin/users');
});

router.get('/add', async (req, res) => {
	const username = req.session.username;
	const role = req.session.role;
	if (!username) {
		util.reportNotLoggedIn(res);
		return;
	}
	const message = '';
	const usernameNew = '';
	const nameNew = '';
	const roleNew = 'contributor';
	const online = util.online;
	res.render('adduser', { message, username, role, online, usernameNew, nameNew, roleNew });
});

router.post('/add', async (req, res) => {
	const username = req.session.username;
	const role = req.session.role;
	if (!username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body.role || ['contributor', 'editor'].indexOf(req.body.role) < 0 ||
		!req.body.username || !req.body.password1) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const usernameNew = req.body.username;
	const nameNew = req.body.name ? req.body.name : '';
	const roleNew = req.body.role;
	const password = req.body.password1;
	const user = await User.findOne({ username: usernameNew }).lean();
	if (user) {
		const message = 'Existing username: ' + usernameNew;
		const online = util.online;
		res.render('adduser', { message, username, role, online, usernameNew, nameNew, roleNew });
	} else {
		const hashed = bcrypt.hashSync(password, SALT);
		await User.create({ username: usernameNew, name: nameNew, hashed, role: roleNew, texts: '' });
		res.redirect('../admin/users');
	}
});

router.post('/remove', async (req, res) => {
	if (!req.session.username) {
		util.reportNotLoggedIn(res);
		return;
	}
	if (!req.body.username) {
		util.reportError(res, 'Ill-formed request');
		return;
	}
	const username = req.body.username;
	await User.deleteOne({ username });
	res.redirect('../admin/users');
});

router.get('/about', async (req, res) => {
	const username = req.session.username;
	const role = req.session.role;
	const online = util.online;
	res.render('about', { username, role, online });
});

router.get('/help', async (req, res) => {
	const username = req.session.username;
	const role = req.session.role;
	const online = util.online;
	res.render('help', { username, role, online });
});

module.exports = router;
