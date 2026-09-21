import axios from 'axios';

let base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
if (base.endsWith('/')) {
    base = base.slice(0, -1);
}

export const API_BASE_URL = base;

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

export default api;
