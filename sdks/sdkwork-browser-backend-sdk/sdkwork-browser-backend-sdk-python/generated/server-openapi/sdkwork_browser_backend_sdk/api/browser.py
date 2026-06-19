from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import BrowserApiResult, BrowserSessionsListResult

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
        self.engines = BrowserEnginesApi(client)
        self.sessions = BrowserSessionsApi(client)


class BrowserEnginesApi:
    """browser browser.engines API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> BrowserApiResult:
        """browser.engines.list"""
        return self._client.get(f"/backend/v3/api/browser/engines")

class BrowserSessionsApi:
    """browser browser.sessions API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> BrowserSessionsListResult:
        """browser.sessions.list"""
        return self._client.get(f"/backend/v3/api/browser/sessions")
