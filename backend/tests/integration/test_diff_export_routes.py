import pytest
from httpx import AsyncClient

from app.db.session import async_session_factory
from app.models.db.models import BenchmarkRun


@pytest.fixture
async def create_sample_runs():
    """Seed test database with two completed runs for diff and export tests."""
    async with async_session_factory() as session:
        run_a = BenchmarkRun(
            id="run_test_a",
            name="Run A Test",
            vendor="openai",
            model="gpt-4o",
            workload_preset="chat",
            load_curve="constant",
            concurrency=5,
            duration_seconds=30,
            status="completed",
            total_requests=50,
            completed_requests=50,
            failed_requests=0,
            total_cost_usd=0.02,
            ttft_p50=200.0,
            ttft_p95=300.0,
            ttft_p99=400.0,
            itl_p50=25.0,
            itl_p95=35.0,
            itl_p99=50.0,
            max_itl=70.0,
            tpot_mean=30.0,
            tps_decode=100.0,
            goodput_pct=92.0,
            dns_p50=10.0,
            tcp_p50=20.0,
            tls_p50=25.0,
            config_snapshot={"name": "Run A Test", "model": "gpt-4o"},
        )
        run_b = BenchmarkRun(
            id="run_test_b",
            name="Run B Test",
            vendor="groq",
            model="llama-3.3-70b",
            workload_preset="chat",
            load_curve="constant",
            concurrency=5,
            duration_seconds=30,
            status="completed",
            total_requests=50,
            completed_requests=50,
            failed_requests=0,
            total_cost_usd=0.01,
            ttft_p50=100.0,
            ttft_p95=150.0,
            ttft_p99=200.0,
            itl_p50=10.0,
            itl_p95=15.0,
            itl_p99=25.0,
            max_itl=35.0,
            tpot_mean=12.0,
            tps_decode=250.0,
            goodput_pct=98.0,
            dns_p50=10.0,
            tcp_p50=20.0,
            tls_p50=25.0,
            config_snapshot={"name": "Run B Test", "model": "llama-3.3-70b"},
        )
        session.add_all([run_a, run_b])
        await session.commit()


@pytest.mark.asyncio
async def test_diff_route(async_client: AsyncClient, create_sample_runs):
    """Test GET /api/diff route."""
    resp = await async_client.get("/api/diff?run_a=run_test_a&run_b=run_test_b")
    assert resp.status_code == 200
    data = resp.json()
    assert data["run_a_id"] == "run_test_a"
    assert data["run_b_id"] == "run_test_b"
    assert len(data["deltas"]) > 0


@pytest.mark.asyncio
async def test_export_markdown_route(async_client: AsyncClient, create_sample_runs):
    """Test GET /api/export/markdown/{id} route."""
    resp = await async_client.get("/api/export/markdown/run_test_a")
    assert resp.status_code == 200
    assert "LLMark Benchmark Report" in resp.text


@pytest.mark.asyncio
async def test_export_csv_route(async_client: AsyncClient, create_sample_runs):
    """Test GET /api/export/csv/{id} route."""
    resp = await async_client.get("/api/export/csv/run_test_a")
    assert resp.status_code == 200
    assert "Metric Category,Metric Name,Value,Unit" in resp.text


@pytest.mark.asyncio
async def test_export_pdf_route(async_client: AsyncClient, create_sample_runs):
    """Test GET /api/export/pdf/{id} route."""
    resp = await async_client.get("/api/export/pdf/run_test_a")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_export_bundle_route(async_client: AsyncClient, create_sample_runs):
    """Test GET /api/export/bundle/{id} route."""
    resp = await async_client.get("/api/export/bundle/run_test_a")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/gzip"
    assert len(resp.content) > 0
