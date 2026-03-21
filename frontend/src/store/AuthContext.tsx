import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Key is strictly in-memory (not persisted in any store)
  const [apiKey, setApiKey] = useState<string | null>(null);

  return (
    <AuthContext.Provider value={{ apiKey, setApiKey }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
