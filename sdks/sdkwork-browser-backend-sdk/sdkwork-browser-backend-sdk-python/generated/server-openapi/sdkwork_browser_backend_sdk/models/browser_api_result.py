from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class BrowserApiResult:
    code: str
    message: str
    request_id: str
    data: Dict[str, Any]
