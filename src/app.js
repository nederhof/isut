const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const colors = require('colors');
const mongoose = require('mongoose');

app = express();

const baseUrl = process.env.BASE_URL;
const hostname = process.env.HOSTNAME;
const port = process.env.PORT || '20561';
const mongo_hostname = process.env.MONGO_HOSTNAME;
const mongo_port = process.env.MONGO_PORT;
const mongo_db = process.env.MONGO_DB;
const mongo_username = process.env.MONGO_USERNAME;
const mongo_password = process.env.MONGO_PASSWORD;

const SESSION_SECRET = 'sdk4o8ssdfhjldsfL234789aselajfkakfhfgjh';
app.use(
	session({
		resave: true,
		saveUninitialized: true,
		rolling: true,
		cookie: { maxAge: 24 * 60 * 60 * 1000 },
		secret: SESSION_SECRET,
	})
);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(baseUrl, express.static('public'));

const baseRouter = require('./routes/base');
app.use(baseUrl, baseRouter);
const adminRouter = require('./routes/admin');
baseRouter.use('/admin', adminRouter);
const textsRouter = require('./routes/texts');
baseRouter.use('/texts', textsRouter);
const textRouter = require('./routes/text');
baseRouter.use('/text', textRouter);
const pageRouter = require('./routes/page');
baseRouter.use('/page', pageRouter);
const signsRouter = require('./routes/signs');
baseRouter.use('/signs', signsRouter);

const mongoDB = mongo_username ? 
	`mongodb://${mongo_username}:${mongo_password}@${mongo_hostname}:${mongo_port}/${mongo_db}?authSource=admin` :
	`mongodb://${mongo_hostname}:${mongo_port}/${mongo_db}`;
mongoose.connect(mongoDB, { 
	connectTimeoutMS: 10000,
	useUnifiedTopology: true, 
	useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', () => {
	console.log('Database opened');
});
db.on('error', (err) => {
	console.error(colors.red('Database error' + err));
	process.exit(1);
});
db.on('disconnected', () => {
	console.error(colors.red('Database disconnected'));
	process.exit(1);
});

const server = http.createServer(app);
server.listen(port);
server.on('listening', () => {
	const addr = server.address();
	const bind = typeof addr === 'string' ? addr : addr.port;
	console.log(`Listening on ${bind}`); 
});
server.on('error', (error) => {
	if (error.code === 'EACCES') {
		console.error(colors.red(`Port ${port} requires elevated privileges`));
	} else if (error.code === 'EADDRINUSE') {
		console.error(colors.red(`Port ${port} already in use`)); 
	} else {
		console.error(colors.red('Could not start')); 
	}
	process.exit(1);
});
