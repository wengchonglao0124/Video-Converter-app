const path = require("path");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require("fluent-ffmpeg");
const {GetObjectCommand, PutObjectCommand, DeleteObjectCommand} = require("@aws-sdk/client-s3");
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs');
S3 = require("@aws-sdk/client-s3");
const S3Presigner = require("@aws-sdk/s3-request-presigner");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const SQS = require("@aws-sdk/client-sqs");

const videoStoragePath = "/videos"
s3Client = new S3.S3Client({
    region: process.env.CLIENT_REGION
});

// Initialize the SSM client
const ssmClient = new SSMClient({
    region: process.env.CLIENT_REGION
});

const sqsClient = new SQS.SQSClient({
    region: process.env.CLIENT_REGION,
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


exports.uploadVideo = async (req, res) => {
    try {
        // Extract filename from the client request body
        const {filename} = req.body;

        if (!filename) {
            return res.status(400).json({error: true, message: "Filename is required."});
        }

        const userId = req.user.userId;

        const videoId = new Date().getTime();
        const s3Key = `raw/${userId}-${videoId}.mp4`;  // Construct S3 key using user ID and videoId

        // Define S3 upload parameters
        const params = {
            Bucket: bucketName,
            Key: s3Key,  // The key under which the video will be saved in S3
        };

        // Generate the pre-signed URL for uploading the video directly to S3
        const uploadUrl = await S3Presigner.getSignedUrl(s3Client, new PutObjectCommand(params), {expiresIn: 3600});  // URL valid for 1 hour

        // Save the video metadata in the database
        await req.db('Videos').insert({
            id: videoId,
            user_id: userId,  // Cognito User ID
            filename: filename,
            path: s3Key,  // S3 path and key to the video
        });

        // Send the pre-signed URL back to the client
        res.status(200).json({
            error: false,
            message: "Pre-signed URL generated successfully.",
            uploadUrl: uploadUrl
        });

    } catch (err) {
        console.error("Error generating pre-signed URL:", err);
        res.status(500).json({error: true, message: "Failed to generate pre-signed URL."});
    }
};


// Get user videos method
exports.getUserVideos = async (req, res) => {
    const { role } = req.user;

    try {
        let videos;
        if (role === 'admin') {
            videos = await req.db('Videos')
                .select('*');  // Select all fields
        } else {
            videos = await req.db('Videos')
                .where({ 'user_id': req.user.userId })  // Matching with the Cognito User ID
                .select('*');  // Select all fields
        }
        res.status(200).json({ error: false, message: videos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


// Download video method
exports.downloadVideo = async (req, res) => {
    const { role = 'user' } = req.user;
    const videoId = req.params.id;
    const version = req.query.version || 'original'; // Default to 'original' if no version is specified

    try {
        // Fetch video details from the database
        const videos = await req.db('Videos').where({ id: videoId });
        if (videos.length === 0) {
            return res.status(404).json({ error: true, message: "Video not found" });
        }

        const video = videos[0];
        if (role !== 'admin' && video.user_id !== req.user.userId) {
            return res.status(403).json({ error: true, message: "Access denied" });
        }

        let s3Key; // S3 key (path) for the video in the bucket

        // Determine which version of the video to download
        switch (version) {
            case 'transcoded':
                s3Key = video.transcoded_path;
                break;
            case 'filtered':
                s3Key = video.filtered_path;
                break;
            case 'stabilized':
                s3Key = video.stabilized_path;
                break;
            case 'original':
            default:
                s3Key = video.path;
                break;
        }

        // Ensure the requested file exists
        if (!s3Key) {
            return res.status(404).json({ error: true, message: `The requested version (${version}) of the video is not available.` });
        }

        // Generate pre-signed URL for downloading the video from S3
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: s3Key
        });

        const downloadUrl = await S3Presigner.getSignedUrl(s3Client, command, { expiresIn: 3600 }); // Pre-signed URL valid for 1 hour

        // Send the pre-signed URL to the client
        res.status(200).json({ error: false, downloadUrl });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


// Transcode video method
exports.transcodeVideo = async (req, res) => {
    const videoId = req.params.id;
    const userId = req.user.userId;

    try {
        // Step 1: Fetch video metadata from the database
        const videos = await req.db('Videos').where({ id: videoId });
        if (videos.length === 0) {
            return res.status(404).json({ error: true, message: "Video not found" });
        }
        const video = videos[0];

        // Send a message to SQS
        const command = new SQS.SendMessageCommand({
            QueueUrl: sqsQueueUrl,
            DelaySeconds: 5,
            MessageBody: JSON.stringify({
                userId: userId,
                videoId: videoId,
                jobType: "transcoded",
                videoPath: video.path
            }),
        });
        const response = await sqsClient.send(command);

        // Check if the response indicates success
        if (response) {
            await req.db('Videos').where({ id: videoId }).update({
                transcoded_path: `processing`
            });

            res.status(200).json({ error: false, message: "The video transcoding job has been successfully submitted" });
        } else {
            res.status(500).json({ error: true, message: "Failed to submit the video transcoding job" });
        }
    } catch (err) {
        console.error("Error during sending video transcoding job message to SQS:", err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


// Apply filter to video method
exports.filterVideo = async (req, res) => {
    const videoId = req.params.id;
    const userId = req.user.userId;

    try {
        // Step 1: Fetch video metadata from the database
        const videos = await req.db('Videos').where({ id: videoId });
        if (videos.length === 0) {
            return res.status(404).json({ error: true, message: "Video not found" });
        }
        const video = videos[0];

        // Send a message to SQS
        const command = new SQS.SendMessageCommand({
            QueueUrl: sqsQueueUrl,
            DelaySeconds: 5,
            MessageBody: JSON.stringify({
                userId: userId,
                videoId: videoId,
                jobType: "filtered",
                videoPath: video.path
            }),
        });
        const response = await sqsClient.send(command);

        // Check if the response indicates success
        if (response) {
            await req.db('Videos').where({ id: videoId }).update({
                filtered_path: `processing`
            });

            res.status(200).json({ error: false, message: "The video filtering job has been successfully submitted" });
        } else {
            res.status(500).json({ error: true, message: "Failed to submit the video filtering job" });
        }
    } catch (err) {
        console.error("Error during sending video filtering job message to SQS:", err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


// Stabilize video method
exports.stabilizeVideo = async (req, res) => {
    const videoId = req.params.id;
    const userId = req.user.userId;

    try {
        // Step 1: Fetch video metadata from the database
        const videos = await req.db('Videos').where({ id: videoId });
        if (videos.length === 0) {
            return res.status(404).json({ error: true, message: "Video not found" });
        }
        const video = videos[0];

        // Send a message to SQS
        const command = new SQS.SendMessageCommand({
            QueueUrl: sqsQueueUrl,
            DelaySeconds: 5,
            MessageBody: JSON.stringify({
                userId: userId,
                videoId: videoId,
                jobType: "stabilized",
                videoPath: video.path
            }),
        });
        const response = await sqsClient.send(command);

        // Check if the response indicates success
        if (response) {
            await req.db('Videos').where({ id: videoId }).update({
                stabilized_path: `processing`
            });

            res.status(200).json({ error: false, message: "The video stabilizing job has been successfully submitted" });
        } else {
            res.status(500).json({ error: true, message: "Failed to submit the video stabilizing job" });
        }
    } catch (err) {
        console.error("Error during sending video stabilizing job message to SQS:", err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


// Remove video method
exports.removeVideo = async (req, res) => {
    const videoId = req.params.id;
    const { role = 'user' } = req.user;

    try {
        const videos = await req.db('Videos').where({ id: videoId });
        if (videos.length === 0) {
            return res.status(404).json({ error: true, message: "Video not found" });
        }

        const video = videos[0];

        // Check if the user is authorized to delete the video (admin or the owner)
        if (role !== 'admin' && video.user_id !== req.user.userId) {
            return res.status(403).json({ error: true, message: "Access denied" });
        }

        // Delete the video file and associated versions from S3
        const s3Bucket = bucketName

        // Helper function to delete an object from S3
        const deleteFromS3 = async (key) => {
            if (key) {
                try {
                    const command = new DeleteObjectCommand({
                        Bucket: s3Bucket,
                        Key: key
                    });
                    await s3Client.send(command);
                    console.log(`Deleted from S3: ${key}`);
                } catch (err) {
                    console.error(`Error deleting ${key} from S3:`, err);
                }
            }
        };

        // Delete original, transcoded, filtered, and stabilized files from S3
        await deleteFromS3(video.path);
        await deleteFromS3(video.transcoded_path);
        await deleteFromS3(video.filtered_path);
        await deleteFromS3(video.stabilized_path);

        // Remove the video metadata from the database
        await req.db('Videos').where({ id: videoId }).del();

        res.status(200).json({ error: false, message: "Video removed successfully!" });
    } catch (err) {
        console.error("Error during video removal process:", err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


exports.updateVideoPath = async (req, res) => {
    const { bucket, key, type, videoId } = req.body;

    try {
        // Validate required fields
        if (!bucket || !key || !type || !videoId) {
            return res.status(400).json({ error: true, message: "Bucket, key, type, and videoId are required." });
        }

        // Determine which column to update based on the type
        let updateData;
        if (type === 'transcoded') {
            updateData = { transcoded_path: key };
        } else if (type === 'filtered') {
            updateData = { filtered_path: key };
        } else if (type === 'stabilized') {
            updateData = { stabilized_path: key };
        } else {
            return res.status(400).json({ error: true, message: "Invalid type specified. Must be 'transcoded', 'filtered', or 'stabilized'." });
        }

        // Update the specific path in the database
        const updateResult = await req.db('Videos').where({ id: videoId }).update(updateData);

        // Check if the update was successful
        if (updateResult === 0) {
            return res.status(404).json({ error: true, message: "Video not found or update failed." });
        }

        res.status(200).json({ error: false, message: `${type} path updated successfully.` });
    } catch (err) {
        console.error("Error updating video path:", err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};