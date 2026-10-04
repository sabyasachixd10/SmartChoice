import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const PreferenceContext = createContext();
const API_URL = 'http://localhost:8080/api';

export const usePreferences = () => {
  return useContext(PreferenceContext);
};

export const PreferenceProvider = ({ children }) => {
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from session storage or fetch default
    const saved = sessionStorage.getItem('smartchoice_preferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
      setLoading(false);
    } else {
      axios.get(`${API_URL}/preferences/default`)
        .then(res => {
          if (res.data.success) {
            setPreferences(res.data.data);
            sessionStorage.setItem('smartchoice_preferences', JSON.stringify(res.data.data));
          }
        })
        .catch(err => console.error('Failed to load default preferences:', err))
        .finally(() => setLoading(false));
    }
  }, []);

  const updatePreferences = (updates) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    sessionStorage.setItem('smartchoice_preferences', JSON.stringify(newPrefs));
  };

  return (
    <PreferenceContext.Provider value={{ preferences, updatePreferences, loading }}>
      {children}
    </PreferenceContext.Provider>
  );
};
