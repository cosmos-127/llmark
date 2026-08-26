import asyncio
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    """Test health check route."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_cost_estimate_route(async_client: AsyncClient):
    """Test pre-flight cost estimation endpoint."""
    response = await async_client.get(
        "/api/benchmark/cost-estimate",
        params={
            "vendor": "openai",
            "model": "gpt-4o",
            "workload_preset": "rag",
            "concurrency": 5,
            "duration_seconds": 30,
            "hard_spend_cap": 2.0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["estimated_requests"] > 0
    assert data["estimated_cost_usd"] > 0


@pytest.mark.asyncio
async def test_benchmark_run_lifecycle(async_client: AsyncClient):
    """Test starting a benchmark, waiting for completion, and retrieving history."""
    payload = {
        "name": "Integration Test Run",
        "vendor": "mock",
        "model": "gpt-4o",
        "workload_preset": "chat",
        "concurrency": 2,
        "duration_seconds": 1,
        "max_tokens": 10,
        "warmup_requests": 0,
        "hard_spend_cap": 5.0,
    }

    # 1. Start benchmark
    start_resp = await async_client.post("/api/benchmark/run", json=payload)
    assert start_resp.status_code == 201
    start_data = start_resp.json()
    assert "benchmark_id" in start_data
    benchmark_id = start_data["benchmark_id"]

    # 2. Check active benchmark status
    status_resp = await async_client.get(f"/api/benchmark/{benchmark_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["benchmark_id"] == benchmark_id

    # 3. Wait for run to complete
    for _ in range(40):
        await asyncio.sleep(0.1)
        curr = await async_client.get(f"/api/benchmark/{benchmark_id}")
        if curr.json()["status"] == "completed":
            break

    # 4. Check historical run in DB (wait for DB commit if needed)
    history = []
    for _ in range(30):
        history_resp = await async_client.get("/api/history")
        assert history_resp.status_code == 200
        history = history_resp.json()
        if any(r["id"] == benchmark_id for r in history):
            break
        await asyncio.sleep(0.1)

    assert len(history) >= 1
    matched = [r for r in history if r["id"] == benchmark_id]
    assert len(matched) == 1
    assert matched[0]["status"] == "completed"
    assert matched[0]["completed_requests"] >= 1

    # 5. Check run details endpoint
    details_resp = await async_client.get(f"/api/history/{benchmark_id}")
    assert details_resp.status_code == 200
    details = details_resp.json()
    assert details["id"] == benchmark_id
    assert details["counts"]["completed_requests"] >= 1
    assert "percentiles" in details
    assert "waterfall" in details


@pytest.mark.asyncio
async def test_abort_benchmark(async_client: AsyncClient):
    """Test starting a long benchmark and aborting it."""
    payload = {
        "name": "Abort Test Run",
        "vendor": "mock",
        "model": "gpt-4o",
        "workload_preset": "chat",
        "concurrency": 5,
        "duration_seconds": 60,
        "warmup_requests": 0,
    }

    # Start
    start_resp = await async_client.post("/api/benchmark/run", json=payload)
    benchmark_id = start_resp.json()["benchmark_id"]

    # Abort
    abort_resp = await async_client.post(f"/api/benchmark/{benchmark_id}/abort")
    assert abort_resp.status_code == 200
    assert abort_resp.json()["status"] == "aborted"


@pytest.mark.asyncio
async def test_list_models_route(async_client: AsyncClient):
    """Test listing models for mock and openai vendors."""
    # Test Mock vendor
    mock_resp = await async_client.post(
        "/api/benchmark/models",
        json={"vendor": "mock", "credential": {}},
    )
    assert mock_resp.status_code == 200
    mock_data = mock_resp.json()
    assert mock_data["vendor"] == "mock"
    assert "gpt-4o" in mock_data["models"]
    assert len(mock_data["models"]) >= 5

    # Test OpenAI fallback list when no key
    openai_resp = await async_client.post(
        "/api/benchmark/models",
        json={"vendor": "openai", "credential": {}},
    )
    assert openai_resp.status_code == 200
    openai_data = openai_resp.json()
    assert "gpt-4o" in openai_data["models"]


@pytest.mark.asyncio
async def test_benchmark_run_request_mode(async_client: AsyncClient):
    """Test running a request-based benchmark run until target requests complete."""
    payload = {
        "name": "Request Mode Run",
        "vendor": "mock",
        "model": "gpt-4o",
        "workload_preset": "chat",
        "test_mode": "requests",
        "total_requests": 3,
        "concurrency": 2,
        "duration_seconds": 60,
        "max_tokens": 10,
        "warmup_requests": 0,
        "hard_spend_cap": 5.0,
    }

    start_resp = await async_client.post("/api/benchmark/run", json=payload)
    assert start_resp.status_code == 201
    benchmark_id = start_resp.json()["benchmark_id"]

    for _ in range(25):
        await asyncio.sleep(0.2)
        curr = await async_client.get(f"/api/benchmark/{benchmark_id}")
        if curr.json()["status"] == "completed":
            break

    status_resp = await async_client.get(f"/api/benchmark/{benchmark_id}")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["status"] == "completed"
    assert data["total_requests"] == 3



