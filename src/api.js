import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export const registerUser = async (username, password, firstName, lastName, email) => {
    return await axios.post(`${API_URL}/register/`, { username, password, firstName, lastName, email});
};

export const loginUser = async (username, password) => {
    const response = await axios.post(`${API_URL}/login/`, { username, password });
    return response.data.token;
};
