# TODO
# Monitoring

## Health Checks

- API Gateway: `GET http://localhost:3000/health`
- NLU Service: `GET http://localhost:8001/health`
- Dialog Service: `GET http://localhost:3001/health`

## Metrics

- Track in production:
  - Intent classification accuracy
  - Dialog completion rate
  - Response latency (p95)
  - Escalation rate