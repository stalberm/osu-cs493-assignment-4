const amqp = require('amqplib');
const sizeOf = require('image-size');
const Jimp = require("jimp");

const rabbitmqHost = process.env.RABBITMQ_HOST || "rabbit";
const rabbitmqUrl = `amqp://${rabbitmqHost}`;

const { getPhotoById, getPhotoDownloadStreamByFilename, getThumbDownloadStreamByFilename } = require('../models/photo')
const { GridFSBucket } = require('mongodb');
const { getDbReference } = require('./mongo')

async function connectRabbit() {
    const connection = await amqp.connect(rabbitmqUrl);
    return connection;
}

exports.connectRabbit = connectRabbit

async function getPhotoDownloadStreamById(id) {
    try {
        const photo = await getPhotoById(id)
        if (photo) {
            return getPhotoDownloadStreamByFilename(photo.filename);
        } else {
            return null;
        }
    } catch (err) {
        console.error(err);
    }
}
exports.getPhotoDownloadStreamById = getPhotoDownloadStreamById

async function getThumbDownloadStreamById(id) {
    try {
        const photo = await getPhotoById(id)
        if (photo) {
            return getThumbDownloadStreamByFilename(photo.filename);
        } else {
            return null;
        }
    } catch (err) {
        console.error(err);
    }
}
exports.getThumbDownloadStreamById = getThumbDownloadStreamById

async function updateImageSizeById(id, imageData) {

    const resizedImage = await Jimp.read(Buffer.concat(imageData))
        .then((image) => {
            image.resize(100, 100);
            return image.getBufferAsync(Jimp.MIME_JPEG);
        })
        .catch((err) => {
            console.log(err);
        });
    const dimensions = sizeOf(resizedImage);
    const photo = await getPhotoById(id)
    if (photo) {
        const db = getDbReference()
        const bucket =
            new GridFSBucket(db, { bucketName: 'thumbs' });
        const metadata = {
            contentType: 'image/jpeg',
            photoId: photo._id,
            width: dimensions.width,
            height: dimensions.height
        };
        const parts = photo.filename.split('.');
        if (parts.length > 1) {
            parts[parts.length - 1] = "jpg";
        } else {
            parts.push("jpg");
        }
        const name = parts.join('.');
        const uploadStream = bucket.openUploadStream(name, { id: photo.metadata.thumbId, metadata: metadata });
        uploadStream.end(resizedImage);
    }
    return "Done";
}

async function createConsumer() {

    const connection = await connectRabbit();
    const channel = await connection.createChannel();
    try {
        await channel.assertQueue('photos');
        channel.consume('photos', async (msg) => {
            if (msg) {
                const id = msg.content.toString();
                const downloadStream = await getPhotoDownloadStreamById(id);
                const imageData = [];
                downloadStream.on('data', (data) => {
                    imageData.push(data);
                }).on('end', async () => {
                    const result = await updateImageSizeById(id, imageData);
                });
            }
            channel.ack(msg);
        });
    } catch (err) {
        console.error(err);
    }
}

exports.createConsumer = createConsumer;
