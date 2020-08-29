const router = require('express').Router();
const ChatBotController = require('../controllers/ChatBotController');

router.get('/', (req, res) => res.send("Hello word!"));
router.get('/webhook', ChatBotController.getWebhook);
router.post('/webhook', ChatBotController.postWebhook);

module.exports = router;