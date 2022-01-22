const Jimp = require('jimp');
const stream = require('stream');
const {
    BlobServiceClient,
} = require("@azure/storage-blob");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME

let blobName = '';
let containerName = '';

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
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
    const data = "Hello world!";
    const res = await blockBlobClient.upload(data, data.length);
    context.log(res.requestId);

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
