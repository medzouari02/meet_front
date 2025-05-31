import axios from 'axios';

const API = axios.create({
baseURL: import.meta.env.VITE_API_URL,
withCredentials: false,
});

export const getMeetings = () => API.get('/meetings');
export const createMeeting = (data) => API.post('/meetings/create', data);
export const getMeeting = (id) => API.get(`/meetings/${id}`);
export const deleteMeeting = (id) => API.delete(`/meetings/${id}`);
