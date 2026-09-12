// import { onAuthStateChanged } from 'firebase/auth';
import React, {useEffect, useState} from 'react';
import { auth } from './firebase';

export const AuthContext = React.createContext();

const AuthProvider = ({children}) => {

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(()=>{
    auth.onAuthStateChanged((user)=>{
      user ? setCurrentUser(user) : setCurrentUser(null);
    })
  }, [])

  return (
    <AuthContext.Provider value={{currentUser}}>
        {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;