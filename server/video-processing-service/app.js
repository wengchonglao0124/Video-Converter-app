
const express = require('express');

require("dotenv").config();

const app = express();

const path = require("path");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require("fluent-ffmpeg");
const {GetObjectCommand, PutObjectCommand, DeleteObjectCommand} = require("@aws-sdk/client-s3");
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs');

S3 = require("@aws-sdk/client-s3");
const s3Client = new S3.S3Client({
  region: process.env.CLIENT_REGION
});

const SQS = require("@aws-sdk/client-sqs");
const sqsClient = new SQS.SQSClient({
  region: process.env.CLIENT_REGION,
});

const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
// Initialize the SSM client
const ssmClient = new SSMClient({
  region: process.env.CLIENT_REGION
});

const getParameter = async (name) => {
  try {
    const command = new GetParameterCommand({ Name: name });
    const response = await ssmClient.send(command);
    console.log("Successfully retrieved parameter", response.Parameter);
    return response.Parameter.Value;
  } catch (err) {
    console.error(`Error fetching parameter ${name}:`, err);
    throw err;
  }
};

let bucketName;
let sqsQueueUrl;
const loadParameters = async () => {
  bucketName = await getParameter('/n11679719/assessment2/BUCKET_NAME');
  sqsQueueUrl = await getParameter("/n11679719/assessment3/SQS_QUEUE_URL");
}

(async () => {
  await loadParameters();
})();


let isProcessing = false;  // Flag to check if a process is ongoing

// Transcode video method
const transcodeVideo = async ({ userId, videoId, videoPath }, receiptHandle) => {
  const format = 'mp4'; // Default format is 'mp4'

  try {
    const s3Bucket = bucketName
    const inputFileName = `${userId}-${videoId}-original.${format}`;
    const tempInputPath = path.join(__dirname, `./temp/${inputFileName}`);
    const outputFileName = `${userId}-${videoId}.${format}`;
    const tempOutputPath = path.join(__dirname, `./temp/${outputFileName}`);

    // Step 2: Download the video from S3
    console.log("Downloading video from S3...");
    const downloadCommand = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: videoPath
    });

    const videoStream = await s3Client.send(downloadCommand);
    const videoFile = fs.createWriteStream(tempInputPath);
    videoStream.Body.pipe(videoFile);

    videoFile.on('finish', () => {
      console.log("Video downloaded successfully. Starting transcoding...");

      // Step 3: Transcode the video using FFmpeg
      const ffmpegCommand = ffmpeg(tempInputPath).output(tempOutputPath);

      ffmpegCommand
          .on('start', (commandLine) => {
            console.log(`Spawned FFmpeg with command: ${commandLine}`);
          })
          .on('end', async () => {
            console.log("Transcoding completed. Uploading transcoded video to S3...");

            // Step 4: Upload transcoded video back to S3
            const uploadCommand = new PutObjectCommand({
              Bucket: s3Bucket,
              Key: `transcoded/${outputFileName}`,
              Body: fs.createReadStream(tempOutputPath),
              ContentType: `video/${format}`
            });

            await s3Client.send(uploadCommand);
            console.log("Transcoded video uploaded to S3.");

            // Step 6: Clean up the local temp files
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);
            console.log(`Temporary files deleted: ${tempInputPath}, ${tempOutputPath}`);

            // Delete the message from the queue after processing
            const deleteParams = {
              QueueUrl: sqsQueueUrl,
              ReceiptHandle: receiptHandle
            };
            const deleteCommand = new SQS.DeleteMessageCommand(deleteParams);
            await sqsClient.send(deleteCommand);
            console.log(`Message deleted from SQS: ${receiptHandle}`);
            isProcessing = false;
          })
          .on('error', (err) => {
            console.error("Error during transcoding:", err);
            isProcessing = false;
          })
          .run();
    });

  } catch (err) {
    console.error("Error during transcoding process:", err);
    isProcessing = false;
  }
};


// Apply filter to video method
const filterVideo = async ({ userId, videoId, videoPath }, receiptHandle) => {
  const filterType = 'grayscale';

  try {
    const s3Bucket = bucketName;
    const inputFileName = `${userId}-${videoId}-original.mp4`;
    const tempInputPath = path.join(__dirname, `./temp/${inputFileName}`);
    const outputFileName = `${userId}-${videoId}.mp4`;
    const tempOutputPath = path.join(__dirname, `./temp/${outputFileName}`);

    // Step 2: Download the video from S3
    console.log("Downloading video from S3...");
    const downloadCommand = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: videoPath
    });

    const videoStream = await s3Client.send(downloadCommand);
    const videoFile = fs.createWriteStream(tempInputPath);
    videoStream.Body.pipe(videoFile);

    videoFile.on('finish', () => {
      console.log("Video downloaded successfully. Starting filtering process...");

      // Step 3: Apply the video filter using FFmpeg
      const ffmpegCommand = ffmpeg(tempInputPath);

      switch (filterType) {
        case 'grayscale':
          ffmpegCommand.videoFilters('hue=s=0');
          break;
        case 'sepia':
          ffmpegCommand.videoFilters('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
          break;
        default:
          break;
      }

      ffmpegCommand
          .output(tempOutputPath)
          .on('start', (commandLine) => {
            console.log(`Spawned FFmpeg with command: ${commandLine}`);
          })
          .on('end', async () => {
            console.log("Filtering completed. Uploading filtered video to S3...");

            // Step 4: Upload filtered video back to S3
            const uploadCommand = new PutObjectCommand({
              Bucket: s3Bucket,
              Key: `filtered/${outputFileName}`,
              Body: fs.createReadStream(tempOutputPath),
              ContentType: `video/mp4`
            });

            await s3Client.send(uploadCommand);
            console.log("Filtered video uploaded to S3.");

            // Step 6: Clean up the local temp files
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);
            console.log(`Temporary files deleted: ${tempInputPath}, ${tempOutputPath}`);

            // Delete the message from the queue after processing
            const deleteParams = {
              QueueUrl: sqsQueueUrl,
              ReceiptHandle: receiptHandle
            };
            const deleteCommand = new SQS.DeleteMessageCommand(deleteParams);
            await sqsClient.send(deleteCommand);
            console.log(`Message deleted from SQS: ${receiptHandle}`);
            isProcessing = false;
          })
          .on('error', (err) => {
            console.error("Error during filtering:", err);
            isProcessing = false;
          })
          .run();
    });

  } catch (err) {
    console.error("Error during filtering process:", err);
    isProcessing = false;
  }
};


