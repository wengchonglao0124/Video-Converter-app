import {useEffect, useState} from "react";
import {
    useDownloadVideo,
    useListVideos,
    useProcessVideo,
    useRemoveVideo,
    useUploadVideo
} from "../services/videoAPIService";
import {useError} from "../context/error";
import {useAuthentication} from "../context/authentication";
import "../stylesheets/WorkingPage.css";


function WorkingPage() {
    const { userName, getAccessToken, clearAccessToken, userRole } = useAuthentication();
    const { addError } = useError()

    const [file, setFile] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile)
        }
    };

    useEffect(() => {
        if (file) {
            setSelectedFileName(file.name);
        }
        else {
            setSelectedFileName('');
        }
    }, [file]);

    const { uploadVideo, loadingUpload, errorUpload } = useUploadVideo();

    const handleUpload = async () => {
        if (file) {
            const [success, message] = await uploadVideo(getAccessToken(), file);
            if (success) {
                handleFetchVideos();
                alert('Video uploaded successfully');
                setFile(null);
            } else {
                addError(`Upload failed:\n${message}`);
            }
        }
    };

    const { fetchVideos, loadingList, errorList } = useListVideos();
    const [videos, setVideos] = useState([]);

    const handleFetchVideos = async () => {
        const [success, message] = await fetchVideos(getAccessToken());
        if (success) {
            const sortedVideos = message.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setVideos(sortedVideos)
        } else {
            addError(`Fetch videos failed:\n${message}`);
        }
    }

    useEffect(() => {
        handleFetchVideos();
    
        // Set up the interval to call the function every 15 seconds
        const interval = setInterval(() => {
            handleFetchVideos();
        }, 15000); // 15000 milliseconds = 15 seconds
    
        // Clean up the interval when the component is unmounted or when dependencies change
        return () => clearInterval(interval);
    }, []);

    const [processingVideo, setProcessingVideo] = useState([]);

    function addProcessingVideo(videoId, action) {
        setProcessingVideo(prevState => [...prevState, [videoId, action]]);
    }

    function clearProcessingVideo(videoId, action) {
        setProcessingVideo(prevState => prevState.filter(item => item[0] !== videoId || item[1] !== action));
    }

    function isProcessing(videoId, action) {
        return processingVideo.some(
            ([id, act]) => id === videoId && act === action
        );
    }

    function isAnyProcessing(videoId) {
        return processingVideo.some(
            ([id, act]) => id === videoId
        );
    }

    useEffect(() => {
        console.log(`Processing videos: ${processingVideo}`);
    }, [processingVideo]);

    const { removeVideo, loading: loadingRemove, error: errorRemove } = useRemoveVideo();

    const handleRemove = async (videoId) => {
        addProcessingVideo(videoId, "remove");
        const [success, message] = await removeVideo(getAccessToken(), videoId);
        if (success) {
            handleFetchVideos();
            alert('Video removed successfully');
        } else {
            addError(`Failed to remove video:\n${message}`);
        }
        clearProcessingVideo(videoId, "remove");
    };

    const { processVideo, loading: loadingProcess, error: errorProcess } = useProcessVideo();

    const handleProcess = async (videoId, action) => {
        addProcessingVideo(videoId, action);
        const [success, message] = await processVideo(getAccessToken(), videoId, action);
        if (success) {
            handleFetchVideos();
            alert(`${message}`);
        } else {
            addError(`Failed to ${action} video:\n${message}`)
        }
        clearProcessingVideo(videoId, action);
    };

    const { downloadVideo } = useDownloadVideo();

    const handleDownload = async (videoId, version) => {
        addProcessingVideo(videoId, `download-${version}`);
        const [success, message] = await downloadVideo(getAccessToken(), videoId, version);
        if (!success) {
            addError(`Failed to download video:\n${message}`);
        }
        clearProcessingVideo(videoId, `download-${version}`);
    };

    const handleLogout = async () => {
        clearAccessToken();
    }

    return (
        <div id="WorkingPage">
            <div className="header">
                <button onClick={() => handleLogout()} className="logout-button">
                    Log out
                </button>
                <p className="user-name">{userRole !== "admin" ? "Welcome, " : ""}{userName}{userRole === "admin" ? " (Admin)" : ""}</p>
            </div>

            <div className="video-list">
            <h2>{userRole === "admin" ? "All Available Videos" : "Your Videos"}</h2>

                <div className="video-upload">
                    <label className="file-upload">
                        <input type="file" onChange={handleFileChange} accept="video/*"/>
                        <span>Select Video</span>
                    </label>
                    <span className="file-name">{selectedFileName || 'No file selected'}</span>
                    <button onClick={handleUpload} disabled={loadingUpload || !selectedFileName}>
                        {loadingUpload ? 'Uploading...' : 'Upload'}
                    </button>
                </div>

                {videos.length === 0 ? (
                    <div>
                        <p>No videos found.</p>
                        <p>Please upload your first video file to proceed.</p>
                    </div>
                ) : (
                    <ul>
                        {videos.map(video => (
                            <li key={video.id}>
                                <div className="video-info">
                                    <h3>File Name: {video.filename}</h3>
                                    <br/>
                                    {video.user_id &&
                                        <p>
                                            <strong>Owned by (User ID):</strong> {video.user_id}
                                        </p>
                                    }
                                    <p>
                                        <strong>Uploaded At:</strong> {new Date(video.created_at).toLocaleString()}
                                    </p>
                                    <br/>

                                    <div className="video-status">
                                        <div className="status-item">
                                            <p>
                                                <strong>Transcoded:</strong>
                                                <br/>
                                                {video.transcoded_path !== null ? 'Yes' : 'No'}
                                            </p>
                                            {video.transcoded_path !== null ? (
                                                video.transcoded_path === "processing" ? (
                                                    <button disabled>
                                                        Processing...
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleDownload(video.id, 'transcoded')}
                                                            disabled={isProcessing(video.id, "remove") || isProcessing(video.id, "download-transcoded")}>
                                                        {isProcessing(video.id, "download-transcoded") ? 'Downloading...' : 'Download'}
                                                    </button>
                                                )
                                            ) : (
                                                <button onClick={() => handleProcess(video.id, 'transcode')}
                                                        disabled={isProcessing(video.id, "transcode") || isProcessing(video.id, "remove")}>
                                                    {isProcessing(video.id, "transcode") ? 'Processing...' : 'Process'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="status-item">
                                            <p><strong>Filtered:</strong>
                                                <br/>
                                                {video.filtered_path !== null ? 'Yes' : 'No'}
                                            </p>
                                            {video.filtered_path !== null ? (
                                                video.filtered_path === "processing" ? (
                                                    <button disabled>
                                                        Processing...
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleDownload(video.id, 'filtered')}
                                                            disabled={isProcessing(video.id, "remove") || isProcessing(video.id, "download-filtered")}>
                                                        {isProcessing(video.id, "download-filtered") ? 'Downloading...' : 'Download'}
                                                    </button>
                                                )
                                            ) : (
                                                <button onClick={() => handleProcess(video.id, 'filter')}
                                                        disabled={isProcessing(video.id, "filter") || isProcessing(video.id, "remove")}>
                                                    {isProcessing(video.id, "filter") ? 'Processing...' : 'Process'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="status-item">
                                            <p>
                                                <strong>Stabilized:</strong>
                                                <br/>
                                                {video.stabilized_path !== null ? 'Yes' : 'No'}
                                            </p>
                                            {video.stabilized_path !== null ? (
                                                video.stabilized_path === "processing" ? (
                                                    <button disabled>
                                                        Processing...
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleDownload(video.id, 'stabilized')}
                                                            disabled={isProcessing(video.id, "remove") || isProcessing(video.id, "download-stabilized")}>
                                                        {isProcessing(video.id, "download-stabilized") ? 'Downloading...' : 'Download'}
                                                    </button>
                                                )
                                            ) : (
                                                <button onClick={() => handleProcess(video.id, 'stabilize')}
                                                        disabled={isProcessing(video.id, "stabilize") || isProcessing(video.id, "remove")}>
                                                    {isProcessing(video.id, "stabilize") ? 'Processing...' : 'Process'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <button className="download-original-button"
                                            onClick={() => handleDownload(video.id, 'original')}
                                            disabled={isProcessing(video.id, "remove") || isProcessing(video.id, "download-original")}>
                                        {isProcessing(video.id, "download-original") ? 'Downloading Original...' : 'Download Original'}
                                    </button>
                                </div>

                                {/* Remove Button */}
                                <button onClick={() => handleRemove(video.id)}
                                        disabled={isProcessing(video.id, "remove") || isAnyProcessing(video.id)}
                                        className="remove-button">
                                    {isProcessing(video.id, "remove") ? 'Removing...' : 'Remove Video'}
                                </button>
                                {errorRemove && processingVideo === video.id &&
                                    <p className="error-message">{errorRemove}</p>
                                }
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default WorkingPage;