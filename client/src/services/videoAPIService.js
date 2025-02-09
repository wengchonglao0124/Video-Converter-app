import { useState } from "react";
import useServerURL from "../configurations/serverAddressConfig";


const useUploadVideo = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    let API_URL = useServerURL();

    const uploadVideo = async (token, file) => {
        setLoading(true);
        setError(null);

        try {
            // Step 1: Request a pre-signed URL from the server
            const response = await fetch(`${API_URL}/video/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "filename": file.name  // Only send the filename to request the pre-signed URL
                })
            });

            const responseData = await response.json();
            if (!response.ok) {
                return [false, responseData.message || 'An error occurred while requesting pre-signed URL'];
            }

            // Get the pre-signed URL from the server's response
            const { uploadUrl } = responseData;

            // Step 2: Upload the video file directly to S3 using the pre-signed URL
            const s3UploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: file  // Directly upload the file to S3
            });

            if (!s3UploadResponse.ok) {
                return [false, 'An error occurred during the video upload to S3'];
            }

            return [true, "Video uploaded successfully!"];
        } catch (err) {
            setError(err.message);
            return [false, err.message];
        } finally {
            setLoading(false);
        }
    };

    return { uploadVideo, loading, error };
};


const useListVideos = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    let API_URL = useServerURL();

    const fetchVideos = async (token) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/video`, {
                method: "GET",
                headers: {
                    "Authorization": `${token}`
                }
            });

            const responseData = await response.json();
            if (!response.ok) {
                setError(responseData.message || 'An error occurred while fetching videos');
                return;
            }
            return [true, responseData.message];
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    return { fetchVideos, loading, error };
};


const useDownloadVideo = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    let API_URL = useServerURL();

    const downloadVideo = async (token, videoId, version) => {
        setLoading(true);
        setError(null);

        try {
            // Step 1: Request the pre-signed URL from the server
            const response = await fetch(`${API_URL}/video/download/${videoId}?version=${version}`, {
                method: "GET",
                headers: {
                    "Authorization": `${token}`,
                    "Content-Type": "application/json"
                }
            });

            const responseData = await response.json();
            if (!response.ok) {

                return [false, responseData.message || 'An error occurred while fetching the pre-signed URL'];
            }
            const { downloadUrl } = responseData;

            // Step 2: Fetch the file from the pre-signed URL
            const fileResponse = await fetch(downloadUrl);
            if (!fileResponse.ok) {
                throw new Error('Error downloading the video file from S3');
            }

            // Step 3: Convert the response into a blob
            const blob = await fileResponse.blob();

            // Step 4: Create a download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${videoId}-${version}.mp4`);  // Set the file name for download
            document.body.appendChild(link);
            link.click();  // Trigger the download
            document.body.removeChild(link);  // Clean up

            // Revoke the object URL to release memory
            window.URL.revokeObjectURL(url);

            return [true, 'Video downloaded successfully'];
        } catch (err) {
            setError(err.message);
            return [false, err.message];
        } finally {
            setLoading(false);
        }
    };

    return { downloadVideo, loading, error };
};


const useProcessVideo = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    let API_URL = useServerURL();

    const processVideo = async (token, videoId, action) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/video/${action}/${videoId}`, {
                method: "POST",
                headers: {
                    "Authorization": `${sessionStorage.getItem("accessToken")}`
                }
            });

            const responseData = await response.json();
            if (!response.ok) {
                return [false, responseData.message || `An error occurred during video ${action}`];
            }
            return [true, responseData.message];
        } catch (err) {
            setError(err.message);
            return [false, err.message];
        } finally {
            setLoading(false);
        }
    };

    return { processVideo, loading, error };
};


const useRemoveVideo = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    let API_URL = useServerURL();

    const removeVideo = async (token, videoId) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/video/remove/${videoId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `${token}`
                }
            });

            const responseData = await response.json();
            if (!response.ok) {
                setError(responseData.message || 'An error occurred during video removal')
                return [false, responseData.message || 'An error occurred during video removal'];
            }
            return [true, responseData.message];
        } catch (err) {
            setError(err.message);
            return [false, err.message];
        } finally {
            setLoading(false);
        }
    };

    return { removeVideo, loading, error };
};


export {useUploadVideo, useListVideos, useDownloadVideo, useProcessVideo, useRemoveVideo};