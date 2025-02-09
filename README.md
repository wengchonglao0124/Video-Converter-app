
# Video Converter Application

This repository contains the source code for the **Video Converter Application**, which provides online video transformation services, including format transcoding, filtering, and noise reduction. The application is built using a microservices architecture and hosted on AWS.

---

## Application Overview
The Video Converter Application allows users to:
1. Upload videos for processing.
2. Perform tasks such as transcoding, filtering, and stabilizing.
3. Download processed videos.

Key features include user authentication (via AWS Cognito), asynchronous job handling (via SQS), and scalable video processing (using ECS).

---

## Architecture

![CleanShot 2025-02-09 at 22 35 46@2x](https://github.com/user-attachments/assets/24271ef7-099e-4e91-93d0-f8f2f0d5b158)

The application consists of the following components:
- **Frontend (Client)**: Built with React.js, provides a user-friendly interface for interacting with the application.
- **Backend (Server)**: Includes the following services:
  - **Video Upload Service**: Handles video uploads and metadata.
  - **Video Processing Service**: Processes video transformation jobs.
  - **Serverless Functions**: Updates metadata upon video processing completion.
- **AWS Services**:
  - **S3**: Stores raw and processed videos.
  - **Cognito**: Manages user authentication.
  - **SQS**: Facilitates asynchronous job communication.
  - **ECS**: Runs containerized services for processing.
  - **ALB**: Routes traffic and ensures secure HTTPS communication.

---

## Repository Structure
```
video-converter-app/
├── client/                  # Client-side code (React.js)
├── server/                  # Backend services (Upload, Processing, etc.)
│   ├── video-upload-service/
│   ├── video-processing-service/
│   ├── lambda-functions/
├── LICENSE                  # Project license
└── README.md                # Documentation (this file)
```

---

## Prerequisites
- **Node.js** (>=16.x.x)
- **AWS CLI** (configured with your AWS account)
- **Docker** (for ECS deployments)

---

## Setup Instructions
### 1. Clone the Repository
```
git clone https://github.com/your-repo/video-converter-app.git
cd video-converter-app
```

### 2. Set Up Client
Navigate to the `client` directory and install dependencies:
```
cd client
npm install
npm start
```
Access the client at `http://localhost:3000`.

### 3. Set Up Server
Deploy the backend services to AWS:
- **Video Upload Service**: Deploy to EC2.
- **Video Processing Service**: Deploy to ECS.
- **Lambda Functions**: Deploy using AWS SAM or CLI.

---

## Environment Variables
Create a `.env` file in the root directory and include:
```
REACT_APP_API_BASE_URL=http://your-api-url
REACT_APP_COGNITO_POOL_ID=your-cognito-pool-id
REACT_APP_COGNITO_CLIENT_ID=your-cognito-client-id
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_REGION=your-aws-region
```

Replace placeholders with your actual configuration values.

---

## Scaling
The application supports auto-scaling for high traffic scenarios:
- **ECS Services**: Scale up/down based on CPU and memory usage.
- **SQS Queue**: Scales video processing tasks dynamically.

---

## Security
- **AWS Cognito** for secure user authentication.
- **HTTPS** enforced using AWS Certificate Manager.
- Logs and metrics monitored via CloudWatch.

---

## Sustainability
- Stateless architecture with auto-scaling to minimize resource usage.
- Containers on ECS for efficient resource allocation.
- Serverless functions for event-driven workflows.

---

## License
This project is licensed under the [MIT License](LICENSE).

