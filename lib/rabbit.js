const amqp = require('amqplib');
const sizeOf = require('image-size');

const rabbitmqHost = process.env.RABBITMQ_HOST || "localhost";
const rabbitmqUrl = `amqp://${rabbitmqHost}`;

const { getPhotoById, getPhotoDownloadStreamByFilename } = require('../models/photo')

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

async function updateImageSizeById(id, dimensions) {
    console.log(`DIMENSIONS ${dimensions.width} ${dimensions.height}`);
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
                    const dimensions = sizeOf(Buffer.concat(imageData));
                    const result = await updateImageSizeById(id, dimensions);
                });
            }
            channel.ack(msg);
        });
    } catch (err) {
        console.error(err);
    }
}

exports.createConsumer = createConsumer;
