import pytest
from httpx import AsyncClient

from app.db.session import async_session_factory
from app.models.db.models import BenchmarkRun


@pytest.fixture
async def seed_history_runs():
    """Seed sample benchmark runs in history."""
    async with async_session_factory() as session:
        run1 = BenchmarkRun(
            id="bmk_history_1",
            name="History Test 1",
            vendor="openai",
            model="gpt-4o",
            workload_preset="chat",
            load_curve="constant",
            concurrency=4,
            duration_seconds=15,
            status="completed",
            total_requests=20,
            completed_requests=20,
            failed_requests=0,
            total_prompt_tokens=200,
            total_gen_tokens=400,
            total_cost_usd=0.012,
            ttft_p50=180.0,
            ttft_p75=220.0,
            ttft_p95=280.0,
            ttft_p99=320.0,
            itl_p50=20.0,
            itl_p75=25.0,
            itl_p95=30.0,
            itl_p99=40.0,
            max_itl=55.0,
            tpot_mean=22.0,
            tps_decode=95.0,
            goodput_pct=95.0,
            error_rate_pct=0.0,
            dns_p50=12.0,
            tcp_p50=18.0,
            tls_p50=22.0,
            config_snapshot={"name": "History Test 1", "model": "gpt-4o"},
        )
        run2 = BenchmarkRun(
            id="bmk_history_2",
            name="History Test 2",
            vendor="anthropic",
            model="claude-3-5-sonnet-20241022",
            workload_preset="rag",
            load_curve="poisson",
            concurrency=8,
            duration_seconds=30,
            status="completed",
            total_requests=40,
            completed_requests=38,
            failed_requests=2,
            total_prompt_tokens=4000,
            total_gen_tokens=1200,
            total_cost_usd=0.048,
            ttft_p50=350.0,
            ttft_p75=420.0,
            ttft_p95=580.0,
            ttft_p99=720.0,
            itl_p50=18.0,
            itl_p75=22.0,
            itl_p95=28.0,
            itl_p99=35.0,
            max_itl=48.0,
            tpot_mean=19.0,
            tps_decode=110.0,
            goodput_pct=90.0,
            error_rate_pct=5.0,
            dns_p50=10.0,
            tcp_p50=15.0,
            tls_p50=20.0,
            config_snapshot={"name": "History Test 2", "model": "claude-3-5-sonnet-20241022"},
        )
        session.add_all([run1, run2])
        await session.commit()


@pytest.mark.asyncio
async def test_list_history_empty(async_client: AsyncClient):
    """Test GET /api/history when no runs exist."""
    resp = await async_client.get("/api/history")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_history_populated(async_client: AsyncClient, seed_history_runs):
    """Test GET /api/history returns stored runs."""
    resp = await async_client.get("/api/history?limit=10&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    ids = [item["id"] for item in data]
    assert "bmk_history_1" in ids
    assert "bmk_history_2" in ids


@pytest.mark.asyncio
async def test_list_history_pagination(async_client: AsyncClient, seed_history_runs):
    """Test GET /api/history pagination limits."""
    resp = await async_client.get("/api/history?limit=1&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1

    resp_offset = await async_client.get("/api/history?limit=1&offset=1")
    assert resp_offset.status_code == 200
    data_offset = resp_offset.json()
    assert len(data_offset) == 1
    assert data[0]["id"] != data_offset[0]["id"]


@pytest.mark.asyncio
async def test_get_history_details_success(async_client: AsyncClient, seed_history_runs):
    """Test GET /api/history/{run_id} returns full run details."""
    resp = await async_client.get("/api/history/bmk_history_1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "bmk_history_1"
    assert data["vendor"] == "openai"
    assert data["model"] == "gpt-4o"
    assert "counts" in data
    assert data["counts"]["total_requests"] == 20
    assert "percentiles" in data
    assert data["percentiles"]["ttft_p50"] == 180.0
    assert "waterfall" in data
    assert data["waterfall"]["dns_p50"] == 12.0


@pytest.mark.asyncio
async def test_get_history_details_not_found(async_client: AsyncClient):
    """Test GET /api/history/{run_id} returns 404 for nonexistent run."""
    resp = await async_client.get("/api/history/non_existent_run_123")
    assert resp.status_code == 404
    data = resp.json()
    assert "not found" in data["detail"].lower()
