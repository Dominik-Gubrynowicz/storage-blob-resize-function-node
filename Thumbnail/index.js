const Jimp = require('jimp');
const stream = require('stream');
const {
    BlockBlobClient
} = require("@azure/storage-blob");

const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };

let containerName = 'thumbnails';
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
let blobName = 'default-low.png';

module.exports = async function (context, eventGridEvent, inputBlob){
    const widthInPixels = 1200;

    const sub = eventGridEvent.subject;
    const splitted = sub.split('/');
    const outBlobName = splitted[splitted.length - 1];

    const final = outBlobName.replace('.png', '-low.png');
    blobName = final;

    let containerPathName = splitted;
    containerPathName.pop();
    containerPathName.splice(0, 4);
    containerPathName.splice(1,1);

    containerName = containerPathName.join("/")


    Jimp.read(inputBlob).then((thumbnail) => {
        
        thumbnail.resize(widthInPixels, Jimp.AUTO);

        thumbnail.getBuffer(Jimp.MIME_PNG, async (err, buffer) => {

            const readStream = stream.PassThrough();
            readStream.end(buffer);
            
            context.log('aaaa');
            context.log(final);
            const blobClient = new BlockBlobClient(connectionString, containerName, blobName);
            
            try {
                await blobClient.uploadStream(readStream,
                    uploadOptions.bufferSize,
                    uploadOptions.maxBuffers,
                    { blobHTTPHeaders: { blobContentType: "image/jpeg" } });
            } catch (err) {
                context.log(err.message);
            }
        });
    });
};
