import { Request, Response, Router } from "express";
const router = Router();
import zod from 'zod';
import roleMiddleware from "../../middleware/roleMiddleware";
import { PrismaClient } from "../../generated/prisma";
import { DepartmentEnum, JobRolEnum } from "../../types/types";
const prisma = new PrismaClient();


// ─────────────────────────────
//     RECRUITER JOB ROUTES
// ─────────────────────────────

const jobPostBody = zod.object({
    companyId: zod.uuid(),
    title: zod.string(),
    description: zod.string(),
    skills: zod.array(zod.string()).min(1),
    location: zod.string(),
    role: JobRolEnum,
    department: DepartmentEnum,
    ctcType: zod.enum(["RANGE", "COMPETITIVE", "UNDISCLOSED"]),
    minCTC: zod.number().nonnegative(),
    maxCTC: zod.number().nonnegative(),
    currency: zod.enum(["INR", "USD", "EUR"]),
    minExperience: zod.number(),
    maxExperience: zod.number(),
    employmentType: zod.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
    jobType: zod.enum(["ONSITE", "REMOTE", "HYBRID"]),
    openings: zod.number(),
    relocationAssistance: zod.boolean().default(false),
    visaSponsorship: zod.boolean().default(false),
    noticePeriod: zod.enum(["IMMEDIATE", "WITHIN_15_DAYS", "WITHIN_30_DAYS", "FLEXIBLE"]),
    durationInMonths: zod.number().nullable().optional(),
    benefits: zod.array(zod.string()),
    applicationDeadline: zod.coerce.date().refine(date => date > new Date(), {
        message: "Deadline must be in the future"
    })
}).refine(data => {
    if (data.ctcType === "RANGE") {
        return data.minCTC <= data.maxCTC;
    }
    return true;
}, {
    message: "minCTC must be less than or equal to maxCTC",
    path: ["minCTC"],
});

router.post('', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const recruiterId = req.user?.userId;
    if(!recruiterId){
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const response = jobPostBody.safeParse(req.body);

    if(!response.success){
        return res.status(400).json({
            message: "Incorrect inputs"
        })
    }

    const jobData = response.data;

    try {
        const job = await prisma.job.create({
            data: {
                ...jobData, 
                recruiterId: recruiterId
            }
        })

        res.status(201).json({
            message: "Job created successfully",
            job
        })
    } catch(err) {
        console.error("Error creating a job:", err);
        return res.status(500).json({
            message: "Error creating a job",
            error: err instanceof Error ? err.message : "Unknown error",
        })
    }
})

