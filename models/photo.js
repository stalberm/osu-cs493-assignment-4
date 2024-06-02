/*
 * Photo schema and data accessor methods.
 */

const { ObjectId } = require('mongodb')
const { GridFSBucket } = require('mongodb');

const { getDbReference } = require('../lib/mongo')
const fs = require('fs');

/*
 * Schema describing required/optional fields of a photo object.
 */
const PhotoSchema = {
    businessId: { required: true },
    caption: { required: false },
}
exports.PhotoSchema = PhotoSchema

/*
 * Executes a DB query to insert a new photo into the database.  Returns
 * a Promise that resolves to the ID of the newly-created photo entry.
 */
async function insertNewPhoto(photo) {
    photo.businessId = ObjectId(photo.businessId)
    const photoId = await _savePhotoFile(photo)
    return photoId
}
exports.insertNewPhoto = insertNewPhoto

/*

*/
async function _savePhotoFile(photo) {
    return new Promise((resolve, reject) => {
        const db = getDbReference()
        const bucket =
            new GridFSBucket(db, { bucketName: 'photos' });
        const metadata = {
            contentType: photo.contentType,
            businessId: photo.businessId,
            thumbId: photo.thumbId
        };
        const uploadStream = bucket.openUploadStream(
            photo.filename,
            { metadata: metadata }
        );
        fs.createReadStream(photo.path).pipe(uploadStream).on('error', (err) => {
            reject(err);
        })
            .on('finish', (result) => {
                resolve(result._id);
            });
    })
}


/*

*/
function getPhotoDownloadStreamByFilename(filename) {
    const db = getDbReference();
    const bucket =
        new GridFSBucket(db, { bucketName: 'photos' });
    return bucket.openDownloadStreamByName(filename);
}
exports.getPhotoDownloadStreamByFilename = getPhotoDownloadStreamByFilename;

/*

*/
function getThumbDownloadStreamByFilename(filename) {
    var parts = filename.split('.');
    if (parts.length > 1 && parts[parts.length - 1] !== 'jpg') {
        filename = parts.slice(0, -1).join('.') + '.jpg';
    }
    const db = getDbReference();
    const bucket =
        new GridFSBucket(db, { bucketName: 'thumbs' });
    return bucket.openDownloadStreamByName(filename);
}
exports.getThumbDownloadStreamByFilename = getThumbDownloadStreamByFilename;

/*
 * Executes a DB query to fetch a single specified photo based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * photo.  If no photo with the specified ID exists, the returned Promise
 * will resolve to null.
 */
async function getPhotoById(id) {
    const db = getDbReference()
    const bucket =
        new GridFSBucket(db, { bucketName: 'photos' });
    if (!ObjectId.isValid(id)) {
        return null
    } else {
        const results =
            await bucket.find({ _id: ObjectId.createFromHexString(id) }).toArray();
        return results[0]
    }
}
exports.getPhotoById = getPhotoById
