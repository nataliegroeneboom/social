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

const FBAuth = (req, res, next) => {
let idToken;
 if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
     idToken = req.headers.authorization.split('Bearer ')[1];
 }else{
     console.error('no token found');
     return res.status(403).json({error: 'Unauthorized'});
 }
 admin.auth().verifyIdToken(idToken)
 .then(decodedToken => {
     console.log(decodedToken);
    req.user = decodedToken;
    return db.collection("users")
    .where('userId', "==", req.user.uid)
    .limit(1)
    .get();
 })
 .then(data => {
     req.user.handle = data.docs[0].data().handle;
     return next();
 })
 .catch(err => {
    console.error('error while verifying credentials ', err);
    
 })
}

app.post('/scream', FBAuth, (req, res) => {
  
  const newScream = {
      body: req.body.body,
      userHandle: req.user.handle,
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

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const testing =  regEx.test(email);
    return testing
}
const isEmpty = (string) => {     
    if(string.trim() === ''){
       return true;
    } 
    else return false;  
}


// sign up route
app.post('/signup', (req, res) => {
    
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };
  
    let errors = {};

    if(isEmpty(newUser.email)){
        errors.email = 'Field must not be empty'
    }else if(!isEmail(newUser.email)){
         errors.email = 'Field must contain a valid email'
    }

    if(isEmpty(newUser.password)) errors.password = 'Field must not be empty';
    if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'passwords do not match';
    if(isEmpty(newUser.handle)) errors.handle = 'Field must not be empty';
    if(Object.keys(errors).length > 0) return res.status(400).json(errors) 
   
    

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

});

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }
    let errors = {};
    if(isEmpty(user.email)) errors.email = 'Must not be empty';
    if(isEmpty(user.password)) errors.password = 'Must not be empty';

    if(Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebaseLib.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
        return data.user.getIdToken();
    })
    .then(token => {
        return res.json({token})
    })
    .catch(err => {
        if(err.code = 'auth/wrong-password') return res.status(403).json({general: 'Wrong credentials, please try again'})
        else{
        console.error(err);
        return res.status(500).json({error: err.code});
        }
        
    })

});


exports.api = functions.https.onRequest(app);