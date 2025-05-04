from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, card_id: int):
        await websocket.accept()
        if card_id not in self.active_connections:
            self.active_connections[card_id] = []
        self.active_connections[card_id].append(websocket)

    def disconnect(self, websocket: WebSocket, card_id: int):
        if card_id in self.active_connections:
            self.active_connections[card_id].remove(websocket)

    async def broadcast(self, card_id: int, message: str):
        if card_id in self.active_connections:
            for connection in self.active_connections[card_id]:
                await connection.send_text(message)
