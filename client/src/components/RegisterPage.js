import React, {useEffect, useState} from 'react';
import LoginPage, {Reset, Banner, Logo, Password, Username, Footer, Submit, Title} from '@react-login-page/page11';
import LoginLogo from 'react-login-page/logo-rect';
import LoginBannerBgImg from '../assets/banner.jpg';
import "../stylesheets/LoginPage.css";
import {useRegister} from "../services/authenticationAPIService";
import {NavLink, useNavigate} from "react-router-dom";


function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { register, loading, error } = useRegister();
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();

    const handleRegister = async () => {
        setErrorMessage("");
        const [success, message] = await register(username, password);
        if (success) {
            alert(message);
            navigate("/");
        }
        else {
            setErrorMessage(message);
        }
    };

    return (
        <div id="register" className="login-page login-page11 ">
            <LoginPage style={{height: 380}}>
                <Logo>
                    <LoginLogo/>
                </Logo>
                <Title>
                    Sign Up for VideoCon Pro
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

                <Submit onClick={handleRegister} index={4}>Register</Submit>

                <Banner>
                    <img src={LoginBannerBgImg} alt="banner"/>
                </Banner>

                <Footer>
                    <NavLink to="/" className="signup-link">Back to login</NavLink>
                </Footer>
            </LoginPage>
        </div>
    );
}

export default RegisterPage;