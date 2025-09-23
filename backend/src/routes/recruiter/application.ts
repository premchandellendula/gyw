import express, { Request, Response } from 'express';
import roleMiddleware from '../../middleware/roleMiddleware';
const router = express.Router();
import zod from 'zod';
import { PrismaClient } from '../../generated/prisma';
const prisma = new PrismaClient();

// ------ Recruiter ------
router.get('/:id', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const { id } = req.params;

    const recruiterId = req.user?.userId;
    if(!recruiterId){
        return res.status(401).json({ message: "Unauthorized" })
    }

    try {
        const application = await prisma.application.findUnique({
            where: {
                id
            },
            include: {
                applicant: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                job: {
                    include: {
                        company: {
                            select: {
                                name: true,
                                logoUrl: true
                            }
                        },
                        recruiter: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        if (application.job.recruiterId !== recruiterId) {
            return res.status(403).json({ message: "Forbidden: You can only view applications for your own jobs." });
        }

        return res.status(200).json({
            message: "Application fetched successfully",
            application
        })
    } catch(err) {
        console.error(`Error fetching the application for applicationId=${id}`, err);
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

const applicationPatchBody = zod.object({
    status: zod.enum(["PENDING", "REVIEWED", "ACCEPTED", "REJECTED", "WITHDRAWN"])
})

router.patch('/:id/status', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const recruiterId = req.user?.userId;
    if(!recruiterId){
        return res.status(401).json({ message: "Unauthorized" })
    }

    const response = applicationPatchBody.safeParse(req.body);
    if(!response.success){
        return res.status(400).json({
            message: "Invalid input"
        })
    }

    const { id } = req.params;
    const {status} = response.data

    try {
        const application = await prisma.application.findUnique({
            where: {
                id
            },
            include: {
                job: {
                    select: { recruiterId: true }
                }
            }
        })

        if(!application){
            return res.status(404).json({ message: "Application not found" })
        }

        if(application.job.recruiterId !== recruiterId){
            return res.status(403).json({ message: "Forbidden: You can only update applications for your own jobs." });
        }

        const updatedApplication = await prisma.application.update({
            where: {
                id
            },
            data: {
                status
            },
            include: {
                job: true,
                applicant: true
            }
        })

        return res.status(200).json({
            message: "Application status updated successfully",
            application: updatedApplication
        })
    } catch(err) {
        console.error(`Error updating the application status [applicationId=${id}, recruiterId=${recruiterId}]:`, err)
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

router.get('/:id/resume', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const recruiterId = req.user?.userId;
    if (!recruiterId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const { id } = req.params;

    try {
        const application = await prisma.application.findUnique({
            where: { id },
            include: {
                applicant: {
                    select: {
                        resumeUrl: true
                    }
                },
                job: {
                    select: {
                        recruiterId: true
                    }
                }
            }
        });

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        if (application.job.recruiterId !== recruiterId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const resumeUrl = application.applicant.resumeUrl;

        if (!resumeUrl) {
            return res.status(404).json({ message: "Resume not found for this applicant." });
        }

        return res.redirect(resumeUrl);

    } catch (err) {
        console.error(`Error downloading resume for applicationId=${id}`, err);
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
});

export default router;