import {
    Outlet
} from "react-router-dom";


function AuthenticationPage() {
    return(
        <div id="authenticationPage">
            <Outlet />
        </div>
    );
}

export default AuthenticationPage;