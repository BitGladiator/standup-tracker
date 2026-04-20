import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    'http_req_duration{endpoint:health}': ['p(95)<500'],
    k6_errors: ['rate<0.01'],
  },
  ext: {
    loadimpact: {
      name: 'Standup Tracker Smoke Test',
    },
  },
};

const errorRate = new Rate('k6_errors');
const requestDuration = new Trend('k6_request_duration');
const requestCount = new Counter('k6_requests_total');

const BASE_URL = 'http://localhost:5500';

export default function () {
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    tags: { endpoint: 'health' },
  });

  check(healthRes, {
    'health check 200': (r) => r.status === 200,
    'health check fast': (r) => r.timings.duration < 100,
  });

  requestDuration.add(healthRes.timings.duration, { endpoint: 'health' });
  requestCount.add(1, { endpoint: 'health' });
  errorRate.add(healthRes.status !== 200);

  const meRes = http.get(`${BASE_URL}/api/auth/me`, {
    tags: { endpoint: 'auth_me' },
  });

  check(meRes, {
    'unauth returns 401': (r) => r.status === 401,
  });

  requestDuration.add(meRes.timings.duration, { endpoint: 'auth_me' });
  requestCount.add(1, { endpoint: 'auth_me' });

  sleep(1);
}