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
  
  // Simulate employer login
  const loginRes = http.post(`${baseUrl}/api/auth/login`, {
    email: 'employer@test.com',
    password: 'test123',
  });
  check(loginRes, { 'login successful': (r) => r.status === 200 });
  
  sleep(1);
  
  // Fetch dashboard
  const dashRes = http.get(`${baseUrl}/api/employer/dashboard`);
  check(dashRes, { 'dashboard loaded': (r) => r.status === 200 });
  
  sleep(2);
  
  // Fetch employees
  const empRes = http.get(`${baseUrl}/api/employer/employees`);
  check(empRes, { 'employees loaded': (r) => r.status === 200 });
  
  sleep(1);
}
