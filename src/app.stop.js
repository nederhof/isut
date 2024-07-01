const io = require('socket.io-client');

const port = process.env.PORT || 3000;
const socketClient = io.connect(`http://localhost:${port}`);

socketClient.on('connect', () => {
	socketClient.emit('npmStop');
	setTimeout(() => {
		process.exit(0);
	}, 1000);
});
