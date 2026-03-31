import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 mixed users
    { duration: '3m', target: 50 },   // Stay at 50 for 3 minutes
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const baseUrl = 'https://www.workschedule.uk';
  const isEmployer = Math.random() > 0.5;
  
  if (isEmployer) {
    // Employer workflow
    const loginRes = http.post(`${baseUrl}/api/auth/login`, {
      email: 'employer@test.com',
      password: 'test123',
    });
    check(loginRes, { 'employer login': (r) => r.status === 200 });
    
    sleep(1);
    
    const dashRes = http.get(`${baseUrl}/api/employer/dashboard`);
    check(dashRes, { 'employer dashboard': (r) => r.status === 200 });
  } else {
    // Employee workflow
    const loginRes = http.post(`${baseUrl}/api/auth/login`, {
      email: 'employee@test.com',
      password: 'test123',
    });
    check(loginRes, { 'employee login': (r) => r.status === 200 });
    
    sleep(1);
    
    const schedRes = http.get(`${baseUrl}/api/employee/schedule`);
    check(schedRes, { 'employee schedule': (r) => r.status === 200 });
  }
  
  sleep(2);
}
