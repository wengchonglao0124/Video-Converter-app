import './App.css';
import MainPage from "./components/MainPage";
import {AuthenticationProvider} from "./context/authentication";
import {ErrorProvider} from "./context/error";
import {useEffect} from "react";


function App() {
    useEffect(() => {
        const currentUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}${window.location.pathname}${window.location.search}`;
        console.log("Client URL:", currentUrl);
    }, []);

    return (
      <ErrorProvider>
          <AuthenticationProvider>
              <MainPage />
          </AuthenticationProvider>
      </ErrorProvider>
  );
}

export default App;
