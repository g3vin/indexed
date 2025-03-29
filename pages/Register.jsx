import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../src/api";

function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState(""); // New field
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            setMessage("Passwords do not match!");
            return;
        }
        try {
            await registerUser(username, password, firstName, lastName, email);
            setMessage("Account created successfully! Redirecting to login...");
            setTimeout(() => navigate("/login"), 2000);
        } catch (error) {
            setMessage(error.response?.data?.detail || error.message || "Registration failed.");
        }
    };

    return (
        <div className="register">
            <h1>Register</h1>
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button onClick={handleRegister}>Register</button>
            <p>{message}</p>
            <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    );
}

export default Register;