router.get('/me', roleMiddleware("RECRUITER") , async (req: Request, res: Response) => {
    const recruiterId = req.user?.userId;
    if(!recruiterId){
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const jobs = await prisma.job.findMany({
            where: {
                recruiterId: recruiterId
            },
            orderBy: { createdAt: 'desc' },
            include: {
                company: true,
                recruiter: true,
                applications: {
                    include: {
                        applicant: true
                    }
                }
            }
        })

        res.status(200).json({
            message: "Jobs by recruiter fetched successfully",
            jobs
        })
    } catch(err) {
        console.error("Error fetching jobs by a recruiter:", err);
        return res.status(500).json({
            message: "Error fetching jobs by a recruiter",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

const jobPutBody = zod.object({
    companyId: zod.uuid().optional(),
    title: zod.string().optional(),
    description: zod.string().optional(),
    skills: zod.array(zod.string()).min(1).optional(),
    location: zod.string().optional(),
    ctcType: zod.enum(["RANGE", "COMPETITIVE", "UNDISCLOSED"]).optional(),
    minCTC: zod.number().nonnegative().optional(),
    maxCTC: zod.number().nonnegative().optional(),
    currency: zod.enum(["INR", "USD", "EUR"]).optional(),
    minExperience: zod.number().optional(),
    maxExperience: zod.number().optional(),
    employmentType: zod.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
    jobType: zod.enum(["ONSITE", "REMOTE", "HYBRID"]).optional(),
    openings: zod.number().optional(),
    relocationAssistance: zod.boolean().optional(),
    visaSponsorship: zod.boolean().optional(),
    noticePeriod: zod.enum(["IMMEDIATE", "WITHIN_15_DAYS", "WITHIN_30_DAYS", "FLEXIBLE"]).optional(),
    durationInMonths: zod.number().nullable().optional(),
    benefits: zod.array(zod.string()).optional(),
    applicationDeadline: zod.coerce.date().refine(date => date > new Date(), {
        message: "Deadline must be in the future"
    }).optional()
}).refine(data => {
    if (data.ctcType === "RANGE") {
        if (data.minCTC == null || data.maxCTC == null) return false;
        return data.minCTC <= data.maxCTC;
    }
    return true;
}, {
    message: "minCTC must be less than or equal to maxCTC when ctcType is RANGE",
    path: ["minCTC"]
});

router.put('/:jobId', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const response = jobPutBody.safeParse(req.body);
    if(!response.success){
        return res.status(400).json({
            message: "Incorrect inputs"
        })
    }

    const recruiterId = req.user?.userId;
    if(!recruiterId){
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const jobData = response.data;
    const { jobId } = req.params;

    try {
        const job = await prisma.job.findUnique({
            where: {
                id: jobId
            }
        })

        if(!job){
            return res.status(404).json({
                message: "Job not found"
            })
        }

        if (job.recruiterId !== recruiterId) {
            return res.status(403).json({ message: "Forbidden: You can't edit this job" });
        }

        const updatedJob = await prisma.job.update({
            where: {
                id: jobId
            },
            data: jobData
        })

        return res.status(200).json({
            message: "Job updated successfully",
            job: updatedJob
        });
    } catch(err) {
        console.error("Error updating job:", err);
        return res.status(500).json({
            message: "Error updating the job",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

router.delete('/:jobId', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const recruiterId = req.user?.userId;
    if(!recruiterId){
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { jobId } = req.params;

    try {
        const job = await prisma.job.findUnique({
            where: {
                id: jobId
            }
        })

        if(!job){
            return res.status(404).json({
                message: "Job not found"
            })
        }

        if (job.recruiterId !== recruiterId) {
            return res.status(403).json({ message: "Forbidden: You can't delete this job" });
        }

        const deletedJob = await prisma.job.delete({
            where: {
                id: jobId
            }
        })

        res.status(200).json({
            message: "Job deleted successfully",
            job: { id: deletedJob.id, title: deletedJob.title }
        })
    } catch(err) {
        console.error("Error deleting job:", err);
        return res.status(500).json({
            message: "Error deleting the job",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

// ─────────────────────────────
//     APPLICANT JOB ROUTES
// ─────────────────────────────

router.get('/', async (req: Request, res: Response) => {
    const { 
        page = '1', 
        limit = '25', 
        roles,
        skills,
        jobType,
        location, 
        workMode, 
        department,
        salaryMin,
        salaryMax,
        companyType, 
        postedDate,
        company 
    } = req.query;

    const pageNumber = Math.max(parseInt(page as string, 10), 1)
    const limitNumber = Math.min(Math.max(parseInt(limit as string, 10), 1), 100)
    const skip = (pageNumber - 1) * limitNumber;

    const userId = req.user?.userId;

    function parseToArray(param: any): string[] | undefined {
        if(!param) return undefined;

        if (Array.isArray(param)) {
            return param.map(String).filter(Boolean);
        }

        return String(param)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }

    try {
        const whereClause: any = {};

        if (userId) {
            whereClause.NOT = [
                {
                    applications: {
                        some: { userId }
                    }
                },
                {
                    hiddenBy: {
                        some: { userId }
                    }
                }
            ];
        }
        const rolesArray = parseToArray(roles)
        if(rolesArray && rolesArray.length){
            whereClause.role = {
                in: rolesArray,
            };
        }

        const skillsArray = parseToArray(skills);
        if (skillsArray && skillsArray.length) {
            whereClause.skills = {
                hasSome: skillsArray,
            };
        }

        const minExperience = parseInt(req.query.minExperience as string);
        const maxExperience = parseInt(req.query.maxExperience as string);

        if (!isNaN(minExperience) || !isNaN(maxExperience)) {
            whereClause.AND = whereClause.AND || [];

            if (!isNaN(minExperience)) {
                whereClause.AND.push({
                    maxExperience: { gte: minExperience }
                });
            }

            if (!isNaN(maxExperience)) {
                whereClause.AND.push({
                    minExperience: { lte: maxExperience }
                });
            }
        }

        if (company && typeof company === 'string') {
            whereClause.company = {
                name: {
                    contains: company,
                    mode: 'insensitive',
                },
            };
        }

        const jobTypeArray = parseToArray(jobType);
        if (jobTypeArray && jobTypeArray.length) {
            whereClause.jobType = {
                in: jobTypeArray,
            };
        }

        const locationArray = parseToArray(location);
        whereClause.OR = whereClause.OR || [];
        if (locationArray && locationArray.length) {
            whereClause.OR.push(...locationArray.map(loc => ({
                location: {
                    contains: loc,
                    mode: 'insensitive',
                }
            })));
        }

        const workModeArray = parseToArray(workMode);
        if (workModeArray && workModeArray.length) {
            whereClause.workMode = {
                in: workModeArray,
            };
        }

        const departmentArray = parseToArray(department);
        if (departmentArray && departmentArray.length) {
            whereClause.department = {
                in: departmentArray,
            };
        }

        if (salaryMin || salaryMax) {
            whereClause.AND = whereClause.AND || [];
            if (salaryMin) {
                const minSalary = parseInt(salaryMin as string, 10);
                if (!isNaN(minSalary)) {
                whereClause.AND.push({
                    salaryMax: {
                    gte: minSalary,
                    },
                });
                }
            }
            if (salaryMax) {
                const maxSalary = parseInt(salaryMax as string, 10);
                if (!isNaN(maxSalary)) {
                whereClause.AND.push({
                    salaryMin: {
                    lte: maxSalary,
                    },
                });
                }
            }
        }

        const companyTypeArray = parseToArray(companyType);
        if (companyTypeArray && companyTypeArray.length) {
            whereClause.companyType = {
                in: companyTypeArray,
            };
        }

        let orderBy = { createdAt: 'desc' as 'asc' | 'desc' };
        if (postedDate && typeof postedDate === 'string' && postedDate.toLowerCase() === 'oldest') {
            orderBy = { createdAt: 'asc' };
        }

        const [jobs, totalJobs] = await Promise.all([
            prisma.job.findMany({
                where: whereClause,
                skip,
                take: limitNumber,
                orderBy,
                include: {
                    company: true,
                    recruiter: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    name: true
                                }
                            },
                            positionTitle: true
                        }
                    }
                }
            }),
            prisma.job.count({ where: whereClause }),
        ]);

        return res.status(200).json({
            page: pageNumber,
            count: limitNumber,
            totalJobs,
            totalPages: Math.ceil(totalJobs / limitNumber),
            jobs,
        });
    } catch(err) {
        console.error("Error fetching jobs:", err)
        return res.status(500).json({
            message: "Error fetching jobs",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

router.get('/:jobId', async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const userId = req.user?.userId;
    try {
        const job = await prisma.job.findUnique({
            where: {
                id: jobId
            },
            include: {
                company: {
                    select: {
                        name: true,
                        logoUrl: true
                    }
                },
                recruiter: {
                    select: {
                        user: {
                            select: {
                                name: true
                            }
                        },
                        positionTitle: true
                    }
                }
            }
        })

        if (!job) {
            return res.status(404).json({
                message: "Job not found",
            });
        }

        let isApplied = false;
        let isHidden = false

        if(userId){
            const [applied, hidden] = await Promise.all([
                prisma.application.findFirst({
                    where: {
                        jobId: job.id,
                        applicantId: userId
                    }
                }),
                prisma.hiddenJob.findFirst({
                    where: {
                        jobId: job.id,
                        applicantId: userId
                    }
                })
            ])

            isApplied: !!applied
            isHidden: !!hidden
        }


        res.status(200).json({
            message: "Job fetched successfully",
            job,
            meta: {
                isApplied,
                isHidden
            }
        })
    } catch(err) {
        console.error("Error fetching the job: ", err)
        return res.status(500).json({
            message: "Error fetching the job",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

const jobApplicationBody = zod.object({
    resume: zod.string().optional(),
    coverLetter: zod.string().optional(),
    portfolioUrl: zod.url().optional()
})
router.post('/:jobId/apply', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const applicantId = req.user?.userId;

    if(!applicantId){
        return res.status(401).json({message: "Unauthorized"})
    }

    const response = jobApplicationBody.safeParse(req.body);
    if(!response.success){
        return res.status(400).json({
            message: "Invalid input"
        })
    }

    const applicationData = response.data;

    try {
        const applicant = await prisma.applicant.findUnique({
            where: {
                id: applicantId
            }
        })

        if(!applicantId){
            return res.status(404).json({ message: "Applicant profile not found" })
        }

        const job = await prisma.job.findUnique({
            where: {
                id: jobId
            }
        })

        if(!job){
            return res.status(404).json({ message: "Job not found" })
        }

        const existing = await prisma.application.findUnique({
            where: {
                applicantId_jobId: {
                    applicantId: applicantId,
                    jobId
                }
            }
        })

        if(existing){
            return res.status(409).json({ message: "You have already applied to this job" })
        }

        const application = await prisma.application.create({
            data: {
                applicantId: applicantId,
                jobId,
                ...applicationData
            }
        })

        return res.status(201).json({
            message: "Application submitted successfully",
            application
        })
    } catch(err) {
        console.error("Error applying for the job: ", err)
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

export default router;