from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import BrowserApiResult

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"





class BrowserApi:
    """browser browser API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.ai_actions = BrowserAiActionsApi(client)
        self.sessions = BrowserSessionsApi(client)
        self.tabs = BrowserTabsApi(client)


class BrowserAiActionsApi:
    """browser browser.ai_actions API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def ai_actions_create(self, body: Dict[str, Any]) -> BrowserApiResult:
        """browser.aiActions.create"""
        return self._client.post(f"/app/v3/api/browser/ai/actions", json=body)

class BrowserSessionsApi:
    """browser browser.sessions API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: Dict[str, Any]) -> BrowserApiResult:
        """browser.sessions.create"""
        return self._client.post(f"/app/v3/api/browser/sessions", json=body)

class BrowserTabsApi:
    """browser browser.tabs API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: Dict[str, Any]) -> BrowserApiResult:
        """browser.tabs.create"""
        return self._client.post(f"/app/v3/api/browser/tabs", json=body)
