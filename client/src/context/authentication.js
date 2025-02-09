import { createContext, useState, useEffect, useContext } from "react";
import useServerURL from "../configurations/serverAddressConfig";
import {useError} from "./error";

const AuthenticationContext = createContext();

export const useAuthentication = () => useContext(AuthenticationContext);

export function AuthenticationProvider({ children }) {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userName, setUserName] = useState("");
    const [userRole, setUserRole] = useState("user");
    const { addError } = useError()

    useEffect(() => {
        if (isSignedIn) {
            updateUserRole();
        }
        else {
            setUserName("");
            setUserRole("");
        }
    }, [isSignedIn]);

    const getAccessToken = () => {
        try {
            let token = sessionStorage.getItem("accessToken");
            return token;
        } catch (error) {
            setIsSignedIn(false);
            console.error("Error loading access token:");
            addError(error);
        }
    };

    const updateUserRole = () => {
        try {
            let storedUserRole = sessionStorage.getItem("userRole");
            setUserRole(storedUserRole);
        } catch (error) {
            console.error("Error updating user role");
        }
    }

    const clearAccessToken = async () => {
        await sessionStorage.removeItem("accessToken");
        setIsSignedIn(false);
    }

    // const verifyAccessToken = async () => {
    //     try {
    //         let API_URL = useServerURL();
    //         let token = await getAccessToken();
    //
    //         if (token !== null) {
    //             const response = await fetch(`${API_URL}/verify-token`, {
    //                 method: "GET",
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                     "Authorization": `Bearer ${token}`,
    //                 }
    //             })
    //             const responseData = await response.json();
    //             if (!response.ok) {
    //                 setIsSignedIn(false);
    //                 await sessionStorage.removeItem("accessToken");
    //             } else {
    //                 setIsSignedIn(true);
    //             }
    //             console.log(responseData.message);
    //         }
    //         else {
    //             setIsSignedIn(false);
    //         }
    //     } catch (error) {
    //         console.error("Error verifying access token:", error);
    //         setIsSignedIn(false);
    //         await sessionStorage.removeItem("accessToken");
    //     }
    // };

    // useEffect(() => {
    //     verifyAccessToken();
    //
    // }, [isSignedIn]);

    return (
        <AuthenticationContext.Provider value={{ isSignedIn, setIsSignedIn, getAccessToken, clearAccessToken, userName, setUserName, userRole }}>
            {children}
        </AuthenticationContext.Provider>
    );
}