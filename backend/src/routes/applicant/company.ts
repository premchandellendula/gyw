import express, { Request, Response } from 'express';
const router = express.Router();
import { PrismaClient } from '../../generated/prisma';
import roleMiddleware from '../../middleware/roleMiddleware';
const prisma  = new PrismaClient();

router.get('/', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const applicantId = req.user?.userId;
    if(!applicantId){
        return res.status(401).json({ message: "Unauthorized" })
    }

    const {
        name,
        industry,
        location,
        size,
        sortBy = 'createdAt',
        order = 'desc',
        page = 1,
        limit = 10
    } = req.query;

    const filters: any = {};

    if (name) {
        filters.name = { contains: name, mode: 'insensitive' };
    }
    if (industry) {
        filters.industry = industry;
    }
    if (location) {
        filters.location = location;
    }
    if (size) {
        filters.size = size;
    }

    try {
        const companies = await prisma.company.findMany({
            where: filters,
            orderBy: {
                [sortBy as string]: order
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit)
        });

        const total = await prisma.company.count({ where: filters });

        return res.status(200).json({
            message: "Companies fetched successfully",
            companies,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch(err) {
        console.error(`Error fetching the list of companies `, err)
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

router.get('/:id/jobs', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const applicantId = req.user?.userId;
    if(!applicantId){
        return res.status(401).json({ message: "Unauthorized" })
    }

    const { id } = req.params;

    try {
        const company = await prisma.company.findUnique({
            where: {
                id
            },
            include: {
                jobs: {
                    select: {
                        title: true,
                        skills: true,
                        minCTC: true,
                        maxCTC: true,
                        minExperience: true,
                        maxExperience: true,
                        employmentType: true,
                        jobType: true,
                        openings: true,
                        noticePeriod: true
                    }
                }
            }
        })

        return res.status(200).json({
            message: "Company fetched successfully",
            company
        });
    } catch(err) {
        console.error(`Error fetching the company with id:${id} `, err)
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

router.get('/:id', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const applicantId = req.user?.userId;
    if(!applicantId){
        return res.status(401).json({ message: "Unauthorized" })
    }

    const companyId = req.params.id;

    try {
        const companyJobs = await prisma.job.findMany({
            where: {
                companyId
            }
        })

        return res.status(200).json({
            message: "Company fetched successfully",
            companyJobs
        });
    } catch(err) {
        console.error(`Error fetching the jobs of a company with id:${companyId} `, err)
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

export default router;