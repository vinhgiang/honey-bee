const router = require('express').Router();

router.get('/', (req, res) => res.send("Hello word!"));

module.exports = router;