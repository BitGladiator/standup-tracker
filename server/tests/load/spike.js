import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '10s', target: 300 },
    { duration: '30s', target: 300 },
    { duration: '10s', target: 5 },
    { duration: '30s', target: 5 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    k6_errors: ['rate<0.1'],
  },
};

const errorRate = new Rate('k6_errors');
const requestDuration = new Trend('k6_request_duration');
const requestCount = new Counter('k6_requests_total');

const BASE_URL = 'http://localhost:5500';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`, {
    tags: { endpoint: 'health', test: 'spike' },
  });

  requestDuration.add(res.timings.duration, { test: 'spike' });
  requestCount.add(1, { test: 'spike' });
  errorRate.add(res.status >= 500);

  check(res, {
    'server survives spike': (r) => r.status < 500,
  });

  sleep(0.1);
}