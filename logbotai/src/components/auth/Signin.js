import '../../styles/signin.css';
import React, { useContext, useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from "../firebase.js";
import { AuthContext } from '../AuthProvider';

const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@(hotmail\.com|gmail\.com)$/;
const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;

const Signin = () => {
    const { currentUser } = useContext(AuthContext);
    let navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            navigate("/");
        }
    }, [currentUser, navigate]);

    const userRef = useRef();
    const errRef = useRef();

    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [validEmail, setValidEmail] = useState(false);
    const [pwd, setPwd] = useState('');
    const [validPwd, setValidPwd] = useState(false);
    const [errMsg, setErrMsg] = useState('');

    useEffect(() => {
        const result = EMAIL_REGEX.test(email);
        setValidEmail(result);
    }, [email]);

    useEffect(() => {
        const result = PWD_REGEX.test(pwd);
        setValidPwd(result);
    }, [pwd]);

    useEffect(() => {
        setErrMsg('');
    }, [email, pwd]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        signInWithEmailAndPassword(auth, email, pwd)
            .then((userCredential) => {
                navigate("/");
            })
            .catch((error) => {
                console.log(error);
                setLoading(false);
                setErrMsg("Sorry! Email is not registered or credentials invalid.");
            });
    };

    return (
        <div className="auth-page-wrapper">
            <section className={loading ? "auth-container loading" : "auth-container"}>
                <div className="auth-brand-head">
                    <div className="auth-brand-logo">
                        <span>⚡</span>
                    </div>
                    <h2>Welcome to LogBot AI</h2>
                    <p className="auth-subtitle">Sign in to your document intelligence workspace</p>
                </div>

                {errMsg && (
                    <p ref={errRef} className="errmsg" aria-live="assertive">{errMsg}</p>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="auth-input-group">
                        <label htmlFor="email">E-mail address:</label>
                        <input
                            type="text"
                            id="email"
                            ref={userRef}
                            autoComplete="off"
                            placeholder="name@gmail.com"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            aria-invalid={validEmail ? "false" : "true"}
                        />
                    </div>

                    <div className="auth-input-group">
                        <label htmlFor="password">Password:</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="••••••••"
                            onChange={(e) => setPwd(e.target.value)}
                            required
                            aria-invalid={validPwd ? "false" : "true"}
                        />
                    </div>

                    <button disabled={!validEmail || !validPwd || loading}>
                        {loading ? 'Signing in...' : 'Sign in to Workspace'}
                    </button>
                </form>

                <p className="auth-footer-text">
                    Not a member yet? <Link to="/signup">Create an account</Link>
                </p>
            </section>
        </div>
    );
};

export default Signin;
