import fetch from 'node-fetch';

export const handler = async (event) => {
    console.log("S3 Event:", JSON.stringify(event, null, 2));

    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;

    console.log("Bucket:", bucket);
    console.log("Key:", key);

    try {
        // Extract the type (e.g., transcoded, raw, filtered) from the S3 key prefix
        const type = key.split('/')[0]; // Gets the first part of the key before the slash

        // If type is "raw", no further action is needed
        if (type === "raw") {
            console.log("Type is 'raw'; no action needed.");
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "No action needed for raw files."
                })
            };
        }

        // Extract the file name from the S3 key by removing any folder prefix
        const fileName = key.split('/').pop(); // Gets only the file name without the prefix

        // Extract the videoId from the last hyphen and before the file extension
        const videoId = fileName.split('-').pop().split('.')[0];

        // Log the type and videoId
        console.log("Type:", type);
        console.log("Video ID:", videoId);

        // Create payload to send to the server
        const payload = {
            bucket: bucket,
            key: key,
            type: type,
            videoId: videoId
        };

        // Send the POST request to the server to update the video path
        const response = await fetch('http://ec2-54-253-157-126.ap-southeast-2.compute.amazonaws.com:3000/video/update-path', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (response.ok) {
            console.log("Database update successful:", responseData);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Database update successful",
                    data: responseData
                })
            };
        } else {
            console.error("Failed to update database:", responseData);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: "Failed to update database",
                    error: responseData
                })
            };
        }

    } catch (err) {
        console.log("Error processing file:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error processing file',
                error: err.message
            })
        };
    }
};