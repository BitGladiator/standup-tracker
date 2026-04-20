import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

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
    errors: ['rate<0.1'],  
  },
};

const BASE_URL = 'http://localhost:5500';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    'server survives spike': (r) => r.status < 500,
  });

  errorRate.add(res.status >= 500);
  sleep(0.1);
}