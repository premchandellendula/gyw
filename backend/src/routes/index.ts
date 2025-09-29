import express from 'express';
const router = express.Router();
import authRouter from './auth/auth'
import recruiterCompanyRouter from './recruiter/company'
import applicantCompanyRouter from './applicant/company'
import jobsRouter from './jobs/jobs'
import applicationRouter from './recruiter/application'
import seekersRouter from './recruiter/seeker'
import applicantApplicationRouter from './applicant/application'

router.use('/auth', authRouter)
router.use('/companies', recruiterCompanyRouter)
router.use('/companies', applicantCompanyRouter)
router.use('/jobs', jobsRouter)
router.use('/applications', applicationRouter)
router.use('/applications', applicantApplicationRouter)
router.use('/seekers', seekersRouter)

export default router;