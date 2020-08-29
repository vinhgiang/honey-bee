const router = require('express').Router();
const ChatBotController = require('../controllers/ChatBotController');

router.get('/', (req, res) => res.send("Hello word!"));
router.get('/webhook', ChatBotController.verifyWebhook);
router.post('/webhook', ChatBotController.processMsg);

module.exports = router;