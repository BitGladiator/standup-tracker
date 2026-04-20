import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 50 },
    { duration: '2m',  target: 100 },
    { duration: '1m',  target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    k6_errors: ['rate<0.05'],
  },
};

const errorRate = new Rate('k6_errors');
const requestDuration = new Trend('k6_request_duration');
const requestCount = new Counter('k6_requests_total');
const activeVUs = new Gauge('k6_active_vus');

const BASE_URL = 'http://localhost:5500';

export default function () {
  activeVUs.add(__VU);

  const responses = http.batch([
    ['GET', `${BASE_URL}/api/health`,   null, { tags: { endpoint: 'health' } }],
    ['GET', `${BASE_URL}/api/auth/me`,  null, { tags: { endpoint: 'auth_me' } }],
  ]);

  responses.forEach((res, i) => {
    const endpoint = i === 0 ? 'health' : 'auth_me';
    requestDuration.add(res.timings.duration, { endpoint });
    requestCount.add(1, { endpoint });
    errorRate.add(res.status >= 500);

    check(res, {
      'no server errors': (r) => r.status < 500,
      'under 2s': (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.5);
}