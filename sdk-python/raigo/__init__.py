"""
raigo — Official Python SDK for raigo Cloud

Usage:
    from raigo import RaigoClient

    raigo = RaigoClient(api_key="your-key")

    # Simple evaluate — returns immediately with ALLOW, DENY, or WARN
    result = raigo.evaluate(prompt="Delete all records")
    if not result.allow:
        raise PermissionError(result.policy_message)

    # Evaluate with human-in-the-loop — blocks until a human approves or denies
    result = raigo.evaluate_and_wait(prompt="Transfer £50,000")
    if result.allow:
        execute_transfer()
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Literal, Optional

import httpx

__version__ = "1.0.0"
__all__ = [
    "RaigoClient",
    "AsyncRaigoClient",
    "EvalResult",
    "ApprovalPollResult",
    "RaigoApiError",
    "RaigoApprovalTimeoutError",
    "RaigoApprovalDeniedError",
]

# ─── Types ────────────────────────────────────────────────────────────────────

EvalAction = Literal["ALLOW", "DENY", "WARN"]
ApprovalStatus = Literal["pending", "approved", "denied", "expired"]


@dataclass
class PolicyViolation:
    rule_id: str
    rule_title: str
    error_code: str
    http_status: int
    action: Literal["DENY", "WARN"]
    severity: str
    user_message: str
    developer_message: str
    debug_hint: str
    require_approval: bool = False
    compliance_mapping: List[Dict[str, str]] = field(default_factory=list)
    audit_log: Dict[str, str] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "PolicyViolation":
        return cls(
            rule_id=d.get("rule_id", ""),
            rule_title=d.get("rule_title", ""),
            error_code=d.get("error_code", ""),
            http_status=d.get("http_status", 403),
            action=d.get("action", "DENY"),
            severity=d.get("severity", "medium"),
            user_message=d.get("user_message", ""),
            developer_message=d.get("developer_message", ""),
            debug_hint=d.get("debug_hint", ""),
            require_approval=d.get("require_approval", False),
            compliance_mapping=d.get("compliance_mapping") or [],
            audit_log=d.get("audit_log") or {},
        )


@dataclass
class EvalResult:
    """The result of a policy evaluation."""

    allow: bool
    action: EvalAction
    evaluated_rules: int
    triggered_rules: List[str]
    evaluation_time_ms: int
    policy_version: str
    organisation: str
    violation: Optional[PolicyViolation] = None
    warnings: Optional[List[PolicyViolation]] = None
    requires_approval: bool = False
    approval_id: Optional[str] = None
    policy_message: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "EvalResult":
        violation = PolicyViolation.from_dict(d["violation"]) if d.get("violation") else None
        warnings = [PolicyViolation.from_dict(w) for w in d.get("warnings") or []]
        policy_message = (
            violation.user_message if violation else
            (warnings[0].user_message if warnings else None)
        )
        return cls(
            allow=d.get("allow", False),
            action=d.get("action", "DENY"),
            evaluated_rules=d.get("evaluated_rules", 0),
            triggered_rules=d.get("triggered_rules") or [],
            evaluation_time_ms=d.get("evaluation_time_ms", 0),
            policy_version=d.get("policy_version", ""),
            organisation=d.get("organisation", ""),
            violation=violation,
            warnings=warnings or None,
            requires_approval=d.get("requires_approval", False),
            approval_id=d.get("approvalId"),
            policy_message=policy_message,
        )


@dataclass
class ApprovalPollResult:
    """The result of polling an approval record."""

    id: str
    status: ApprovalStatus
    allow: bool
    reviewer_note: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ApprovalPollResult":
        return cls(
            id=d.get("id", ""),
            status=d.get("status", "pending"),
            allow=d.get("allow", False),
            reviewer_note=d.get("reviewerNote"),
            reviewed_at=d.get("reviewedAt"),
            reviewed_by=d.get("reviewedBy"),
        )


# ─── Errors ───────────────────────────────────────────────────────────────────


class RaigoApiError(Exception):
    """Raised when the raigo API returns an error response."""

    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code


class RaigoApprovalTimeoutError(Exception):
    """Raised when evaluate_and_wait() times out waiting for a human decision."""

    def __init__(self, approval_id: str, elapsed_s: float) -> None:
        super().__init__(
            f"Approval {approval_id} timed out after {elapsed_s:.0f}s waiting for human decision."
        )
        self.approval_id = approval_id
        self.elapsed_s = elapsed_s


class RaigoApprovalDeniedError(Exception):
    """Raised when evaluate_and_wait() receives a DENY decision from the human reviewer."""

    def __init__(self, approval_id: str, reviewer_note: Optional[str] = None) -> None:
        note_str = f" Note: {reviewer_note}" if reviewer_note else ""
        super().__init__(f"Approval {approval_id} was denied by reviewer.{note_str}")
        self.approval_id = approval_id
        self.reviewer_note = reviewer_note


# ─── Synchronous Client ───────────────────────────────────────────────────────


class RaigoClient:
    """
    Synchronous raigo Cloud client.

    Example:
        from raigo import RaigoClient

        raigo = RaigoClient(api_key=os.environ["RAIGO_API_KEY"])

        result = raigo.evaluate(prompt="Send email to all users")
        if not result.allow:
            raise PermissionError(result.policy_message)
    """

    DEFAULT_BASE_URL = "https://raigocloud.manus.space"

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 10.0,
    ) -> None:
        resolved_key = api_key or os.environ.get("RAIGO_API_KEY")
        if not resolved_key:
            raise ValueError(
                "raigo API key is required. Pass api_key= or set RAIGO_API_KEY."
            )
        self._api_key = resolved_key
        self._base_url = (base_url or self.DEFAULT_BASE_URL).rstrip("/")
        self._client = httpx.Client(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "User-Agent": f"raigo-python/{__version__}",
            },
            timeout=timeout,
        )

    def _post(self, path: str, body: Dict[str, Any]) -> Dict[str, Any]:
        resp = self._client.post(path, json=body)
        data = resp.json()
        if not resp.is_success:
            raise RaigoApiError(
                status=resp.status_code,
                code=data.get("code", "UNKNOWN_ERROR"),
                message=data.get("message", f"HTTP {resp.status_code}"),
            )
        return data

    def _get(self, path: str) -> Dict[str, Any]:
        resp = self._client.get(path)
        data = resp.json()
        if not resp.is_success:
            raise RaigoApiError(
                status=resp.status_code,
                code=data.get("code", "UNKNOWN_ERROR"),
                message=data.get("message", f"HTTP {resp.status_code}"),
            )
        return data

    def evaluate(
        self,
        prompt: Optional[str] = None,
        content: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EvalResult:
        """
        Evaluate a prompt or action against your raigo policy.

        Returns immediately with a verdict of ALLOW, DENY, or WARN.

        If the result is DENY and requires_approval is True, the cloud has
        created an approval record. Use evaluate_and_wait() to poll automatically.
        """
        body: Dict[str, Any] = {}
        if prompt:
            body["prompt"] = prompt
        if content:
            body["content"] = content
        if context:
            body["context"] = context
        if metadata:
            body["metadata"] = metadata

        data = self._post("/v1/evaluate", body)
        return EvalResult.from_dict(data)

    def evaluate_and_wait(
        self,
        prompt: Optional[str] = None,
        content: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        timeout_s: float = 300.0,
        poll_interval_s: float = 3.0,
        on_pending: Optional[Callable[[str, float], None]] = None,
    ) -> EvalResult:
        """
        Evaluate a prompt and, if a human-in-the-loop approval is required,
        block until the reviewer approves or denies.

        This is the recommended method for high-stakes agent actions where your
        organisation has enabled humanInLoopOnBlock in raigo Cloud.

        Flow:
        1. Calls /v1/evaluate — returns immediately
        2. If action is ALLOW or WARN: returns immediately
        3. If action is DENY without approval_id: returns (block is immediate)
        4. If action is DENY with approval_id: polls /v1/approvals/{id} until:
           - Status is 'approved' -> returns with allow=True
           - Status is 'denied' -> raises RaigoApprovalDeniedError
           - Timeout reached -> raises RaigoApprovalTimeoutError

        Important: An approved record means the human granted a one-time override.
        The original DENY verdict is preserved in the audit log as
        "DENY (human override)". This is not an ALLOW — it is an exception.

        Args:
            prompt: The agent's prompt or intended action text.
            content: Output content to evaluate.
            context: Contextual signals to enrich rule matching.
            metadata: Arbitrary metadata attached to the evaluation record.
            timeout_s: How long to wait for a human decision (seconds). Default: 300.
            poll_interval_s: How often to poll (seconds). Default: 3.
            on_pending: Callback called each poll while still pending.
                        Receives (approval_id, elapsed_seconds).

        Raises:
            RaigoApprovalDeniedError: The reviewer denied the action.
            RaigoApprovalTimeoutError: Timed out waiting for a decision.
        """
        result = self.evaluate(
            prompt=prompt,
            content=content,
            context=context,
            metadata=metadata,
        )

        if result.action != "DENY":
            return result

        if not result.approval_id:
            return result

        approval_id = result.approval_id
        start = time.monotonic()

        while True:
            elapsed = time.monotonic() - start

            if elapsed >= timeout_s:
                raise RaigoApprovalTimeoutError(approval_id, elapsed)

            poll = self.poll_approval(approval_id)

            if poll.status == "approved":
                # Human granted a one-time override
                result.allow = True
                return result

            if poll.status == "denied":
                raise RaigoApprovalDeniedError(approval_id, poll.reviewer_note)

            if poll.status == "expired":
                raise RaigoApprovalTimeoutError(approval_id, elapsed)

            if on_pending:
                on_pending(approval_id, elapsed)

            time.sleep(poll_interval_s)

    def poll_approval(self, approval_id: str) -> ApprovalPollResult:
        """Poll the status of a specific approval record."""
        data = self._get(f"/v1/approvals/{approval_id}")
        return ApprovalPollResult.from_dict(data)

    def health(self) -> Dict[str, Any]:
        """Check the health of the raigo Cloud API."""
        return self._get("/v1/health")

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> "RaigoClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


# ─── Async Client ─────────────────────────────────────────────────────────────


class AsyncRaigoClient:
    """
    Async raigo Cloud client for use with asyncio.

    Example:
        import asyncio
        from raigo import AsyncRaigoClient

        async def main():
            async with AsyncRaigoClient(api_key=os.environ["RAIGO_API_KEY"]) as raigo:
                result = await raigo.evaluate(prompt="Send email to all users")
                if not result.allow:
                    raise PermissionError(result.policy_message)

        asyncio.run(main())
    """

    DEFAULT_BASE_URL = "https://raigocloud.manus.space"

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 10.0,
    ) -> None:
        resolved_key = api_key or os.environ.get("RAIGO_API_KEY")
        if not resolved_key:
            raise ValueError(
                "raigo API key is required. Pass api_key= or set RAIGO_API_KEY."
            )
        self._api_key = resolved_key
        self._base_url = (base_url or self.DEFAULT_BASE_URL).rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "User-Agent": f"raigo-python/{__version__}",
            },
            timeout=timeout,
        )

    async def _post(self, path: str, body: Dict[str, Any]) -> Dict[str, Any]:
        resp = await self._client.post(path, json=body)
        data = resp.json()
        if not resp.is_success:
            raise RaigoApiError(
                status=resp.status_code,
                code=data.get("code", "UNKNOWN_ERROR"),
                message=data.get("message", f"HTTP {resp.status_code}"),
            )
        return data

    async def _get(self, path: str) -> Dict[str, Any]:
        resp = await self._client.get(path)
        data = resp.json()
        if not resp.is_success:
            raise RaigoApiError(
                status=resp.status_code,
                code=data.get("code", "UNKNOWN_ERROR"),
                message=data.get("message", f"HTTP {resp.status_code}"),
            )
        return data

    async def evaluate(
        self,
        prompt: Optional[str] = None,
        content: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EvalResult:
        """Evaluate a prompt or action against your raigo policy (async)."""
        body: Dict[str, Any] = {}
        if prompt:
            body["prompt"] = prompt
        if content:
            body["content"] = content
        if context:
            body["context"] = context
        if metadata:
            body["metadata"] = metadata

        data = await self._post("/v1/evaluate", body)
        return EvalResult.from_dict(data)

    async def evaluate_and_wait(
        self,
        prompt: Optional[str] = None,
        content: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        timeout_s: float = 300.0,
        poll_interval_s: float = 3.0,
        on_pending: Optional[Callable[[str, float], None]] = None,
    ) -> EvalResult:
        """Evaluate and wait for human approval if required (async)."""
        import asyncio

        result = await self.evaluate(
            prompt=prompt,
            content=content,
            context=context,
            metadata=metadata,
        )

        if result.action != "DENY":
            return result

        if not result.approval_id:
            return result

        approval_id = result.approval_id
        start = time.monotonic()

        while True:
            elapsed = time.monotonic() - start

            if elapsed >= timeout_s:
                raise RaigoApprovalTimeoutError(approval_id, elapsed)

            poll = await self.poll_approval(approval_id)

            if poll.status == "approved":
                result.allow = True
                return result

            if poll.status == "denied":
                raise RaigoApprovalDeniedError(approval_id, poll.reviewer_note)

            if poll.status == "expired":
                raise RaigoApprovalTimeoutError(approval_id, elapsed)

            if on_pending:
                on_pending(approval_id, elapsed)

            await asyncio.sleep(poll_interval_s)

    async def poll_approval(self, approval_id: str) -> ApprovalPollResult:
        """Poll the status of a specific approval record (async)."""
        data = await self._get(f"/v1/approvals/{approval_id}")
        return ApprovalPollResult.from_dict(data)

    async def health(self) -> Dict[str, Any]:
        """Check the health of the raigo Cloud API (async)."""
        return await self._get("/v1/health")

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> "AsyncRaigoClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
