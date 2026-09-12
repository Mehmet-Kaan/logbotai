import { signOut } from 'firebase/auth';
import React, { useEffect } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const SignOut = () => {
  const navigate = useNavigate();

  useEffect(() => {
    signOut(auth)
      .then(() => {
        navigate("/signin");
      })
      .catch((error) => {
        console.error("Sign out error:", error);
        navigate("/signin");
      });
  }, [navigate]);

  return (
    <div className="auth-page-wrapper">
      <div className="banner-pill">
        <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
        <span>Signing out of LogBot AI...</span>
      </div>
    </div>
  );
};

export default SignOut;