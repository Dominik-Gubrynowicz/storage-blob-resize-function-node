const Jimp = require('jimp');
const stream = require('stream');
const {
    BlockBlobClient,
} = require("@azure/storage-blob");

const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 5 * ONE_MEGABYTE, maxBuffers: 10000 };

let containerName = 'thumbnails';
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
let blobName = 'default-low.png';

module.exports = async function (context, eventGridEvent, inputBlob){
    const widthInPixels = 1200;

    const sub = eventGridEvent.subject;
    context.log(eventGridEvent);
    context.log(sub);
    const splitted = sub.split('/');
    const outBlobName = splitted[splitted.length - 1];
    context.log('In file: ', outBlobName);

    const final = outBlobName.replace('.png', '-low.png');
    blobName = final;
    context.log('Out file: ', final);

    let containerPathName = splitted;
    containerPathName.pop();
    containerPathName.splice(0, 4);
    containerPathName.splice(1,1);

    containerName = containerPathName.join("/")

    context.log(containerName);

    Jimp.read(inputBlob).then((thumbnail) => {
        
        thumbnail.resize(widthInPixels, Jimp.AUTO);

        thumbnail.getBuffer(Jimp.MIME_PNG, async (err, buffer) => {
            
            if (err) throw err;

            const readStream = stream.PassThrough();
            readStream.end(buffer);
            const blobClient = new BlockBlobClient(connectionString, containerName, blobName);

            try {
                await blobClient.uploadStream(readStream,
                    uploadOptions.bufferSize,
                    uploadOptions.maxBuffers,
                    { blobHTTPHeaders: { blobContentType: "image/png" } }).then((res) => context.log(res));
            } catch (err) {
                context.log(err.message);
            }
        });
    });
};
