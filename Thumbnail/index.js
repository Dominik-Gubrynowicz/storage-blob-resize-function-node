const Jimp = require('jimp');
const stream = require('stream');
const {
    BlobServiceClient,
} = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME

let blobName = '';
let containerName = '';

const defaultAzureCredential = new DefaultAzureCredential();
const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    defaultAzureCredential
);

module.exports = async function (context, eventGridEvent, inputBlob){

    const widthInPixels = 1200;

    const sub = eventGridEvent.subject;
    const splitted = sub.split('/');
    const outBlobName = splitted[splitted.length - 1];

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

            try {
                const containerClient = blobServiceClient.getContainerClient(containerName);
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                const uploadBlobResponse = await blockBlobClient.upload(readStream, readStream.length);
                context.log(uploadBlobResponse);
            } catch (err) {
                context.log(err.message);
                throw new Error(err)
            }
        });
    });
};
