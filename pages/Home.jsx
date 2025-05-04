import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CardGrid from "../components/CardGrid";
import { createCard, getUserCards, deleteCard } from "../api";
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
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMode, setFilterMode] = useState("both");

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

    const handleDeleteCard = async (deletedCardId) => {
        try {
            await deleteCard(deletedCardId, parsedUserId);
            setCards((prevCards) => prevCards.filter(card => card.id !== deletedCardId));
        } catch (error) {
            console.error("Failed to delete card:", error);
        }
    };
    

    const filteredCards = cards.filter((card) => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const matchesSearch =
            card.text.toLowerCase().includes(lowerCaseQuery) ||
            card.username?.toLowerCase().includes(lowerCaseQuery);
        const matchesFilterMode =
            filterMode === "both" ||
            (filterMode === "self" && card.permission === "owner") ||
            (filterMode === "shared" && card.permission !== "owner");

        return matchesSearch && matchesFilterMode;
    });

    const handleToggleFilterMode = () => {
        setFilterMode((prevMode) =>
            prevMode === "both" ? "self" : prevMode === "self" ? "shared" : "both"
        );
    };

    return (
        <div className="home">
            <h1>Cards</h1>
            <div className="controls">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={handleToggleFilterMode}>
                    {filterMode === "both"
                        ? "All Cards"
                        : filterMode === "self"
                        ? "Your Cards"
                        : "Shared Cards"}
                </button>
            </div>
            <button onClick={handleCreateCard}>
                + New Card
            </button>
            <CardGrid 
                cards={filteredCards} 
                userId={parsedUserId} 
                onDelete={handleDeleteCard}
            />
        </div>
    );
}