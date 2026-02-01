import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";

export const options = {
  scenarios: {
    // enqueue: {
    //   executor: "ramping-vus",
    //   startVUs: 0,
    //   stages: [
    //     { duration: "5s", target: 1 },
    //     { duration: "60s", target: 1 },
    //     { duration: "5s", target: 0 },
    //   ],
    // },
    overload: {
      executor: "constant-arrival-rate",
      rate: 2,            // 2 req/s
      timeUnit: "1s",
      duration: "3m",
      preAllocatedVUs: 10, 
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],        
    http_req_duration: ["p(95)<800"],      
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:8080";
const TOKEN = __ENV.TOKEN;
const SID = __ENV.SID;

export default function () {
    if (exec.vu.idInTest === 1 && exec.vu.iterationInInstance === 0) {
    console.log(`k6 BASE_URL=${BASE} url=${BASE}/chat/messages/async SID=${SID ? "set" : "missing"}`);
  }

  const url = `${BASE}/chat/messages/async`;
  const payload = JSON.stringify({
    session_id: SID,
    message: `Reply with exactly: OK (t=${Date.now()})`,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    timeout: "10s",
  };

  const res = http.post(url, payload, params);

  if (res.status !== 200 && Math.random() < 0.02) {
    console.log(`FAILED status=${res.status} body=${res.body}`);
  }

  // 200 is expected
  check(res, {
    "status is 200": (r) => r.status === 200,
    "has job_id": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body?.data?.job_id?.length > 0;
      } catch (_) {
        return false;
      }
    },
  });

  // Do not use sleep in the constant-arrival-rate scenario
//   sleep(5);
}