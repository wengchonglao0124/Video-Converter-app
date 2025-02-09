DROP SCHEMA IF EXISTS videoConverter;
CREATE SCHEMA videoConverter;
USE videoConverter;
SET AUTOCOMMIT=0;


--
-- Table structure for table `Users`
--
DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(45) NOT NULL UNIQUE,
    hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    PRIMARY KEY (id)
);

--
-- Table structure for table `ResetPins`
--
DROP TABLE IF EXISTS `ResetPins`;
CREATE TABLE `ResetPins` (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

--
-- Table structure for table `Videos`
--
DROP TABLE IF EXISTS `Videos`;
CREATE TABLE `Videos` (
    id BIGINT PRIMARY KEY,
    user_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    transcoded_path VARCHAR(255),        -- Path for the transcoded video
    filtered_path VARCHAR(255),          -- Path for the filtered video
    stabilized_path VARCHAR(255),        -- Path for the stabilized video
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp of the video upload
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);


COMMIT;

SET AUTOCOMMIT = 1;