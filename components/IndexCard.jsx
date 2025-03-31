import { useState, useEffect, useRef } from "react";
import { updateCard, shareCard, deleteCard } from "../api";
import axios from "axios";
import "../styles/IndexCard.css";

function IndexCard({ cardId, userId, onDelete }) {  // Add onDelete prop here
    const [text, setText] = useState("");
    const [color, setColor] = useState("#fff");
    const [isExpanded, setIsExpanded] = useState(false);
    const [shareUser, setShareUser] = useState("");
    const [sharePermission, setSharePermission] = useState("view");
    const [isOwner, setIsOwner] = useState(false);
    const cardRef = useRef(null);

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
    
        try {
            const response = await deleteCard(cardId, userId);
    
            if (response.status === 200) {
                onDelete(cardId);  // Call onDelete passed from parent
            } else {
                alert("Failed to delete the card.");
            }
        } catch (error) {
            alert("Failed to delete the card.");
        }
    };    

    useEffect(() => {
        const fetchCard = async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8000/cards/${cardId}/`);
                setText(response.data.text);
                setColor(response.data.color);
    
                const ownerId = response.data.owner_id;
                setIsOwner(ownerId === userId);  // Fix ownership check
            } catch (error) {
                console.error("Error fetching card:", error);
            }
        };
    
        fetchCard();
    }, [cardId, userId]);
    
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
                            <button className="share-button" onClick={handleShare}>Share</button>
                            <button className="delete-button" onClick={handleDelete}>Delete</button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default IndexCard;