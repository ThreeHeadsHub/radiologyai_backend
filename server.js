require('dotenv').config({ path: '.env.development' });
const express = require("express");
const chalk =  require('chalk');
const bodyParser = require("body-parser");
const routes = require('./routes/routes');
const mongoose = require('mongoose');
const { originHeader, dbFailMessage, dbSuccessMessage, serverFailMessage, serverSuccessMessage } = require("./constants/constants");

const app = express();

app.use((req, res, next) => {
    res.setHeader( originHeader.origin, originHeader.access );
    res.setHeader( originHeader.header, originHeader.headerTypes );
    res.setHeader( originHeader.methods, originHeader.methodTypes );
    next();
})
app.use(bodyParser.json());
app.use(routes);

mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@RadiologyCluster.lnvc9.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority` 
).then(()=> {
    app.listen(process.env.PORT);
    console.log(serverSuccessMessage);
    console.log(dbSuccessMessage);
}).catch(() => {
    console.error(dbFailMessage);
    console.error(serverFailMessage);
});
