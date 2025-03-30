import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CardGrid from "../components/CardGrid";
import { createCard, getUserCards } from "../api";


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
    try {
      await createCard(parsedUserId, "", "#ffffff");
      // Re-fetch cards after creation:
      const updatedCards = await getUserCards(parsedUserId);
      setCards(updatedCards);
    } catch (error) {
      console.error("Error creating card:", error.response?.data || error);
    }
  };
  

  return (
    <div className="home">
      <h1>Home</h1>
      <button onClick={handleCreateCard}>
        + New Card
      </button>
      <CardGrid cards={cards} userId={parsedUserId} />
    </div>
  );
}