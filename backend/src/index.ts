import express from 'express';
import cors from 'cors';
import rootRouter from './routes/index'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express';
import { Documentation } from './docs/documentation';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import session from 'express-session';
import passport from 'passport';

const app = express()
const port = process.env.PORT || 8000

app.use(express.json())
app.use(cors())
app.use(cookieParser());
app.use(morgan('combined'))

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use('/api/v1', rootRouter)

app.get('/api-docs.json', (req, res) => {
  res.json(Documentation.getAPIJson())
})
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
  swaggerUrl: '/api-docs.json'
}));

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
})
