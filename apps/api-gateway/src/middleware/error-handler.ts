import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
```

FILE: apps/nlu-service/requirements.txt
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
scikit-learn==1.4.0
numpy==1.26.3