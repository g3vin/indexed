import { useState, useEffect, useRef } from "react";
import { updateCard, shareCard, deleteCard } from "../api";
import axios from "axios";
import "../styles/IndexCard.css";

function IndexCard({ cardId }) {
    const [text, setText] = useState("");
    const [color, setColor] = useState("#fff");
    const [isExpanded, setIsExpanded] = useState(false);
    const [shareUser, setShareUser] = useState("");
    const [sharePermission, setSharePermission] = useState("view");
    const [isOwner, setIsOwner] = useState(false);
    const cardRef = useRef(null);

    useEffect(() => {
        const fetchCard = async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8000/cards/${cardId}/`);
                setText(response.data.text);
                setColor(response.data.color);
                setIsOwner(response.data.is_owner); // Assuming API returns ownership
            } catch (error) {
                console.error("Error fetching card:", error);
            }
        };

        fetchCard();
    }, [cardId]);

    const handleShare = async () => {
        try {
            await shareCard(cardId, shareUser, sharePermission);
            alert("Card shared successfully!");
        } catch (error) {
            console.error("Error sharing card:", error);
        }
    };

    const handleUpdate = async () => {
        try {
            // Ensure color is always in #RRGGBB format
            const formattedColor = /^#([a-fA-F0-9]){3}$/.test(color)
                ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
                : color;
    
            await updateCard(cardId, text, formattedColor);
        } catch (error) {
            console.error("Error updating card:", error);
        }
    };
    

    const handleDelete = async () => {
        if (!isOwner) {
            alert("You are not the owner and cannot delete this card.");
            return;
        }

        if (window.confirm("Are you sure you want to delete this card?")) {
            try {
                await deleteCard(cardId);
                alert("Card deleted successfully!");
                // Handle UI removal (e.g., emit event or state update)
            } catch (error) {
                console.error("Error deleting card:", error);
            }
        }
    };

    // Close card if clicked outside
    useEffect(() => {
        const fetchCard = async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8000/cards/${cardId}/`);
                setText(response.data.text);
    
                const fetchedColor = response.data.color;
                const formattedColor = fetchedColor.length === 4
                    ? `#${fetchedColor[1]}${fetchedColor[1]}${fetchedColor[2]}${fetchedColor[2]}${fetchedColor[3]}${fetchedColor[3]}`
                    : fetchedColor;
    
                setColor(formattedColor);
                setIsOwner(response.data.is_owner);
            } catch (error) {
                console.error("Error fetching card:", error);
            }
        };
    
        fetchCard();
    }, [cardId]);
    

    return (
        <>
            {isExpanded && <div className="overlay" onClick={() => setIsExpanded(false)}></div>}

            <div
                ref={cardRef}
                className={`index-card ${isExpanded ? "expanded" : ""}`}
                style={{ backgroundColor: color }}
                onClick={!isExpanded ? () => setIsExpanded(true) : undefined}
            >
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={handleUpdate}
                    readOnly={!isExpanded} // Prevent editing when collapsed
                />

                {isExpanded && (
                    <>
                        <input
    type="color"
    value={color}
    onChange={(e) => {
        const newColor = e.target.value;
        const formattedColor = /^#([a-fA-F0-9]){3}$/.test(newColor)
            ? `#${newColor[1]}${newColor[1]}${newColor[2]}${newColor[2]}${newColor[3]}${newColor[3]}`
            : newColor;

        setColor(formattedColor);
    }}
    onBlur={handleUpdate}
/>


                        <div className="share-section">
                            <input
                                type="text"
                                placeholder="Enter username/email"
                                value={shareUser}
                                onChange={(e) => setShareUser(e.target.value)}
                            />
                            <select value={sharePermission} onChange={(e) => setSharePermission(e.target.value)}>
                                <option value="view">View</option>
                                <option value="edit">Edit</option>
                            </select>
                            <button onClick={handleShare}>Share</button>
                        </div>
                        <button className="delete-button" onClick={handleDelete}>Delete</button>
                    </>
                )}

            </div>
        </>
    );
}

export default IndexCard;