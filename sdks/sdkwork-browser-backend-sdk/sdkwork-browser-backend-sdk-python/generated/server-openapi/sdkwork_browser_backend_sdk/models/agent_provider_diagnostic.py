from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AgentProviderDiagnostic:
    provider_id: str
    provider_family: str
    provider_version: str
    typed_registered: bool
    capabilities: List[str]
    health: Optional[Dict[str, Any]] = None
