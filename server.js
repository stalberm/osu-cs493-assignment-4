const express = require('express')
const morgan = require('morgan')

const api = require('./api')
const { connectToDb } = require('./lib/mongo')
const { createConsumer, getPhotoDownloadStreamById, getThumbDownloadStreamById } = require('./lib/rabbit')
const app = express()
const port = process.env.PORT || 8000

/*
 * Morgan is a popular logger.
 */
app.use(morgan('dev'))

app.use(express.json())

/*
 * Resolves the filename of the original image given a photo's id.
 * Given the filename, creates a download stream and pipes the data as the response to requests.
*/

app.get('/media/photos/:id', async (req, res, next) => {
    const downloadStream = await getPhotoDownloadStreamById(req.params.id)
    downloadStream.on('file', (file) => {
        res.status(200).type(file.metadata.contentType);
    }).on('error', (err) => {
        if (err.code === 'ENOENT') {
            next();
        } else {
            next(err);
        }
    }).pipe(res);
});

/*
 * Resolves the filename of the thumbnail image given a photo's id.
 * Given the filename, creates a download stream and pipes the data as the response to requests.
*/

app.get('/media/thumbs/:id',  async (req, res, next) => {
    const downloadStream = await getThumbDownloadStreamById(req.params.id);
    downloadStream.on('file', (file) => {
        res.status(200).type(file.metadata.contentType);
    }).on('error', (err) => {
        if (err.code === 'ENOENT') {
            next();
        } else {
            next(err);
        }
    }).pipe(res);
});

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use('/', api)


app.use('*', function (req, res, next) {
    res.status(404).json({
        error: "Requested resource " + req.originalUrl + " does not exist"
    })
})

app.use('*', (err, req, res, next) => {
    console.error(err);
    res.status(500).send({
        err: "An error occurred. Try again later."
    });
});

connectToDb(function () {
    createConsumer()
    app.listen(port, function () {
        console.log("== Server is running on port", port)
    })
})
