const express = require("express");
const router = express.Router();

// Controllers
const videoController = require("../controllers/videoController");
const userController = require('../controllers/userController');

// Middleware for JWT authentication
const authenticateToken = userController.authenticateToken;

// Upload a video
router.route("/upload")
    .post(authenticateToken, videoController.uploadVideo);

// Get all videos for the user or all videos for admin
router.route("/")
    .get(authenticateToken, videoController.getUserVideos);

// Download a video
router.route('/download/:id')
    .get(authenticateToken, videoController.downloadVideo);

// Transcode a video
router.route('/transcode/:id')
    .post(authenticateToken, videoController.transcodeVideo);

// Apply a filter to a video
router.route('/filter/:id')
    .post(authenticateToken, videoController.filterVideo);

// Stabilize a video
router.route('/stabilize/:id')
    .post(authenticateToken, videoController.stabilizeVideo);

// Remove a video
router.route('/remove/:id')
    .delete(authenticateToken, videoController.removeVideo);

// Update meta data
router.route('/update-path')
    .post(videoController.updateVideoPath);


module.exports = router;