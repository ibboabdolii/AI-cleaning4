# TODO
# Troubleshooting

## Service won't start

- Check Redis connection
- Verify environment variables
- Check port availability

## NLU not classifying correctly

- Review intent patterns in `apps/nlu-service/src/intent_classifier/classifier.py`
- Add more patterns for edge cases

## Sessions not persisting

- Verify Redis connectivity
- Check TTL settings (24h default)