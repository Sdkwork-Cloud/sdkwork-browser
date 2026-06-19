from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any, Literal

if TYPE_CHECKING:
    from .agent_provider_diagnostic import AgentProviderDiagnostic


@dataclass
class AgentRuntimeDiagnostics:
    schema_version: Literal['agent_runtime_diagnostics.v1']
    runtime_id: str
    agent_id: str
    state: str
    provider_count: int
    capability_count: int
    typed_provider_count: int
    manifest_only_provider_count: int
    missing_required_capabilities: List[str]
    degraded_capabilities: List[str]
    provider_diagnostics: List[AgentProviderDiagnostic]
    runtime_mode: str
