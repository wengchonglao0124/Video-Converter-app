const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { CognitoIdentityProviderClient, AdminListGroupsForUserCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

// Initialize the SSM client
const ssmClient = new SSMClient({
    region: process.env.CLIENT_REGION
});

// Initialize the Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
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

let clientId;
let userPoolId;
let idVerifier;

const loadParameters = async () => {
    clientId = await getParameter('/n11679719/assessment2/COGNITO_CLIENT_ID'); // Cognito Client ID
    userPoolId = await getParameter('/n11679719/assessment2/COGNITO_USER_POOL_ID'); // Cognito User Pool ID

    // Create JWT verifier for AWS Cognito ID tokens
    idVerifier = CognitoJwtVerifier.create({
        userPoolId: userPoolId,
        tokenUse: "id",  // We are verifying ID tokens
        clientId: clientId,
    });
}

(async () => {
    await loadParameters();
})();


exports.authenticateToken = async (req, res, next) => {
    try {
        const token = req.headers["authorization"];
        if (!token) return res.sendStatus(401);  // Return 401 if no token is provided

        // Verify the ID token using AWS Cognito
        const payload = await idVerifier.verify(token);

        // Attach the user information from the token payload to the request object
        req.user = {
            userId: payload.sub,  // Cognito User ID (sub)
        };
        console.log("Token verified for:", payload.sub);

        // Check if the user belongs to the "Admin" group
        const command = new AdminListGroupsForUserCommand({
            UserPoolId: userPoolId,
            Username: payload.sub  // Cognito User ID (sub)
        });

        const response = await cognitoClient.send(command);
        const groups = response.Groups.map(group => group.GroupName);

        // Attach user role (admin or user) to the request object
        if (groups.includes("Admin")) {
            req.user.role = "admin";
        } else {
            req.user.role = "user";
        }
        console.log("User role:", req.user.role);

        // Proceed to the next middleware or route handler
        next();
    } catch (err) {
        console.error("Token verification failed:", err);
        return res.sendStatus(403);  // Return 403 if token verification fails
    }
};


exports.register = async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        console.log("Request body incomplete - username and password needed");
        return res.status(400).json({
            error: true,
            message: "Request body incomplete - username and password needed"
        });
    }

    try {
        const users = await req.db('Users').where({ username });
        if (users.length > 0) {
            console.log("User already exists");
            return res.status(409).json({
                error: true,
                message: "User already exists"
            });
        }

        const hash = bcrypt.hashSync(password, 10);
        await req.db('Users').insert({ username, hash, role: role || 'user' });
        console.log("Successfully registered user");
        res.status(201).json({ error: false, message: "User registered successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        console.log("Request body incomplete - username and password needed");
        return res.status(400).json({
            error: true,
            message: "Request body incomplete - username and password needed"
        });
    }

    try {
        const users = await req.db('Users').where({ username });
        if (users.length === 0) {
            console.log("User does not exist");
            return res.status(404).json({
                error: true,
                message: "User does not exist"
            });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.hash);
        if (!match) {
            console.log("Password does not match");
            return res.status(400).json({
                error: true,
                message: "Password does not match"
            });
        }

        const secretKey = process.env.SECRET_KEY;
        const expires_in = 60 * 60 * 24; // 1 day
        const token = jwt.sign({ username, role: user.role }, secretKey, { expiresIn: expires_in });
        console.log("Access Token sent");
        res.status(200).json({ token_type: "Bearer", token, expires_in, username: username, role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


exports.forgotPassword = async (req, res) => {
    const { username } = req.body;

    if (!username) {
        console.log("Request body incomplete - username is required");
        return res.status(400).json({
            error: true,
            message: "Request body incomplete - username is required"
        });
    }

    try {
        const users = await req.db('Users').where({ username });
        if (users.length === 0) {
            console.log("Attempt to reset password for non-existent account.");
            return res.status(200).json({
                message: "If an account with that username exists, we have sent a pin to reset the password."
            });
        }

        const user = users[0];
        const resetPin = Math.floor(100000 + Math.random() * 900000);  // Generates a six-digit pin
        const pinHash = bcrypt.hashSync(resetPin.toString(), 10);
        const exp = new Date(Date.now() + 5 * 60 * 1000);

        await req.db('ResetPins').insert({
            user_id: user.id,
            pin_hash: pinHash,
            expires_at: exp,
            is_used: false
        });

        console.log(`Generated PIN for ${username}: ${resetPin}`);
        res.status(200).json({
            message: "If an account with that username exists, we have sent a pin to reset the password."
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


exports.resetPassword = async (req, res, next) => {
    const { username, pin, newPassword } = req.body;

    if (!username || !pin || !newPassword) {
        console.log("Request must include username, pin, and new password");
        return res.status(400).json({
            error: true,
            message: "Request must include username, pin, and new password"
        });
    }

    try {
        const users = await req.db('Users').where({ username });
        if (users.length === 0) {
            return res.status(400).json({ message: "Invalid or expired PIN." });
        }

        const user = users[0];
        const pins = await req.db('ResetPins').where({
            user_id: user.id,
            is_used: false
        });

        if (!pins.length) {
            console.log("Invalid or expired PIN.");
            return res.status(400).json({ message: "Invalid or expired PIN." });
        }

        // Sort pins by expires_at in descending order
        pins.sort((a, b) => new Date(b.expires_at) - new Date(a.expires_at));

        const pinRecord = pins[0];
        if (bcrypt.compareSync(pin, pinRecord.pin_hash) && new Date(pinRecord.expires_at) > new Date()) {
            console.log("Valid PIN provided");
            const hash = bcrypt.hashSync(newPassword, 10);
            await req.db('Users').where("id", "=", user.id).update({ hash });
            await req.db('ResetPins').where("user_id", "=", user.id).update({ is_used: true });
            console.log("Password has been reset successfully.");
            res.status(200).json({ message: "Password has been reset successfully." });
            next();
        } else {
            console.log("Invalid or expired PIN.");
            res.status(400).json({ message: "Invalid or expired PIN." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};


exports.cleanupUsedPins = async (req) => {
    try {
        await req.db('ResetPins').where({ is_used: true }).del();
        console.log("Used PINs cleaned up successfully.");
    } catch (err) {
        console.error("Failed to clean up used PINs: ", err);
    }
};


exports.getUsersInfo = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: true, message: "Access denied" });
    }

    try {
        const users = await req.db('Users')
            .select('Users.id', 'Users.username', 'Users.role')
            .count('Videos.id as video_count')
            .leftJoin('Videos', 'Users.id', 'Videos.user_id')
            .groupBy('Users.id');

        res.status(200).json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
};