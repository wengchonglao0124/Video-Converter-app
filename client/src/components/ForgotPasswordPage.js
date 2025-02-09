import LoginPage, {Banner, Footer, Input, Password, Submit, Title, Username} from "@react-login-page/page11";
import LoginBannerBgImg from "../assets/banner.jpg";
import {NavLink, useNavigate} from "react-router-dom";
import React, {useState} from "react";
import {useForgotPassword, useResetPassword} from "../services/authenticationAPIService";

function ForgotPasswordPage() {
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [password, setPassword] = useState('');
    const [didSendResetCode, setDidSendResetCode] = useState(false);
    const { forgotPassword, loadingForgot, errorForgot } = useForgotPassword();
    const { resetPassword, loadingReset, errorReset } = useResetPassword();
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();

    const handleForgotPassword = async () => {
        setErrorMessage("");
        const [success, message] = await forgotPassword(username);
        if (success) {
            setDidSendResetCode(true);
            alert(message);
        }
        else {
            setErrorMessage(message);
        }
    };

    const handleResetCodeChange = (e) => {
        const value = e.target.value;
        if (/^\d{0,6}$/.test(value)) {
            setPin(value);
        }
    };

    const handleResetPassword = async () => {
        setErrorMessage("");
        const [success, message] = await resetPassword(username, pin, password);
        if (success) {
            alert(message);
            navigate("/");
        }
        else {
            setErrorMessage(message);
        }
    };

    return(
        <div id="forgot-password" className="login-page login-page11 ">
            <LoginPage style={{height: 380}}>
                <Title>
                    Forgot Password
                </Title>

                <Username label=""
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          index={1}
                />

                <Password
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    index={2}
                    visible={didSendResetCode}
                />

                <Input
                    name="resetCode"
                    index={3}
                    placeholder="Reset Code"
                    value={pin}
                    onChange={handleResetCodeChange}
                    style={{ width: '120px' }}
                    visible={didSendResetCode}
                />

                <Username keyname="error" visible={false} index={4}>
                    <span className="error-message">
                        { errorMessage !== "" && errorMessage !== null && errorMessage !== undefined ?
                            errorMessage : null
                        }
                    </span>
                </Username>

                <Submit onClick={!didSendResetCode ? handleForgotPassword : handleResetPassword} index={5}>
                    {!didSendResetCode ?
                        "Send Reset Code" : "Reset Password"
                    }
                </Submit>

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

export default ForgotPasswordPage;