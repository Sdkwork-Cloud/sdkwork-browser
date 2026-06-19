from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .agent_runtime_diagnostics import AgentRuntimeDiagnostics
    from .browser_operator_session import BrowserOperatorSession


@dataclass
class BrowserSessionsListResult:
    code: str
    message: str
    request_id: str
    data: Dict[str, Any]
