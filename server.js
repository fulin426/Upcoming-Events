const User = require('./models/user');
const EventDetail = require('./models/eventDetails');
const bodyParser = require('body-parser');
const config = require('./config');
const mongoose = require('mongoose');
const moment = require('moment');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;
const express = require('express');
const app = express();
const jsonParser = bodyParser.json();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

mongoose.Promise = global.Promise;

 // ---------------- RUN/CLOSE SERVER -----------------------------------------------------
let server = undefined;

function runServer(urlToUse) {
    return new Promise((resolve, reject) => {
        mongoose.connect(urlToUse, err => {
            if(err) {
                return reject(err);
            }
            server = app.listen(config.PORT, () => {
                console.log(`Listening on localhost:${config.PORT}`);
                resolve();
            }).on('error', err => {
                mongoose.disconnect();
                reject(err);
            });
        });
    });
}

if (require.main === module) {
    runServer(config.DATABASE_URL).catch(err => console.error(err));
}

function closeServer() {
    return mongoose.disconnect().then(() => new Promise((resolve, reject) => {
        console.log('Closing server');
        server.close(err => {
            if(err) {
                return reject(err);
            }
            resolve();
        });
    }));
}

// ---------------USER ENDPOINTS-------------------------------------
// POST -----------------------------------
// creating a new user
app.post('/users/create', (req, res) => {
    //take the email and password from the user obejct from client.js
    let email = req.body.email;
    let password = req.body.password;
    //exclude spaces
    email = email.trim();
    password = password.trim();
    //create a new encryption key (salt)
    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return res.status(500).json({
                message: 'Internal server error'
            });
        }
        //with the new key, encrypt the current password
        bcrypt.hash(password, salt, (err, hash) => {
            if (err) {
                return res.status(500).json({
                    message: 'Internal server error'
                });
            }
        //after the password is encrypted; send it to the database
        User.create({
            email,
            password: hash,
        }, (err, item) => {
            //if the database connection is NOT succesfull
            if (err) {
                //show error
                return res.status(500).json({
                    message: 'Internal Server Error'
                });
            }
            //if the database connection is succesfull
            if (item) {
                //show results
                console.log(`User \`${email}\` created.`);
                return res.json(item);
            }
        });
        });
    });
});
// signing in a user
app.post('/users/login', function (req, res) {
    //take the email and password from the user object from client.js
    const email = req.body.email;
    const password = req.body.password;
    //find if the user is in the database
    User
        .findOne({
            email: req.body.email
        }, function(err, items) {
            //if the user is not found
            if (err) {
                //display an error
                return res.status(500).json({
                    message: "Internal server error"
                });
            }
            //if the are no items
            if (!items) {
                // bad username
                return res.status(401).json({
                    message: "Not found!"
                });
            }
            //if the user is found
            else {
                //validate the password
                items.validatePassword(req.body.password, function(err, isValid) {
                    //if password validation is not working
                    if (err) {
                        console.log('There was an error validating the password.');
                    }
                    //if the password is not valid
                    if (!isValid) {
                        return res.status(401).json({
                            message: "Not found"
                        });
                    }
                    //if the password is valid
                    else {
                        return res.json(items);
                    }
                });
            };
        });
});

// POST -----------------------------------------
// creating a new event
app.post('/event/create', (req, res) => {
    let user = req.body.user;
    let date = req.body.date;
    let time = req.body.time;
    let venueName = req.body.venueName;
    let eventName = req.body.eventName;
    let city = req.body.city;
    let eventurl = req.body.eventurl;
    let venueurl = req.body.venueurl;

        EventDetail.create({
            user,
            date,
            time,
            venueName,
            eventName,
            city,
            eventurl,
            venueurl
        }, (err, item) => {
            if (err) {
                return res.status(500).json({
                    message: 'Internal Server Error'
                });
            }
            if(item) {
                return res.json(item);
            }
        });
});

// ACCESING A SINGLE event BY ID
app.get('/event/get/:user', function (req, res) {
    EventDetail.find({
            user: req.params.user
        }, (err, event) => {
            if (err) {
                res.send(err)
            }
            res.json(event)
    })
});

// DELETE ----------------------------------------
app.delete('/event/delete/:id', function(req, res) {
    EventDetail.findByIdAndRemove(req.params.id).exec().then(function(event) {
        console.log(`Deleted event item ${req.params.id}`);
        return res.status(204).end();
    }).catch(function(err) {
        return res.status(500).json({
            message: 'Internal Server Error'
        });
    });
});

// MISC ------------------------------------------
// catch-all endpoint if client makes request to non-existent endpoint
app.use('*', (req, res) => {
    res.status(404).json({
        message: 'Not Found'
    });
});

exports.app = app;
exports.runServer = runServer;
exports.closeServer = closeServer;
