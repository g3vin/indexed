// api.js
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export const registerUser = async (username, password, firstName, lastName, email) => {
    return await axios.post(`${API_URL}/register/`, { username, password, firstName, lastName, email });
};

export const loginUser = async (username, password) => {
    const response = await axios.post(`${API_URL}/login/`, { username, password });
    return response.data;
};

export const getUserCards = async (userId) => {
    const response = await axios.get(`${API_URL}/users/${userId}/cards/`);
    return response.data;
};

export const createCard = async (ownerId, text = "New Card", color = "#ffffff") => {
    const response = await axios.post(`${API_URL}/cards/`, { owner_id: ownerId, text, color });
    return response.data;
};

export const updateCard = async (cardId, text, color) => {
    const response = await axios.put(`${API_URL}/cards/${cardId}/`, { text, color });
    return response.data;
};

export const shareCard = async (cardId, username, permission = "view") => {
    const response = await axios.post(`${API_URL}/cards/${cardId}/share/`, { username, permission });
    return response.data;
};

export const deleteCard = async (cardId, userId) => {
    try {
        const response = await axios.delete(`http://127.0.0.1:8000/cards/${cardId}/`, {
            data: { user_id: userId },  // Send user_id in the request body
            withCredentials: true,
        });
        return response;
    } catch (error) {
        console.error("API error deleting card:", error);
        throw error;
    }
};