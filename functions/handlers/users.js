const {admin, db} = require('../util/admin');
const config = require('../util/config');
const firebaseLib = require('firebase');
const {validateSignupData, validateLoginData, reduceUserDetails} = require('../util/validators');

firebaseLib.initializeApp(config);


//========================================================================================================================
//=========================================== SIGN UP USER ===============================================================
//========================================================================================================================


exports.signup = (req, res) => {
    
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };
  
    const {valid, errors} = validateSignupData(newUser);

    let noImg = 'blank_profile.png';

    if(!valid) return res.status(400).json(errors)

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
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
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

}

//========================================================================================================================
//=========================================== LOGIN USER =================================================================
//========================================================================================================================

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }
    //validation goes here

    const {valid, errors} = validateLoginData(user);

    if(!valid) return res.status(400).json(errors);

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

}
//========================================================================================================================
//=========================================== ADD USER DETAILS ===========================================================
//========================================================================================================================

exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);
     db.doc(`/users/${req.user.handle}`).update(userDetails)
     .then(() => {
         return res.json({message: 'Details added successfully'});
     })
     .catch(err => {
         console.error(err);
         return res.status(500).json({error: err.code});
     });
}

//========================================================================================================================
//=========================================== GET USER DETAILS ===========================================================
//========================================================================================================================


exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if(doc.exists){
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle', '==', req.user.handle).get()
              
            }
        })
        .then(data => {
            userData.likes = [];
            console.log(data);
            data.forEach(doc => {
                userData.likes.push(doc.data());
            });
            return res.json(userData);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code});
        });

}

//========================================================================================================================
//=========================================== UPLOAD PROFILE IMAGE =======================================================
//========================================================================================================================

exports.uploadImage = (req, res) => {
const BusBoy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

const busboy = new BusBoy({headers: req.headers});
let imageFileName;  
let tempImage = {};

busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if(mimetype !== 'image/png' && mimetype !=='image/jpeg'){
        return res.status(400).json({error: 'wrong file type submitted'});
    }
    const imageExtension = filename.split('.')[filename.split('.').length-1];
   imageFileName = `${Math.round(Math.random()*10000000 ) }.${imageExtension}`;
    const filePath = path.join(os.tmpdir(), imageFileName);
    tempImage = {filePath, mimetype};
    file.pipe(fs.createWriteStream(filePath));
});
busboy.on('finish', () => {
 admin.storage().bucket('socialape-eeef0.appspot.com').upload(tempImage.filePath, {
     resumable: false,
     metadata: {
         metadata: {
             contentType: tempImage.mimetype
         }
     }

 })
 .then(() => {
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
    //  const images = admin.storage().ref().child('images');
    //  const image = images.child('blank_profile');
    //  image.getDownloadURL().then((url) => {imageUrl = url });

  
    return db.doc(`/users/${req.user.handle}`).update({imageUrl})
 })
 .then(() => {
     res.status(200).json({message: 'Image uploaded successfully'})
 })
 .catch(err => {
     console.error(err);
     return res.status(500).json({error: err.code});
 })
});
busboy.end(req.rawBody);
}