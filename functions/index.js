const functions = require('firebase-functions');
const {Storage} = require('@google-cloud/storage');
const {admin} = require('./util/admin');
const app = require('express')();
const FBAuth = require('./util/fbAuth');
const {getAllScreams, postOneScream} = require('./handlers/screams');
const {signup, login, uploadImage} = require('./handlers/users');
const os = require('os');
const path = require('path');
const spawn = require('child-process-promise').spawn;
const cors = require('cors')({origin: true});
const Busboy = require('busboy');
const fs = require('fs');   
const gsConfig = {
    projectId: "socialape-eeef0",
    keyFilename: "serviceAccountKey.json"
}



// scream routes
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);

// user routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);

exports.api = functions.https.onRequest(app);