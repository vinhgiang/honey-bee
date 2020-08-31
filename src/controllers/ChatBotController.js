const axios = require('axios');
const helper = require('../classes/helper');
let jobs = [];

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
    res.sendStatus(400);
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

function firstEntity(nlp, name) {
    return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

const handleMessage = async (sender_psid, received_message) => {
    let response;
    let msg = received_message.text;
    let answer;

    const urlEnitity = firstEntity(received_message.nlp, 'wit$url:url');
    if (urlEnitity && urlEnitity.confidence >= 0.6) {
        const url = urlEnitity.value;
        
        answer = `Downloading: ${url}`;

        helper.pinterestParser(url)
            .then(data => {
                jobs.push([sender_psid, data]);
                response = {
                    "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "generic",
                            "elements": [{
                                "title": "Is this the correct resouce?",
                                "subtitle": "Tap a button to answer.",
                                "image_url": data.images['736x'].url,
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
            })
            .catch(err => {
                console.log(err);
                response = { "text": "Oops! Sorry, something is wrong with this URL. Please contact the Woker Bee at <giangcamvinh@gmail.com>." }
            })
            .finally(() => {
                reply(sender_psid, response);
            });
    } else {
        const byeTrait = firstTrait(received_message.nlp, 'wit$bye');
        const thanksTrait = firstTrait(received_message.nlp, 'wit$thanks');
        const greetingTrait = firstTrait(received_message.nlp, 'wit$greetings');
        if (byeTrait && byeTrait.confidence >= 0.8) {
            answer = 'Bye bye my Queen!';
        } else if (thanksTrait && thanksTrait.confidence >= 0.8) {
            answer = 'You are very welcome!';
        } else if (greetingTrait && greetingTrait.confidence >= 0.8) {
            answer = 'Hi my Queen! How may I help?';
        } else {
            answer = 'You can always ask "What can you do?"';
        }
    }

    if (msg) {
        response = {
            "text": answer
        }
        if (msg === 'yes') {
            response = { "text": parsedData.images['736x'].url }
        }
    } else if (received_message.attachments) {

        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        
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
// ONLY be triggered when users click on the provided options
// WILL NOT be triggered even that users type exact the same answer as provided option
const handlePostback = (sender_psid, received_postback) => {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;

    let job = jobs.filter(job => job[0] === sender_psid)[0];

    // Set the response based on the postback payload
    if (payload === 'yes' && job) {
        
        let file = job[1].isVideo ? job[1].videos.video_list.V_720P.url : job[1].images.orig.url;
        
        // don't need to download since facebook can handle URL attachment directly
        // await helper.downloadFileViaURL(file, "./src/public/");    
        
        reply(sender_psid, {"text": "Just a few more seconds 😝"});

        response = {
            "attachment": {
                "type": job[1].isVideo ? "video" : "image", 
                "payload": {
                    "url": file, 
                    "is_reusable": true
                }
            }
        };
    } else if (payload === 'no') {
        response = { "text": "Oops, try sending another URL." }
    }

    // remove the job from list
    jobs.splice(jobs.indexOf(job), 1);

    // Send the message to acknowledge the postback
    reply(sender_psid, response);
}

module.exports = {
    processMsg,
    verifyWebhook
}