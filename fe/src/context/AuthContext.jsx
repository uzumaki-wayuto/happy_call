// src/context/AuthContext.jsx
/* @refresh reset */
import { createContext, useContext, useState } from 'react';

// ✅ Define ROLES here and export it
export const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENT: 'AGENT',
  VERIFIER: 'VERIFIER',
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (userData) => {

     // Map role from DB to frontend role names
    let role = userData.role;
    if (role === 'VERIFIER') {
      role = ROLES.AGENT;
    }

    setUser({
      id: userData.id || userData.user_id || 'A001',
      username: userData.username || 'agent01',
      fullName: userData.fullName || userData.full_name || 'Agent',
      role: role,
      verificationType: userData.verificationType || userData.verification_type || 'DISBURSEMENT',
      pbxExtension: userData.pbxExtension || userData.pbx_extension || '2001',
    });
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === ROLES.ADMIN;
  const isSupervisor = user?.role === ROLES.SUPERVISOR;
  const isAgent = user?.role === ROLES.AGENT;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        isSupervisor,
        isAgent,
        role: user?.role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;