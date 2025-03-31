import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CardGrid from "../components/CardGrid";
import { createCard, getUserCards } from "../api";
import "../styles/Home.css";

export default function Home({ userId: propUserId }) {
    const navigate = useNavigate();
    const storedUserId = localStorage.getItem("userId");
    const userId = propUserId || storedUserId;
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedUserId)) {
        console.error("Invalid userId provided:", userId);
        navigate("/login");
        return <p>Please log in to access this page.</p>;
    }

    const [cards, setCards] = useState([]);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                const data = await getUserCards(userId);
                setCards(data);
            } catch (error) {
                console.error("Error fetching user cards:", error);
            }
        };
        fetchCards();
    }, [userId]);

    const handleCreateCard = async () => {
        const colors = ["#c8e854", "#77caee", "#f29e50", "#f4e64e", "#ee8bc5"];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        try {
            const newCard = await createCard(parsedUserId, "", randomColor);

            setCards((prevCards) => [...prevCards, newCard]);
        } catch (error) {
            console.error("Error creating card:", error.response?.data || error);
        }
    };


    const handleDeleteCard = (deletedCardId) => {
        setCards((prevCards) => prevCards.filter(card => card.id !== deletedCardId));
    };

    return (
        <div className="home">
            <h1>Cards</h1>
            <button onClick={handleCreateCard}>
                + New Card
            </button>
            <CardGrid 
                cards={cards} 
                userId={parsedUserId} 
                onDelete={handleDeleteCard}
            />
        </div>
    );
}