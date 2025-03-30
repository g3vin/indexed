// CardGrid.jsx
import { useState, useEffect } from "react";
import IndexCard from "./IndexCard";
import { getUserCards } from "../api";
import "../styles/CardGrid.css";

function CardGrid({ userId }) {
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
    

    return (
        <div className="card-grid">
            {cards.map((card) => (
                <IndexCard key={card.id} cardId={card.id} />
            ))}
        </div>
    );
}

export default CardGrid;