import express from 'express';
import cors from 'cors';
import rootRouter from './routes/index'
import cookieParser from 'cookie-parser'

const app = express()
const port = process.env.PORT || 8000

app.use(express.json())
app.use(cors())
app.use(cookieParser());

app.use('/api/v1', rootRouter)

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
})
