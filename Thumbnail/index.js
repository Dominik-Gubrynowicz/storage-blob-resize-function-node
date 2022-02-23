const stream = require('stream');
const {
    BlockBlobClient
} = require("@azure/storage-blob");

const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };

const path = require('path');
const sharp = require('sharp');

const THUMB_WIDTH = 1200;

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

module.exports = async function (context, eventGridEvent, inputBlob){

    context.log(typeof inputBlob);

    const subject = eventGridEvent.subject;
    const fileName = path.basename(subject);
    context.log('File name: ', fileName);

    if(path.extname(subject) != ".png" || fileName.endsWith('-low.png')) {
        context.log.warn('This file should not be processed. Skipping...');
        context.res({
            body: "Wrong extension or file has been processed before",
            status: 417
        });
        return "Wrong extension or file has been processed before";
    } 

    const newFileName = path.basename(subject, path.extname(subject)) + '-low' + path.extname(subject);
    context.log('New file name: ', newFileName);

    let containerPathArray = path.dirname(subject).split('/');
    containerPathArray.splice(0,4);
    containerPathArray.splice(1,1);
  
    const containerPathName = containerPathArray.join('/');

    const imageLow = await sharp(inputBlob);
    imageLow.resize({ width: THUMB_WIDTH }).png({quality: 90, compressionLevel: 8});

    const readStreamLow = stream.PassThrough();
    readStreamLow.end(await imageLow.toBuffer());

    let blobClient = new BlockBlobClient(connectionString, containerPathName, newFileName);

    try {
        await blobClient.uploadStream(readStreamLow,
            uploadOptions.bufferSize,
            uploadOptions.maxBuffers,
            { blobHTTPHeaders: { blobContentType: "image/png" } }).then((res) => context.log(res));
    } catch (err) {
        context.log.error(err.message);
        throw new Error(err)
    }

    const imageOrginal = await sharp(inputBlob);
    imageOrginal.png({quality: 90, compressionLevel: 8});

    const readStreamOrginal = stream.PassThrough();
    readStreamOrginal.end(await imageOrginal.toBuffer());

    blobClient = new BlockBlobClient(connectionString, containerPathName, fileName);
    try {
        await blobClient.uploadStream(readStreamOrginal,
            uploadOptions.bufferSize,
            uploadOptions.maxBuffers,
            { blobHTTPHeaders: { blobContentType: "image/png" } }).then((res) => context.log(res));
    } catch (err) {
        context.log.error(err.message);
        throw new Error(err)
    }
}