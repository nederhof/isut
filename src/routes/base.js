var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
	res.redirect('texts/view');
});

module.exports = router;
