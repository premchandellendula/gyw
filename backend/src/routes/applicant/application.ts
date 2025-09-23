import express, { Request, Response } from 'express';
import roleMiddleware from '../../middleware/roleMiddleware';
const router = express.Router();
import { ApplicationStatus, PrismaClient } from '../../generated/prisma';
const prisma = new PrismaClient();

router.get('/me', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const applicantId = req.user?.userId;
    if(!applicantId){
        return res.status(401).json({ message: "Unauthorized" })
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const statusRaw = req.query.status as string | undefined;
    const validStatuses = Object.values(ApplicationStatus);

    const status = statusRaw && validStatuses.includes(statusRaw as ApplicationStatus)
    ? (statusRaw as ApplicationStatus)
    : undefined;

    try {
        const total = await prisma.application.count({
            where: {
                applicantId,
                ...(status ? { status} : {})
            }
        })
        const applications = await prisma.application.findMany({
            where: {
                applicantId,
                ...(status ? { status } : {})
            },
            include: {
                job: {
                    include: {
                        company: true,
                        recruiter: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limit
        })

        return res.status(200).json({
            message: "Applications fetched successfully",
            data: applications,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: skip + limit < total,
                hasPrevPage: page > 1
            }
        });
    } catch(err) {
        console.error(`Error fetching applications applied by applicantId:${applicantId}`, err)
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})