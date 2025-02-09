import React, {useEffect, useState} from 'react';
import LoginPage, {Reset, Banner, Logo, Password, Username, Footer, Submit, Title} from '@react-login-page/page11';
import LoginLogo from 'react-login-page/logo-rect';
import LoginBannerBgImg from '../assets/banner.jpg';
import "../stylesheets/LoginPage.css"
import {useAuthentication} from "../context/authentication";
import {useLogin} from "../services/authenticationAPIService";
import {
    NavLink
} from "react-router-dom";


function LoginHome() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading, error } = useLogin();
    const [errorMessage, setErrorMessage] = useState('');
    const { setIsSignedIn, setUserName } = useAuthentication();

    const handleSignIn = async () => {
        setErrorMessage("");
        const errResult = await login(username, password);
        if (errResult) {
            setErrorMessage(errResult.toString());
        }
        else {
            setIsSignedIn(true);
            setUserName(username);
            console.log("Successfully logged in!");
        }
    };

    return (
        <div id="login" className="login-page login-page11 ">
            <LoginPage style={{height: 380}}>
                <Logo>
                    <LoginLogo/>
                </Logo>
                <Title>
                    VideoCon Pro
                </Title>

                <Username label=""
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          index={1}
                          placeholder="Email"
                />

                <Password
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    index={2}
                />

                <Username keyname="error" visible={false} index={3}>
                    <span className="error-message">
                        { errorMessage !== "" && errorMessage !== null && errorMessage !== undefined ?
                            errorMessage : null
                        }
                    </span>
                </Username>

                {/*<Username keyname="forgotPassword" visible={false} index={4}>*/}
                {/*    <NavLink to="/forgot" className="signup-link"> Forgot Password</NavLink>*/}
                {/*</Username>*/}

                <Submit onClick={handleSignIn}>Login</Submit>

                <Banner>
                    <img src={LoginBannerBgImg} alt="banner"/>
                </Banner>

                <Footer>
                    Not a member?
                    <NavLink to="/register" className="signup-link"> Sign up now</NavLink>
                </Footer>
            </LoginPage>
        </div>
    );
}

export default LoginHome;