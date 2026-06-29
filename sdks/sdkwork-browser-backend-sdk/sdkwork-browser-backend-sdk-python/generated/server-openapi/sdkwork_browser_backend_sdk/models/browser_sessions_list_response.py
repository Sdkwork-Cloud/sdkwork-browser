from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .browser_sessions_list_data import BrowserSessionsListData


@dataclass
class BrowserSessionsListResponse:
    code: int
    data: Any
    trace_id: str
