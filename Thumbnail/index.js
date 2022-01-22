const Jimp = require('jimp');
const stream = require('stream');
const {
    BlobServiceClient,
} = require("@azure/storage-blob");
const { read } = require('jimp');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

let blobName = '';
let containerName = '';

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
let containerClient = undefined;
let blockBlobClient = undefined;

const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };

module.exports = async function (context, eventGridEvent, inputBlob){

    // resize setup
    const widthInPixels = 1200;

    // get the blob name and the container name from the event
    const sub = eventGridEvent.subject;
    const splitted = sub.split('/');
    const inBlobName = splitted[splitted.length - 1];

    blobName = inBlobName.replace('.png', '-low.png');
    context.log('Out file: ', blobName);

    let containerPathName = splitted;
    containerPathName.pop(); //remove last part of subject (blobName)
    containerPathName.splice(0, 4); // remove first part of topic /blobService/default/containers
    containerPathName.splice(1,1); // remove /blobs/ artifact from subject
    containerName = containerPathName.join("/") // convert rest to container name

    context.log(containerName);

    containerClient = blobServiceClient.getContainerClient('images1');
    blockBlobClient = containerClient.getBlockBlobClient(blobName);

    Jimp.read(inputBlob).then((thumbnail) => {
        
        thumbnail.resize(widthInPixels, Jimp.AUTO);

        thumbnail.getBuffer(Jimp.MIME_PNG, async (err, buffer) => {
            
            if (err) throw err;

            const readStream = stream.PassThrough();
            readStream.end(buffer);

            try {
                // const uploadBlobResponse = await blockBlobClient.upload(readStream, readStream.length);
                await blockBlobClient.uploadStream(readStream,
                    uploadOptions.bufferSize, uploadOptions.maxBuffers,
                    { blobHTTPHeaders: { blobContentType: "image/png" } });

            } catch (err) {
                context.log(err.message);
                throw new Error(err.message)
            }
        });
    });
};
