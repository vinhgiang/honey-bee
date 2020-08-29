const axios = require('axios');

const verifyWebhook = (req, res) => {
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
}

const processMsg = (req, res) => {
    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {

            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            let webhook_event = entry.messaging[0];

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                console.log('Sender PSID: ' + sender_psid, 'msg', webhook_event.message);
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
}

function firstTrait(nlp, name) {
    return nlp && nlp.entities && nlp.traits[name] && nlp.traits[name][0];
}

const handleMessage = (sender_psid, received_message) => {
    const entitiesArr = [ "greetings", "thanks", "bye" ];
    let response;
    let msg = received_message.text;
    let answer;
    let entityChosen = "";

    // check greeting is here and is confident
    const greeting = firstTrait(received_message.nlp, 'wit$greetings');
    if (greeting && greeting.confidence > 0.8) {
        console.log(greeting, greeting.confidence);
        console.log('Hi there!');
    } else {
        // default logic
    }

    /*if(entityChosen === ""){
        //default
        callSendAPI(sender_psid,`The bot is needed more training, try to say "thanks a lot" or "hi" to the bot` );
    }else{
        if(entityChosen === "greetings"){
            //send greetings message
            callSendAPI(sender_psid,'Hi there! This bot is created by Hary Pham. Watch more videos on HaryPhamDev Channel!');
        }
        if(entityChosen === "thanks"){
            //send thanks message
            callSendAPI(sender_psid,`You 're welcome!`);
        }
        if(entityChosen === "bye"){
            //send bye message
            callSendAPI(sender_psid,'bye-bye!');
        }
    }*/

    if (msg) {
        msg = msg.toLowerCase();
        if (msg === 'hi honey' || msg === 'hey honey') {
            answer = 'Hi my Queen! How may I help?';
        } else {
            answer = `Sorry, I don't understand. I am still learning!`;
        }

        response = {
            "text": answer
        }
    } else if (received_message.attachments) {

        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        }
    }

    // Sends the response message
    reply(sender_psid, response);
};

const reply = (sender_psid, response) => {
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    axios.post('https://graph.facebook.com/v2.6/me/messages', request_body, { params: { "access_token": process.env.FACEBOOK_PAGE_TOKEN } })
        .then(function (response) {
            console.log('message sent!')
        })
        .catch(function (error) {
            console.error("Unable to send message:" + error);
        });
}

// Handles messaging_postbacks events
const handlePostback = (sender_psid, received_postback) => {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = { "text": "Thanks!" }
    } else if (payload === 'no') {
        response = { "text": "Oops, try sending another image." }
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}

module.exports = {
    processMsg,
    verifyWebhook
}