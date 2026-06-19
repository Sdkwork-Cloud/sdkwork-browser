from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class BrowserOperatorSession:
    session_id: str
    kind: str
    tab_count: int
    agent_runtime_id: str
    runtime_mode: str
    mcp_connector_count: int
    observed_at_unix: int
    active_engine_id: Optional[str] = None
    active_tab_id: Optional[str] = None
