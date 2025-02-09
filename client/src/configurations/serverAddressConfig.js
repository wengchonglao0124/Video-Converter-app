
const useServerURL = () => {
    return `${window.location.protocol}//${process.env.REACT_APP_SERVER_URL}:${process.env.REACT_APP_SERVER_PORT}`;
}

export default useServerURL;