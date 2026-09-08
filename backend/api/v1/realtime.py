"""
WebSocket endpoint that pushes new messages to whoever is party to them.

The browser's WebSocket API cannot set an Authorization header, so the Supabase
access token is passed as a query parameter and verified the same way the REST
dependencies verify it.
"""
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from backend.core import database
from backend.core.logging import logger
from backend.core.realtime import realtime
from backend.core.supabase_auth import verify_supabase_token
from backend.models import User, UserStatus

router = APIRouter(tags=["Realtime"])


async def _resolve_user(token: str) -> User | None:
    try:
        claims = await verify_supabase_token(token)
        user_id = uuid.UUID(str(claims.get("sub")))
    except Exception:
        return None

    # Resolved through the module so the session factory stays swappable, and
    # closed immediately - a socket must not hold a DB connection for its life.
    async with database.AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.id == user_id))
        user = res.scalar_one_or_none()

    if not user or user.status != UserStatus.ACTIVE:
        return None
    return user


@router.websocket("/ws")
async def realtime_socket(websocket: WebSocket, token: str = Query(...)):
    user = await _resolve_user(token)
    if not user:
        # 1008 = policy violation; the client will not retry a rejected token.
        await websocket.close(code=1008)
        return

    await realtime.connect(user.id, websocket)
    try:
        await websocket.send_json({"type": "connected", "user_id": str(user.id)})
        while True:
            # Clients send periodic pings; the receive also detects disconnects.
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.info(f"[realtime] socket error for {user.id}: {exc}")
    finally:
        await realtime.disconnect(user.id, websocket)
