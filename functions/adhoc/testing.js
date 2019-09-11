exports.onFileChange  = functions.storage.object().onFinalize(event => {
    const bucket = event.bucket;
    const contentType = event.contentType;
    const filePath = event.name;
    console.log('File change detected, function execution started');

    if(event.resourceState === 'not_exists'){
        console.log('image has been deleted');
        return;
    }
    if(path.basename(filePath).startsWith('resized-')){
        console.log('we already renamed that file')
        return;
    }
    const storage = new Storage(gsConfig);
    const destBucket = storage.bucket(bucket);
    const tempFilePath =  path.join(os.tmpdir(), path.basename(filePath));
    const metadata = { contentType: contentType};

    return destBucket.file(filePath).download({
        destination:  tempFilePath,
    })
    .then(()=> {
        return spawn('convert', [tempFilePath, '-resize', '500x500', tempFilePath])
       
    })
    .then(() => {
        return destBucket.upload(tempFilePath, {
            destination: 'resized-'+ path.basename(filePath),
            metadata: metadata
        })
    });
});

exports.fileUpload = functions.https.onRequest((req,res) => {
 cors(req, res, () => {
    if(req.method !== 'POST'){
        return res.status(500).json({
            message: 'not allowed'
        });
    }   
    const busboy = new Busboy({headers: req.headers});
    let uploadData = null;
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        const filepath = path.join(os.tmpdir(), filename);
        uploadData = {file: filepath, type:mimetype};
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
        const bucket = new Storage(gsConfig).bucket('socialape-eeef0.appspot.com');
        bucket.upload(uploadData.file,{ 
            metadata: {
                metadata: {
                    contentType: uploadData.type
                }
            }})
            .then(() => {
                res.status(200).json({
                    message: 'it worked'
                })
            })
            .catch(err => {
               res.status(500).json({
                    error: err
                })
            })
    });
    busboy.end(req.rawBody);
   
 });   

});