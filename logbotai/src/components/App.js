import React from 'react';
import '../styles/App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import AuthProvider from './AuthProvider';
import SignOut from './auth/SignOut';
import Signin from "./auth/Signin.js";
import Signup from "./auth/Signup.js";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} /> 
            <Route path="/signin" element={<Signin />} /> 
            <Route path="/signup" element={<Signup />} /> 
            <Route path="/signout" element={<SignOut />} /> 
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;