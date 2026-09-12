import '../../styles/signup.css';
import { Link, useNavigate } from "react-router-dom";
import React, { useRef, useState, useEffect, useContext } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { auth } from "../firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { AuthContext } from '../AuthProvider';

const NAME_REGEX = /^[a-zA-Z]{4,15}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@(hotmail\.com|gmail\.com)$/;
const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;

const Signup = () => {
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
    const [name, setName] = useState('');
    const [validName, setValidName] = useState(false);
    const [nameFocus, setNameFocus] = useState(false);

    const [email, setEmail] = useState('');
    const [validEmail, setValidEmail] = useState(false);
    const [emailFocus, setEmailFocus] = useState(false);
    
    const [pwd, setPwd] = useState('');
    const [validPwd, setValidPwd] = useState(false);
    const [pwdFocus, setPwdFocus] = useState(false);

    const [matchPwd, setMatchPwd] = useState('');
    const [validMatch, setValidMatch] = useState(false);
    const [matchFocus, setMatchFocus] = useState(false);
 
    const [errMsg, setErrMsg] = useState('');

    useEffect(() => {
        const result = NAME_REGEX.test(name);
        setValidName(result);
    }, [name]);

    useEffect(() => {
        const result = EMAIL_REGEX.test(email);
        setValidEmail(result);
    }, [email]);

    useEffect(() => {
        const result = PWD_REGEX.test(pwd);
        setValidPwd(result);
        const match = pwd === matchPwd;
        setValidMatch(match);
    }, [pwd, matchPwd]);

    useEffect(() => {
        setErrMsg('');
    }, [name, email, pwd, matchPwd]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
    
        createUserWithEmailAndPassword(auth, email, pwd)
            .then((userCredential) => {
                const user = userCredential.user;
                return updateProfile(user, { displayName: name });
            })
            .then(() => {
                navigate("/");
            })
            .catch((error) => {
                setErrMsg("E-mail already in use or registration error!");
                setLoading(false);
            });
    };

    return (
        <div className="auth-page-wrapper">
            <section className={loading ? "auth-container loading" : "auth-container"}>
                <div className="auth-brand-head">
                    <div className="auth-brand-logo">
                        <span>⚡</span>
                    </div>
                    <h2>Join LogBot AI</h2>
                    <p className="auth-subtitle">Create your personal AI document intelligence account</p>
                </div>

                {errMsg && (
                    <p ref={errRef} className="errmsg" aria-live="assertive">{errMsg}</p>
                )}

                <form id='newUserForm' onSubmit={handleSubmit}>
                    <div className="auth-input-group">
                        <div className="label-row">
                            <label htmlFor="name">Full Name / Display Name:</label>
                            {validName && <span className="valid"><FontAwesomeIcon icon={faCheck}/></span>}
                            {!validName && name && <span className="invalid"><FontAwesomeIcon icon={faTimes}/></span>}
                        </div>
                        <input 
                            type="text" 
                            id="name"
                            ref={userRef}
                            autoComplete="off"
                            placeholder="John Doe"
                            onChange={(e) => setName(e.target.value)}
                            required
                            aria-describedby='namenote'
                            onFocus={() => setNameFocus(true)}
                            onBlur={() => setNameFocus(false)}
                        />
                        {nameFocus && name && !validName && (
                            <p id="namenote" className="instructions">
                                <FontAwesomeIcon icon={faInfoCircle}/>
                                4 to 15 alphabetical characters only.
                            </p>
                        )}
                    </div>

                    <div className="auth-input-group">
                        <div className="label-row">
                            <label htmlFor="email">E-mail address:</label>
                            {validEmail && <span className="valid"><FontAwesomeIcon icon={faCheck}/></span>}
                            {!validEmail && email && <span className="invalid"><FontAwesomeIcon icon={faTimes}/></span>}
                        </div>
                        <input 
                            type="text" 
                            id="email"
                            autoComplete="off"
                            placeholder="name@gmail.com"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            aria-invalid={validEmail ? "false" : "true"}
                            aria-describedby="uidnote"
                            onFocus={() => setEmailFocus(true)}
                            onBlur={() => setEmailFocus(false)}
                        />
                        {emailFocus && email && !validEmail && (
                            <p id="uidnote" className="instructions">
                                <FontAwesomeIcon icon={faInfoCircle}/>
                                Must be valid email ending with @hotmail.com or @gmail.com
                            </p>
                        )}
                    </div>

                    <div className="auth-input-group">
                        <div className="label-row">
                            <label htmlFor="password">Password:</label>
                            {validPwd && <span className="valid"><FontAwesomeIcon icon={faCheck}/></span>}
                            {!validPwd && pwd && <span className="invalid"><FontAwesomeIcon icon={faTimes}/></span>}
                        </div>
                        <input 
                            type="password" 
                            id="password"
                            placeholder="Min. 8 characters"
                            onChange={(e) => setPwd(e.target.value)}
                            required
                            aria-invalid={validPwd ? "false" : "true"}
                            aria-describedby="pwdnote"
                            onFocus={() => setPwdFocus(true)}
                            onBlur={() => setPwdFocus(false)}
                        />
                        {pwdFocus && !validPwd && (
                            <p id="pwdnote" className="instructions">
                                <FontAwesomeIcon icon={faInfoCircle}/>
                                8-24 chars. Must contain uppercase, lowercase, number & special char (!@#$%).
                            </p>
                        )}
                    </div>

                    <div className="auth-input-group">
                        <div className="label-row">
                            <label htmlFor="confirm_pwd">Confirm Password:</label>
                            {validMatch && matchPwd && <span className="valid"><FontAwesomeIcon icon={faCheck}/></span>}
                            {!validMatch && matchPwd && <span className="invalid"><FontAwesomeIcon icon={faTimes}/></span>}
                        </div>
                        <input 
                            type="password" 
                            id="confirm_pwd"
                            placeholder="Repeat password"
                            onChange={(e) => setMatchPwd(e.target.value)}
                            required
                            aria-invalid={validMatch ? "false" : "true"}
                            aria-describedby="confirmnote"
                            onFocus={() => setMatchFocus(true)}
                            onBlur={() => setMatchFocus(false)}
                        />
                        {matchFocus && !validMatch && (
                            <p id="confirmnote" className="instructions">
                                <FontAwesomeIcon icon={faInfoCircle}/>
                                Passwords must match.
                            </p>
                        )}
                    </div>

                    <button disabled={!validName || !validEmail || !validPwd || !validMatch || loading}>
                        {loading ? 'Creating Account...' : 'Sign up & Launch'}
                    </button>
                </form>

                <p className="auth-footer-text">
                    Already a member? <Link to="/signin">Sign in instead</Link>
                </p>
            </section>
        </div>
    );
};
 
export default Signup;