const router = require('express').Router();
const ChatBotController = require('../controllers/ChatBotController');

router.get('/', (req, res) => res.send("Please chat with me at https://www.facebook.com/Honey-Bee-118412966651650"));
router.get('/webhook', ChatBotController.verifyWebhook);
router.post('/webhook', ChatBotController.processMsg);

module.exports = router;