// Stabilize video method
const stabilizeVideo = async ({ userId, videoId, videoPath }, receiptHandle) => {
  try {
    const s3Bucket = bucketName;
    const inputFileName = `${userId}-${videoId}-original.mp4`;
    const tempInputPath = path.join(__dirname, `./temp/${inputFileName}`);
    const outputFileName = `${userId}-${videoId}.mp4`;
    const tempOutputPath = path.join(__dirname, `./temp/${outputFileName}`);

    // Step 2: Download the video from S3
    console.log("Downloading video from S3...");
    const downloadCommand = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: videoPath
    });

    const videoStream = await s3Client.send(downloadCommand);
    const videoFile = fs.createWriteStream(tempInputPath);
    videoStream.Body.pipe(videoFile);

    videoFile.on('finish', () => {
      console.log("Video downloaded successfully. Starting video stabilization...");

      // Step 3: Stabilize the video using FFmpeg
      ffmpeg(tempInputPath)
          .videoFilters('deshake')  // Apply the deshake filter for stabilization
          .output(tempOutputPath)
          .on('start', (commandLine) => {
            console.log(`Spawned FFmpeg with command: ${commandLine}`);
          })
          .on('end', async () => {
            console.log("Stabilization completed. Uploading stabilized video to S3...");

            // Step 4: Upload stabilized video back to S3
            const uploadCommand = new PutObjectCommand({
              Bucket: s3Bucket,
              Key: `stabilized/${outputFileName}`,
              Body: fs.createReadStream(tempOutputPath),
              ContentType: `video/mp4`
            });

            await s3Client.send(uploadCommand);
            console.log("Stabilized video uploaded to S3.");

            // Step 6: Clean up the local temp files
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);
            console.log(`Temporary files deleted: ${tempInputPath}, ${tempOutputPath}`);

            // Delete the message from the queue after processing
            const deleteParams = {
              QueueUrl: sqsQueueUrl,
              ReceiptHandle: receiptHandle
            };
            const deleteCommand = new SQS.DeleteMessageCommand(deleteParams);
            await sqsClient.send(deleteCommand);
            console.log(`Message deleted from SQS: ${receiptHandle}`);
            isProcessing = false;
          })
          .on('error', (err) => {
            console.error("Error during stabilization:", err);
            isProcessing = false;
          })
          .run();
    });
  } catch (err) {
    console.error("Error during stabilization process:", err);
    isProcessing = false;
  }
};

const pollSQS = async () => {
  if (isProcessing) {
    console.log("A video is currently processing. Waiting to complete before polling.");
    return;
  }

  // Receive a message from the SQS
  const receiveCommand = new SQS.ReceiveMessageCommand({
    MaxNumberOfMessages: 1,
    QueueUrl: sqsQueueUrl,
    WaitTimeSeconds: 20, // how long to wait for a message before returning if none
  });

  try {
    // Receive messages from SQS
    const response = await sqsClient.send(receiveCommand);

    if (response.Messages) {
      for (const message of response.Messages) {
        isProcessing = true;
        const { Body, ReceiptHandle } = message;
        const parsedMessage = JSON.parse(Body);

        const { userId, videoId, jobType, videoPath } = parsedMessage;
        console.log(`Processing SQS message with jobType: ${jobType}`);

        // Perform the task based on jobType
        if (jobType === 'transcoded') {
          await transcodeVideo({ userId, videoId, videoPath }, ReceiptHandle);
        } else if (jobType === 'filtered') {
          await filterVideo({ userId, videoId, videoPath }, ReceiptHandle);
        } else if (jobType === 'stabilized') {
          await stabilizeVideo({ userId, videoId, videoPath }, ReceiptHandle);
        } else {
          console.log(`Unknown jobType: ${jobType}`);
        }
      }
    }
    else {
      console.log("No messages from SQS");
      isProcessing = false;
    }
  } catch (err) {
    console.error("Error polling SQS:", err);
    isProcessing = false;
  }
}

setInterval(pollSQS, 30000);


module.exports = app;
