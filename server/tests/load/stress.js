import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

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
    errors: ['rate<0.05'],  
  },
};

const BASE_URL = 'http://localhost:5500';

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/health`],
    ['GET', `${BASE_URL}/api/auth/me`],
  ]);

  responses.forEach((res) => {
    requestDuration.add(res.timings.duration);
    errorRate.add(res.status >= 500);

    check(res, {
      'no server errors': (r) => r.status < 500,
      'response under 2s': (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.5);
}