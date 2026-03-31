import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '3m', target: 20 },   // Stay at 20 for 3 minutes
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const baseUrl = 'https://www.workschedule.uk';
  
  // Simulate employee login
  const loginRes = http.post(`${baseUrl}/api/auth/login`, {
    email: 'employee@test.com',
    password: 'test123',
  });
  check(loginRes, { 'login successful': (r) => r.status === 200 });
  
  sleep(1);
  
  // Fetch employee schedule
  const schedRes = http.get(`${baseUrl}/api/employee/schedule`);
  check(schedRes, { 'schedule loaded': (r) => r.status === 200 });
  
  sleep(2);
  
  // Fetch time-off requests
  const timeoffRes = http.get(`${baseUrl}/api/employee/timeoff-requests`);
  check(timeoffRes, { 'time-off requests loaded': (r) => r.status === 200 });
  
  sleep(1);
}
