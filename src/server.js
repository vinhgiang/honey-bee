const express = require('express');
const router = require('./routes');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 8080;

config(app);
app.use(router);

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));