const Queue = require('better-queue');

const textsRoot = 'public/texts/';

const python = 'python3';

/* Is online web application, requiring password to log in? */
const online = true;

/* Recorded username if not online web application */
const defaultUser = 'noname';

function nestedTextDir(l) {
	var dir = textsRoot;
	for (var i = 0; i < l.length; i++)
		dir += l[i] + '/';
	return dir;
}

function nestedTextFile(l) {
	var dir = textsRoot;
	for (var i = 0; i < l.length; i++)
		dir += i < l.length - 1 ? l[i] + '/' : l[i];
	return dir;
}

function reportError(res, message) {
	const stackTrace = new Error().stack;
	const stack = stackTrace.split('\n');
	res.render('error', { message, stack });
}

function reportNotFound(res, descr) {
	const message = descr + ' no longer exists';
	res.render('notfound', { message });
}

function reportNotPermitted(res, message) {
	res.render('notpermitted', { message });
}

function reportNotLoggedIn(res) {
	res.render('notpermitted', { message: 'Not logged in' });
}

const textJobs = new Queue( async(job, cb) => {
	await job();
	cb();
});

function extendHistory(history, username) {
	const date = Date.now();
	if (history && history.length > 0) {
		if (history[history.length-1].username == username)
			history[history.length-1].date = date;
		else
			history.push({ username, date });
		return history;
	} else {
		return [{ username, date }];
	}
}

async function posOfIndex(objects, index) {
	for (var i = 0; i < objects.length; i++)
		if (objects[i].index == index)
			return i;
	return -1;
}

function regexpMatch(patt, field) {
	if (patt === '')
		return true;
	if (!field)
		return false;
	try {
		const regexp = new RegExp(patt.toLowerCase());
		return regexp.test(field.toLowerCase());
	} catch (e) {
		return false;
	}
}

function textMatches(text, textname, creator, provenance, period, genre) {
	const m1 = regexpMatch(textname, text.name);
	const m2 = regexpMatch(creator, text.creator);
	const m3 = regexpMatch(provenance, text.provenance);
	const m4 = regexpMatch(period, text.period);
	const m5 = regexpMatch(genre, text.genre);
	return m1 && m2 && m3 && m4 && m5;
}

function freqDist(a) {
	return a.reduce((acc, item) =>
		{ acc[item] = (acc[item] || 0) + 1; return acc; }, {});
}

module.exports = {
	python,
	online,
	defaultUser,
	textsRoot,
	nestedTextDir,
	nestedTextFile,
	reportError,
	reportNotFound,
	reportNotPermitted,
	reportNotLoggedIn,
	textJobs,
	extendHistory,
	posOfIndex,
	regexpMatch,
	textMatches,
	freqDist,
};
