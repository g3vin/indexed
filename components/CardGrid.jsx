import IndexCard from "./IndexCard";
import "../styles/CardGrid.css";

function CardGrid({ userId, cards, onDelete }) {
    return (
        <div className="card-grid">
            {cards.map((card) => (
                <IndexCard
                    key={card.id}
                    cardId={card.id}
                    userId={userId}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

export default CardGrid;