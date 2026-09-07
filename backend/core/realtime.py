"""
Live push for chat and notifications.

An in-process registry of open WebSockets keyed by user id. Services call
`realtime.publish_to_users(...)` after committing, and every device that user
has open receives the event immediately - no polling, no refresh.

Scope note: this hub lives in the worker process, so it delivers correctly for
a single-process deployment (how this app runs today). Running multiple workers
would need a shared broker (Redis pub/sub) behind the same publish() call.
"""
import asyncio
import uuid
from typing import Any, Dict, Iterable, Set

from fastapi import WebSocket

from backend.core.logging import logger


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: uuid.UUID | str, websocket: WebSocket) -> None:
        await websocket.accept()
        key = str(user_id)
        async with self._lock:
            self._connections.setdefault(key, set()).add(websocket)
        logger.info(f"[realtime] user {key} connected ({len(self._connections.get(key, ()))} socket(s))")

    async def disconnect(self, user_id: uuid.UUID | str, websocket: WebSocket) -> None:
        key = str(user_id)
        async with self._lock:
            sockets = self._connections.get(key)
            if sockets:
                sockets.discard(websocket)
                if not sockets:
                    self._connections.pop(key, None)
        logger.info(f"[realtime] user {key} disconnected")

    def is_connected(self, user_id: uuid.UUID | str) -> bool:
        return bool(self._connections.get(str(user_id)))

    async def publish_to_users(self, user_ids: Iterable[uuid.UUID | str], payload: Dict[str, Any]) -> int:
        """
        Fan a payload out to every socket held by the given users.
        Never raises: a dead socket is dropped, and delivery failures must not
        roll back or fail the request that triggered them.
        """
        delivered = 0
        targets: list[tuple[str, WebSocket]] = []

        for user_id in {str(u) for u in user_ids if u}:
            for socket in list(self._connections.get(user_id, ())):
                targets.append((user_id, socket))

        for user_id, socket in targets:
            try:
                await socket.send_json(payload)
                delivered += 1
            except Exception as exc:
                logger.info(f"[realtime] dropping dead socket for {user_id}: {exc}")
                await self.disconnect(user_id, socket)

        return delivered


realtime = ConnectionManager()
