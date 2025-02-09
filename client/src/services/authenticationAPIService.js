import {useState} from "react";
import useServerURL from "../configurations/serverAddressConfig";
import {AuthFlowType, InitiateAuthCommand, SignUpCommand} from "@aws-sdk/client-cognito-identity-provider";
const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const jwt = require("aws-jwt-verify");

const cognitoClient = new Cognito.CognitoIdentityProviderClient({ region: process.env.REACT_APP_COGNITO_CLIENT_REGION });
const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
const userPoolId = process.env.REACT_APP_COGNITO_USER_POOL_ID;


const useLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    let API_URL = useServerURL();

    const idVerifier = jwt.CognitoJwtVerifier.create({
        userPoolId: userPoolId,
        tokenUse: "id",
        clientId: clientId,
    });

    const login = async (username, password) => {
        setLoading(true);
        setError(null);

        try {
            // Prepare login command using Cognito
            const command = new InitiateAuthCommand({
                AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password,
                },
                ClientId: clientId,
            });

            // Send the login command to Cognito
            const res = await cognitoClient.send(command);
            // Extract tokens (ID Token, Access Token, Refresh Token)
            const { IdToken, AccessToken, RefreshToken } = res.AuthenticationResult;

            // // Verify the ID Token
            // const IdTokenVerifyResult = await idVerifier.verify(IdToken);
            // console.log("ID Token Verified", IdTokenVerifyResult);

            // Save tokens and user role in session storage
            // await sessionStorage.setItem("accessToken", AccessToken);
            await sessionStorage.setItem("accessToken", IdToken);
            // await sessionStorage.setItem("refreshToken", RefreshToken);
            return null;
        } catch (err) {
            const errorMessage = err.message || "Login failed";
            setError(errorMessage);
            return errorMessage;
        } finally {
            setLoading(false);
        }
    };

    return { login, loading, error };
};


const useRegister = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    let API_URL = useServerURL();

    const register = async (username, password) => {
        setLoading(true);
        setError(null);

        try {
            const signUpCommand = new SignUpCommand({
                ClientId: clientId,
                Username: username,
                Password: password,
                UserAttributes: [
                    { Name: "email", Value: username }
                ]
            });
            const signUpResponse = await cognitoClient.send(signUpCommand);
            console.log("User signed up:", signUpResponse);
            return [true, "Registration successful. Please check your email for verification."];
        } catch (err) {
            const errorMessage = err.message || 'An error occurred during registration';
            setError(errorMessage);
            return [false, errorMessage];
        } finally {
            setLoading(false);
        }
    };

    return { register, loading, error };
};


const useForgotPassword = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    let API_URL = useServerURL();

    const forgotPassword = async (username) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/users/forgot-password`, {
                method: "POST",
                body: JSON.stringify({
                    "username": username,
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            })
            const responseData = await response.json();
            if (!response.ok) {
                return [false, responseData.message || 'An error occurred during forgot-password'];
            }
            return [true, responseData.message];
        } catch (err) {
            setError(err.response ? err.response.data : err.message);
            return [false, err.response ? err.response.data : err.message];
        } finally {
            setLoading(false);
        }
    };

    return { forgotPassword, loading, error };
};


const useResetPassword = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    let API_URL = useServerURL();

    const resetPassword = async (username, pin, newPassword) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/users/reset-password`, {
                method: "POST",
                body: JSON.stringify({
                    "username": username,
                    "pin": pin,
                    "newPassword": newPassword,
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            })
            const responseData = await response.json();
            if (!response.ok) {
                return [false, responseData.message || 'An error occurred during reset password'];
            }
            return [true, responseData.message];
        } catch (err) {
            setError(err.response ? err.response.data : err.message);
            return [false, err.response ? err.response.data : err.message];
        } finally {
            setLoading(false);
        }
    };

    return { resetPassword, loading, error };
};


export {useLogin, useRegister, useForgotPassword, useResetPassword};