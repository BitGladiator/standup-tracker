import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  vus: 5,           
  duration: '30s',  
  thresholds: {
    http_req_duration: ['p(95)<500'],  
    errors: ['rate<0.01'],             
  },
};

const BASE_URL = 'http://localhost:5500';

export default function () {
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check returns 200': (r) => r.status === 200,
    'health check is fast': (r) => r.timings.duration < 100,
  });
  errorRate.add(healthRes.status !== 200);


  const meRes = http.get(`${BASE_URL}/api/auth/me`);
  check(meRes, {
    'unauthenticated returns 401': (r) => r.status === 401,
  });

  sleep(1);
}