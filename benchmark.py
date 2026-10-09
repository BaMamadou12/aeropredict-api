"""
Benchmark MLOps — Test de charge HTTP pour l'API de prévision.
Mesure la latence moyenne et le débit (requêtes/seconde).
"""
import time
import statistics
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = "http://localhost:8000"
NUM_REQUESTS = 100
CONCURRENT_WORKERS = 10

def test_health():
    """Test endpoint /health"""
    start = time.perf_counter()
    resp = requests.get(f"{API_URL}/health", timeout=10)
    latency = (time.perf_counter() - start) * 1000
    return latency, resp.status_code == 200

def test_predict():
    """Test endpoint /predict avec une route exemple"""
    payload = {
        "origin": "ATL",
        "destination": "ORD",
        "model": "xgboost",
        "horizon": 1
    }
    start = time.perf_counter()
    resp = requests.post(f"{API_URL}/predict", json=payload, timeout=10)
    latency = (time.perf_counter() - start) * 1000
    return latency, resp.status_code == 200

def test_routes():
    """Test endpoint /routes"""
    start = time.perf_counter()
    resp = requests.get(f"{API_URL}/routes", timeout=10)
    latency = (time.perf_counter() - start) * 1000
    return latency, resp.status_code == 200

def run_load_test(test_func, name, num_requests=NUM_REQUESTS, workers=CONCURRENT_WORKERS):
    """Exécute un test de charge concurrent"""
    latencies = []
    successes = 0
    failures = 0

    start_time = time.perf_counter()

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(test_func) for _ in range(num_requests)]
        for future in as_completed(futures):
            try:
                latency, success = future.result()
                latencies.append(latency)
                if success:
                    successes += 1
                else:
                    failures += 1
            except Exception as e:
                failures += 1

    total_time = time.perf_counter() - start_time
    throughput = num_requests / total_time

    return {
        "endpoint": name,
        "requests": num_requests,
        "workers": workers,
        "successes": successes,
        "failures": failures,
        "latency_mean_ms": statistics.mean(latencies) if latencies else 0,
        "latency_p50_ms": statistics.median(latencies) if latencies else 0,
        "latency_p95_ms": sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
        "latency_min_ms": min(latencies) if latencies else 0,
        "latency_max_ms": max(latencies) if latencies else 0,
        "throughput_rps": throughput,
        "total_time_s": total_time
    }

def main():
    print("=" * 60)
    print("BENCHMARK MLOps — API de Prévision du Trafic Aérien")
    print("=" * 60)

    # Vérification connectivité
    print("\n[1] Vérification de la connectivité API...")
    try:
        resp = requests.get(f"{API_URL}/health", timeout=5)
        health = resp.json()
        print(f"    [OK] API accessible - {health['routes_disponibles']} routes, modeles: {health['modeles_charges']}")
    except Exception as e:
        print(f"    [ERREUR] API inaccessible: {e}")
        return

    # Tests de charge
    print(f"\n[2] Test de charge HTTP ({NUM_REQUESTS} requêtes, {CONCURRENT_WORKERS} workers)")
    print("-" * 60)

    tests = [
        (test_health, "/health"),
        (test_predict, "/predict"),
        (test_routes, "/routes"),
    ]

    results = []
    for test_func, name in tests:
        print(f"    Testing {name}...", end=" ", flush=True)
        result = run_load_test(test_func, name)
        results.append(result)
        print(f"OK ({result['latency_mean_ms']:.1f}ms avg, {result['throughput_rps']:.1f} req/s)")

    # Résumé
    print("\n" + "=" * 60)
    print("RÉSULTATS DU BENCHMARK")
    print("=" * 60)

    print(f"\n{'Endpoint':<15} {'Latence Moy.':<15} {'P95':<12} {'Débit':<15} {'Succès':<10}")
    print("-" * 60)
    for r in results:
        print(f"{r['endpoint']:<15} {r['latency_mean_ms']:>10.2f} ms   {r['latency_p95_ms']:>8.2f} ms   {r['throughput_rps']:>10.1f} rps   {r['successes']}/{r['requests']}")

    # Métriques principales pour le rapport
    predict_result = next((r for r in results if r['endpoint'] == '/predict'), None)
    if predict_result:
        print("\n" + "=" * 60)
        print("MÉTRIQUES CLÉS POUR TABLEAU 6.1")
        print("=" * 60)
        print(f"  • Latence moyenne (predict)  : {predict_result['latency_mean_ms']:.2f} ms")
        print(f"  • Latence P95 (predict)      : {predict_result['latency_p95_ms']:.2f} ms")
        print(f"  • Débit (predict)            : {predict_result['throughput_rps']:.1f} req/s")

    return results

if __name__ == "__main__":
    main()
