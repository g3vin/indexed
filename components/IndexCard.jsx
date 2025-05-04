import { useState, useEffect, useRef } from "react";
import { updateCard, shareCard, deleteCard } from "../api";
import axios from "axios";
import "../styles/IndexCard.css";

function IndexCard({ cardId, userId, onDelete }) {
    const [text, setText] = useState("");
    const [color, setColor] = useState("#fff");
    const [isExpanded, setIsExpanded] = useState(false);
    const [shareUser, setShareUser] = useState("");
    const [sharePermission, setSharePermission] = useState("view");
    const [isOwner, setIsOwner] = useState(false);
    const [userPermission, setUserPermission] = useState("view");

    const textareaRef = useRef(null);
    const cardRef = useRef(null);
    const wsRef = useRef(null); // WebSocket reference

    useEffect(() => {
        let socket;
    
        const fetchCard = async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8000/cards/${cardId}/`, {
                    params: { user_id: userId }
                });
                
                setText(response.data.text);
                setColor(response.data.color);
                setIsOwner(response.data.owner_id === userId);
                setUserPermission(response.data.user_permission || "view");
    
                // Set up WebSocket connection
                socket = new WebSocket(`ws://127.0.0.1:8000/ws/card/${cardId}`);
    
                socket.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    setText(message.text);
                    setColor(message.color);
                };
    
                socket.onclose = () => {
                    //console.log("WebSocket closed");
                };
    
                socket.onerror = (err) => {
                    console.error("WebSocket error:", err);
                };
    
                wsRef.current = socket;
            } catch (error) {
                console.error("Error fetching card:", error);
            }
        };
    
        fetchCard();
    
        return () => {
            if (socket) {
                socket.close();
                //console.log(`WebSocket closed for card ${cardId}`);
            }
        };
    }, [cardId, userId]);
    
    const handleUpdate = async (newText, newColor) => {
        if (userPermission !== "edit" && !isOwner) return;
      
        setText(newText);
        setColor(newColor);
      
        try {
          const message = JSON.stringify({ text: newText, color: newColor });
          //console.log("Sending update:", message);
      
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(message);
          }
      
          await updateCard(cardId, newText, newColor);
        } catch (error) {
          console.error("Error updating card:", error);
        }
      };
      
    
    
    

    useEffect(() => {
        if (isExpanded && textareaRef.current && cardRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;

            const newHeight = textareaRef.current.scrollHeight + 0;
            const maxHeight = window.innerHeight * 0.8;

            cardRef.current.style.height = `${Math.min(newHeight, maxHeight)}px`;
        } else {
            if (cardRef.current) {
                cardRef.current.style.height = "170px";
            }
        }
    }, [text, isExpanded]);


    return (
        <>
            {isExpanded && (
                <div className="overlay" onClick={() => setIsExpanded(false)}>
                    <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
                        <div className="floating-toolbar">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                onBlur={handleUpdate}
                                disabled={userPermission === "view" && !isOwner}
                            />
                            <input
                                type="text"
                                placeholder="Enter username/email"
                                value={shareUser}
                                onChange={(e) => setShareUser(e.target.value)}
                            />
                            <select
                                value={sharePermission}
                                onChange={(e) => setSharePermission(e.target.value)}
                            >
                                <option value="view">View</option>
                                <option value="edit">Edit</option>
                            </select>
                            <button
                                className="share-button"
                                onClick={() =>
                                    shareCard(cardId, shareUser, sharePermission)
                                }
                            >
                                Share
                            </button>
                            <button className="delete-button" onClick={() => onDelete(cardId)}>
                                Delete
                            </button>
                        </div>

                        <div
                            ref={cardRef}
                            className="index-card expanded"
                            style={{ backgroundColor: color }}
                        >
<textarea
  value={text || ""} // always provide a fallback
  onChange={(e) => handleUpdate(e.target.value, color)}
/>


                        </div>
                    </div>
                </div>
            )}

            {!isExpanded && (
                <div
                    ref={cardRef}
                    className="index-card"
                    style={{ backgroundColor: color }}
                    onClick={() => setIsExpanded(true)}
                >
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => handleUpdate(e.target.value, color)}
                        onBlur={handleUpdate}
                        readOnly={userPermission === "view" && !isOwner}
                    />
                </div>
            )}
        </>
    );
}

export default IndexCard;
