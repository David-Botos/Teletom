import argparse
import os
import subprocess
import ssl
import certifi
from contextlib import asynccontextmanager
from typing import Dict, Tuple, Optional

import aiohttp
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from loguru import logger
import sys

from pipecat.transports.services.helpers.daily_rest import DailyRESTHelper, DailyRoomParams

def configure_logging():
    """Configure logging with a single handler if none exists"""
    LOGGER_ID = "server_logger"
    
    # Remove existing handler with our ID if it exists
    for handler in logger._core.handlers:
        if getattr(handler, "name", None) == LOGGER_ID:
            logger.remove(handler.id)
            
    # Add our handler
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | {message}",
        level="DEBUG",
    )

# Constants
MAX_BOTS_PER_ROOM = 1
DEFAULT_HOST = os.getenv("HOST", "0.0.0.0")
DEFAULT_PORT = int(os.getenv("FAST_API_PORT", "7860"))
DAILY_API_URL = os.getenv("DAILY_API_URL", "https://api.daily.co/v1")

# Type definitions
BotProcess = Tuple[subprocess.Popen, str]  # (process, room_url)
bot_procs: Dict[int, BotProcess] = {}
daily_helpers: Dict[str, DailyRESTHelper] = {}

# Load environment variables
load_dotenv(override=True)

def cleanup() -> None:
    """Clean up function to terminate all bot processes"""
    logger.info("🧹 Starting cleanup of bot processes")
    for pid, (proc, room_url) in bot_procs.items():
        try:
            proc.terminate()
            proc.wait(timeout=5)  # Wait up to 5 seconds for graceful termination
            logger.info(f"✅ Successfully terminated bot {pid} in room {room_url}")
        except subprocess.TimeoutExpired:
            logger.warning(f"⚠️ Bot {pid} didn't terminate gracefully, forcing...")
            proc.kill()
        except Exception as e:
            logger.error(f"❌ Error cleaning up bot {pid}: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the FastAPI application"""
    logger.info("🚀 Starting server...")
    aiohttp_session = None
    try:
        # Create SSL context with verified certificates
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        conn = aiohttp.TCPConnector(ssl=ssl_context)
        
        # Create session with SSL context
        aiohttp_session = aiohttp.ClientSession(connector=conn)
        
        daily_api_key = os.getenv("DAILY_API_KEY", "")
        if not daily_api_key:
            logger.warning("⚠️ DAILY_API_KEY not set!")
            
        daily_helpers["rest"] = DailyRESTHelper(
            daily_api_key=daily_api_key,
            daily_api_url=DAILY_API_URL,
            aiohttp_session=aiohttp_session,
        )
        logger.info("✅ Server initialized successfully")
        yield
        
    except Exception as e:
        logger.error(f"❌ Error during server lifecycle: {e}")
        raise
    finally:
        logger.info("🔄 Shutting down server...")
        if aiohttp_session:
            await aiohttp_session.close()
        cleanup()
        logger.info("✅ Server shutdown complete")

# Initialize FastAPI app with lifespan manager
app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def start_agent(request: Request):
    """Endpoint to create a new room and start a bot agent"""
    client_ip = request.client.host
    logger.info(f"📞 New agent request from {client_ip}")
    
    try:
        # Create new room
        logger.info("🏗️ Creating new room...")
        room = await daily_helpers["rest"].create_room(DailyRoomParams())
        if not room.url:
            logger.error("❌ Room creation failed - no URL returned")
            raise HTTPException(
                status_code=500,
                detail="Failed to create room - no URL returned"
            )
        logger.info(f"✅ Room created successfully: {room.url}")

        # Check bot limits
        num_bots_in_room = sum(
            1 for proc in bot_procs.values() 
            if proc[1] == room.url and proc[0].poll() is None
        )
        if num_bots_in_room >= MAX_BOTS_PER_ROOM:
            logger.warning(f"⚠️ Max bot limit reached for room: {room.url}")
            raise HTTPException(
                status_code=500, 
                detail=f"Max bot limit reached for room: {room.url}"
            )

        # Get room token
        logger.info("🔑 Requesting room token...")
        token = await daily_helpers["rest"].get_token(room.url)
        if not token:
            logger.error(f"❌ Failed to get token for room: {room.url}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get token for room: {room.url}"
            )
        logger.info("✅ Token acquired successfully")

        # Start bot process with SSL certificate path
        logger.info("🤖 Starting bot process...")
        env = os.environ.copy()
        env["SSL_CERT_FILE"] = certifi.where()
        
        proc = subprocess.Popen(
            [f"python3 -m bot -u {room.url} -t {token}"],
            shell=True,
            bufsize=1,
            cwd=os.path.dirname(os.path.abspath(__file__)),
            env=env
        )
        bot_procs[proc.pid] = (proc, room.url)
        logger.info(f"✅ Bot started successfully with PID: {proc.pid}")

        return RedirectResponse(room.url)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error starting agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{pid}")
def get_status(pid: int):
    """Endpoint to check the status of a specific bot process"""
    logger.info(f"📊 Status check for bot {pid}")
    
    # Look up the subprocess
    proc_entry = bot_procs.get(pid)
    if not proc_entry:
        logger.warning(f"❓ Bot {pid} not found")
        raise HTTPException(
            status_code=404,
            detail=f"Bot with process id: {pid} not found"
        )

    proc, room_url = proc_entry
    # Check process status
    if proc.poll() is None:
        status = "running"
        logger.info(f"✅ Bot {pid} is running in room {room_url}")
    else:
        status = "finished"
        logger.info(f"⏹️ Bot {pid} has finished in room {room_url}")

    return JSONResponse({
        "bot_id": pid,
        "status": status,
        "room_url": room_url
    })

if __name__ == "__main__":
    configure_logging()
    
    import uvicorn
    
    parser = argparse.ArgumentParser(description="BearHug FastAPI Server")
    parser.add_argument("--host", type=str, default=DEFAULT_HOST, help="Host address")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port number")
    parser.add_argument("--reload", action="store_true", help="Reload code on change")

    config = parser.parse_args()

    logger.info(f"🚀 Starting server on {config.host}:{config.port}")
    if config.reload:
        logger.info("🔄 Hot reload enabled")

    uvicorn.run(
        "server:app",
        host=config.host,
        port=config.port,
        reload=config.reload,
    )