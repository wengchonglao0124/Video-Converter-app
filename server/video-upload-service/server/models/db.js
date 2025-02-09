SecretsManager = require("@aws-sdk/client-secrets-manager");

const secret_name = process.env.SECRET_MANAGER_NAME;
const client = new SecretsManager.SecretsManagerClient({
    region: process.env.CLIENT_REGION
});

let secret;

async function getSecret() {
    try {
        response = await client.send(
            new SecretsManager.GetSecretValueCommand({
                SecretId: secret_name
            })
        );
        const secretData = JSON.parse(response.SecretString);
        secret = secretData.DB_PASSWORD;
        console.log("Successfully retrieved secret for:", secret_name);
    } catch (error) {
        console.log(error);
    }
}

async function initializeDb() {
    await getSecret(); // Ensure the secret is fetched before proceeding

    const db = {
        client: "mysql2",
        connection: {
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'videoConverter',
            user: process.env.DB_USER || 'root',
            password: secret || '', // Use the retrieved secret
        },
    };

    return db;
}

module.exports = initializeDb;