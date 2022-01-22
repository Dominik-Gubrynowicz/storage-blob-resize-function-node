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
const containerClient = blobServiceClient.getContainerClient('images1');
const blockBlobClient = containerClient.getBlockBlobClient('test1.txt');

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
    await blockBlobClient.upload('bbbbb', 5);

    Jimp.read(inputBlob).then((thumbnail) => {
        
        thumbnail.resize(widthInPixels, Jimp.AUTO);

        thumbnail.getBuffer(Jimp.MIME_PNG, async (err, buffer) => {
            
            if (err) throw err;

            const readStream = stream.PassThrough();
            readStream.end(buffer);

            try {
                const uploadBlobResponse = await blockBlobClient.upload('aaaaa', 5);
                context.log(uploadBlobResponse.requestId);
            } catch (err) {
                context.log(err.message);
                throw new Error(err)
            }
        });
    });
};
