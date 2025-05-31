import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: false,
});

// Auth
export const login = (data) => API.post('/auth/login', data);
export const createMeeting = (data) => API.post('/meetings/create', data);

// Historique
export const getHistory = () => API.get('/auth/history');
export const addToHistory = (data) => API.post('/auth/add-to-history', data);

export const registerEtudiant = (data) => API.post('auth/register-etudiant', data);
export const registerEnseignant = (data) => API.post('auth/register-enseignant', data);
