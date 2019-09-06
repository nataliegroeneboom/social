const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();


var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://socialape-eeef0.firebaseio.com"
});

var firebaseConfig = {
    apiKey: "AIzaSyC1r1KpfvhxL5UjTtrNgF0s5T5dJ6kA8DY",
    authDomain: "socialape-eeef0.firebaseapp.com",
    databaseURL: "https://socialape-eeef0.firebaseio.com",
    projectId: "socialape-eeef0",
    storageBucket: "socialape-eeef0.appspot.com",
    messagingSenderId: "865191279235",
    appId: "1:865191279235:web:f47a78f9eeb23837"
  };




const firebaseLib = require('firebase');
firebaseLib.initializeApp(firebaseConfig)

const db = admin.firestore();

app.get('/screams', (req, res) => {
    db
    .collection('screams')
    .orderBy('createdAt', 'desc')
    .get().then(data => {
        let screams = [];
        data.forEach(doc => {
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt
            });
        });
        return res.json(screams)
    })
    .catch(err => console.error(err));
})



app.post('/scream', (req, res) => {
  
  const newScream = {
      body: req.body.body,
      userHandle: req.body.userHandle,
      createdAt: new Date().toISOString()
  };
 db
    .collection('screams')
    .add(newScream)
    .then(doc => {
        res.json({message: `document ${doc.id} created successfully`})
    })
    .catch(err => {
        res.status(500).json({error: 'something went wrong'});
        console.error(err);
    });
});

// sign up route
app.post('/signup', (req, res) => {
    
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }
    let token, userId;
    // validate data ...
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({
                handle: 'this handle is already taken'
            })
        }else{
           return firebaseLib.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
               
        }
    })
    .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken()
    })
    .then(iDtoken => {
        token = iDtoken;
        const userCredentials = {
            handle : newUser.handle,
            email : newUser.email,
            createdAt: new Date().toISOString(),
            userId
        };
      return  db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
        return res.status(201).json({token});
    })
    .catch(err => {
        console.error(err);
        if(err.code === 'auth/email-already-in-use'){
            return res.status(400).json({email: 'Email is already in use'});
        }else{
            return res.status(500).json({error: err.code})
        }
        
    })

})


exports.api = functions.https.onRequest(app);