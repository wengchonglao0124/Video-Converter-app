DROP SCHEMA IF EXISTS videoConverter;
CREATE SCHEMA videoConverter;
USE videoConverter;
SET AUTOCOMMIT=0;

--
-- Table structure for table `Videos`
--
DROP TABLE IF EXISTS `Videos`;
CREATE TABLE `Videos` (
    id VARCHAR(255) NOT NULL,  -- Unique video identifier
    user_id VARCHAR(255) NOT NULL,  -- Using Cognito User ID 
    filename VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    transcoded_path VARCHAR(255),  -- Path for the transcoded video
    filtered_path VARCHAR(255),    -- Path for the filtered video
    stabilized_path VARCHAR(255),  -- Path for the stabilized video
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp of the video upload
    PRIMARY KEY (id, user_id)  -- Composite primary key using videoId and user_id
);


COMMIT;

SET AUTOCOMMIT = 1;