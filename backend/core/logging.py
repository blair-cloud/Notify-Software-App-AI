import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Suppress verbose third-party loggers
for logger_name in ["aiosqlite", "passlib", "passlib.utils.compat", "passlib.registry", "sqlalchemy", "sqlalchemy.engine", "asyncio"]:
    logging.getLogger(logger_name).setLevel(logging.WARNING)

logger = logging.getLogger("notify")
