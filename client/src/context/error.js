import React, {createContext, useState, useContext, useEffect} from 'react';


const ErrorContext = createContext();

export const useError = () => useContext(ErrorContext);

export const ErrorProvider = ({ children }) => {
    const [error, setError] = useState(null);

    const addError = (error) => {
        if (error instanceof Error) {
            setError(error);
        } else {
            setError(new Error(error.toString()));
        }
    };

    const clearError = () => {
        setError(null);
    };

    useEffect(() => {
        if (error !== null && error !== undefined && error !== "") {
            console.log("Error Message:")
            console.log(error);
            alert(error);
            clearError();
        }
    }, [error]);

    return (
        <ErrorContext.Provider value={{ error, addError, clearError }}>
            {children}
        </ErrorContext.Provider>
    );
};