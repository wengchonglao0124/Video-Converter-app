import {useAuthentication} from "../context/authentication";
import LoginHome from "./LoginPage";
import WorkingPage from "./WorkingPage";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import AuthenticationPage from "./AuthenticationPage";
import RegisterPage from "./RegisterPage";
import ForgotPasswordPage from "./ForgotPasswordPage";


const router = createBrowserRouter([
    {
        path: "/",
        element: <AuthenticationPage />,

        children: [
            {
                path: "/",
                element: <LoginHome />,
            },
            {
                path: "/register",
                element: <RegisterPage />,
            },
            {
                path: "/forgot",
                element: <ForgotPasswordPage />,
            }
        ],
    },
]);

function MainPage() {
    const { isSignedIn } = useAuthentication();

    return (
        <div id="main">
            {isSignedIn ? (
                <div>
                    <WorkingPage />
                </div>
            ) : (
                <RouterProvider router={router} />
            )}
        </div>
    );
}

export default MainPage;