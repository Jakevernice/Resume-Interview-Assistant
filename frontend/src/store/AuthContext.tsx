import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  apiKey: string | null;
  model: string;
  setApiKey: (key: string | null) => void;
  setModel: (model: string) => void;
  setCredentials: (apiKey: string | null, model?: string) => void;
}

const DEFAULT_MODEL = 'gemini/gemini-2.0-flash';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Credentials are strictly in-memory (not persisted in any store)
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);

  const setCredentials = (newKey: string | null, newModel?: string) => {
    setApiKey(newKey);
    if (newModel) {
      setModel(newModel);
    }
  };

  return (
    <AuthContext.Provider value={{ apiKey, model, setApiKey, setModel, setCredentials }}>
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
