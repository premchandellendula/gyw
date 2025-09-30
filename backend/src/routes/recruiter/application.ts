import express, { Request, Response } from 'express';
import roleMiddleware from '../../middleware/roleMiddleware';
const router = express.Router();
import zod from 'zod';
import { PrismaClient } from '@prisma/client';
import { Documentation, Methods, SchemaObject } from '../../docs/documentation';
import logger from '../../utils/logger';
const prisma = new PrismaClient();

// ------ Recruiter ------
class GetApplicationForMyJobsResponse {
    static schema: SchemaObject = {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "Application fetched successfully",
            },
            application: {
                type: "object",
                properties: {
                    id: { type: "string", example: "application-123" },
                    status: { type: "string", example: "PENDING" },
                    createdAt: { type: "string", format: "date-time", example: "2025-09-27T10:00:00Z" },
                    applicant: {
                        type: "object",
                        properties: {
                            id: { type: "string", example: "applicant-456" },
                            resumeUrl: { type: "string", example: "https://example.com/resume.pdf" },
                            location: { type: "string", example: "San Francisco, CA" },
                            yearsOfExperience: { type: "number", example: 3 },
                            skills: {
                                type: "array",
                                items: { type: "string" },
                                example: ["JavaScript", "Node.js", "React"]
                            },
                            isWillingToRelocate: { type: "boolean", example: true },
                            user: {
                                type: "object",
                                properties: {
                                name: { type: "string", example: "John Doe" },
                                email: { type: "string", format: "email", example: "johndoe@gmail.com" }
                                }
                            }
                        }
                    },
                    job: {
                        type: "object",
                        properties: {
                            id: { type: "string", example: "job-789" },
                            title: { type: "string", example: "Frontend Developer" },
                            company: {
                                type: "object",
                                properties: {
                                    name: { type: "string", example: "Acme Corp" },
                                    logoUrl: { type: "string", example: "https://example.com/logo.png" }
                                }
                            },
                            recruiter: {
                                type: "object",
                                properties: {
                                    user: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string", example: "Recruiter Jane" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            }
        }
    }
}

Documentation.addSchema()(GetApplicationForMyJobsResponse)

Documentation.addRoute({
    path: "/applications/:id",
    method: Methods.get,
    tags: ["Application - Recruiter"],
    summary: "Get Application for the jobs created by a recruiter",
    parameters: [
        {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", example: "application-id-123" },
        }
    ],
    responses: {
        "200": {
            description: "Application fetched successfully",
            value: GetApplicationForMyJobsResponse.schema,
        },
        "401": {
            description: "Unauthorized (no recruiter ID)",
            value: { type: "object", properties: { message: { type: "string", example: "Unauthorized" }, error: { type: "string", example: "Missing user ID in request" } } },
        },
        "403": {
            description: "Forbidden: recruiter not allowed to access this application",
            value: { type: "object", properties: { message: { type: "string", example: "Application not found" }, error: { type: "string", example: "Forbidden: You can only view applications for your own jobs."} } },
        },
        "404": {
            description: "Application not found",
            value: { type: "object", properties: { message: { type: "string", example: "Application not found" }, error: { type: "string", example: "Application not found" } } },
        },
        "500": {
            description: "Server error",
            value: { type: "object", properties: { message: { type: "string", example: "Error fetching application for a job created by you." }, error: { type: "string", example: "Internal server error" } } },
        },
    },
})();

router.get('/:id', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const { id } = req.params;
    const recruiterId = req.user?.userId;
    logger.info(`GET /:id - Fetching aplication for applicationId: ${id}, IP: ${req.ip}`);

    if(!recruiterId){
        logger.warn(`Unauthorized access attempt - Missing recruiterId. IP: ${req.ip}`);
        return res.status(401).json({ message: "Unauthorized" })
    }

    try {
        logger.debug(`DB Query - Fetching application with applicationId: ${id}`);
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
            logger.warn(`Application not found with applicationId: ${id}`);
            return res.status(404).json({ message: "Application not found" });
        }

        if (application.job.recruiterId !== recruiterId) {
            logger.warn(`Forbidden: You cannot view applications created by other recruiters`);
            return res.status(403).json({ message: "Forbidden: You can only view applications for your own jobs." });
        }
        logger.debug(`DB Result - ${application} application fetched for applicationId: ${id}`);

        logger.info(`Application details fetched successfully for applicationId: ${id}`);
        return res.status(200).json({
            message: "Application fetched successfully",
            application
        })
    } catch(err) {
        logger.error(`Error fetching application for applicationID: ${id} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
        logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);

        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

const applicationPatchBody = zod.object({
    status: zod.enum(["PENDING", "REVIEWED", "ACCEPTED", "REJECTED", "WITHDRAWN"])
})

class UpdateApplicationStatusRequest {
    static schema: SchemaObject = {
        type: "object",
        required: ["status"],
        properties: {
            status: {
                type: "string",
                enum: ["PENDING", "REVIEWED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
                example: "REVIEWED"
            }
        }
    };
}

class UpdateApplicationStatusResponse {
    static schema: SchemaObject = {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "Application status updated successfully"
            },
            application: {
                type: "object",
                properties: {
                    id: { type: "string", example: "application-id-123" },
                    status: {
                        type: "string",
                        enum: ["PENDING", "REVIEWED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
                        example: "REVIEWED"
                    },
                    job: {
                        type: "object",
                        properties: {
                            id: { type: "string", example: "job-id-456" },
                            title: { type: "string", example: "Frontend Developer" }
                        }
                    },
                    applicant: {
                        type: "object",
                        properties: {
                            id: { type: "string", example: "applicant-id-789" },
                            name: { type: "string", example: "Jane Doe" }
                        }
                    }
                }
            }
        }
    };
}

Documentation.addSchema()(UpdateApplicationStatusRequest)
Documentation.addSchema()(UpdateApplicationStatusResponse)

Documentation.addRoute({
    path: "/application/:id/status",
    method: Methods.patch,
    tags: ["Application - Recruiter"],
    summary: "Update application status by recruiter",
    parameters: [
        {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", example: "application-id-123" }
        }
    ],
    requestBody: UpdateApplicationStatusRequest.schema,
    requestBodyDescription: "Payload to update the application status",
    responses: {
        "200": {
            description: "Application status updated successfully",
            value: UpdateApplicationStatusResponse.schema
        },
        "400": {
            description: "Invalid input",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Invalid input" }
                }
            }
        },
        "401": {
            description: "Unauthorized",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Unauthorized" }
                }
            }
        },
        "403": {
            description: "Forbidden: Recruiter cannot access this application",
            value: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        example: "Forbidden: You can only update applications for your own jobs."
                    }
                }
            }
        },
        "404": {
            description: "Application not found",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Application not found" }
                }
            }
        },
        "500": {
            description: "Internal server error",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Internal server error" },
                    error: { type: "string", example: "Prisma query failed" }
                }
            }
        }
    }
})();

router.patch('/:id/status', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const { id } = req.params;
    const recruiterId = req.user?.userId;
    logger.info(`PATCH /:id/status - Updating aplication status for applicationId: ${id}, IP: ${req.ip}`);

    if(!recruiterId){
        logger.warn(`Unauthorized access attempt - Missing recruiterId. IP: ${req.ip}`);
        return res.status(401).json({ message: "Unauthorized" })
    }

    const response = applicationPatchBody.safeParse(req.body);
    if(!response.success){
        logger.warn(`Validation failed for application status update: ${JSON.stringify(req.body)}`);
        return res.status(400).json({
            message: "Invalid input"
        })
    }

    const {status} = response.data

    try {
        logger.debug(`DB Query - Checking for application with applicationId: ${id}`);
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
            logger.warn(`Application not found with applicationId: ${id}`);
            return res.status(404).json({ message: "Application not found" })
        }

        if(application.job.recruiterId !== recruiterId){
            logger.warn(`Forbidden: You cannot update applications created by other recruiters`);
            return res.status(403).json({ message: "Forbidden: You can only update applications for your own jobs." });
        }
        logger.debug(`DB Query - Updating application status for applicationId: ${id}, with status ${status}`);

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

        logger.debug(`DB Result - status updated for applicationId: ${id}`);

        logger.info(`Application status updated successfully for applicationId: ${id}`);

        return res.status(200).json({
            message: "Application status updated successfully",
            application: updatedApplication
        })
    } catch(err) {
        logger.error(`Error updating the application status of applicationId: ${id} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
        logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);

        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

Documentation.addRoute({
    path: "/applications/:id/resume",
    method: Methods.get,
    tags: ["Application - Recruiter"],
    summary: "Redirect to the applicant's resume URL for download/view",
    parameters: [
        {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", example: "application-id-123" },
            description: "The ID of the application",
        }
    ],
    responses: {
        "302": {
            description: "Redirect to resume URL",
            value: {}
        },
        "401": {
            description: "Unauthorized",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Unauthorized" }
                }
            }
        },
        "403": {
            description: "Forbidden",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Forbidden" }
                }
            }
        },
        "404": {
            description: "Not Found",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Resume not found for this applicant." }
                }
            }
        },
        "500": {
            description: "Internal server error",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Internal server error" },
                    error: { type: "string", example: "Something went wrong while fetching resume" }
                }
            }
        }
    }
})();

router.get('/:id/resume', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const { id } = req.params;
    const recruiterId = req.user?.userId;
    logger.info(`GET /:id/resume - RecruiterId: ${recruiterId}, ApplicationId: ${id}, IP: ${req.ip}`);

    if (!recruiterId) {
        logger.warn(`Unauthorized access attempt - Missing recruiterId. IP: ${req.ip}`);
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        logger.debug(`DB Query - Fetching application with ID: ${id}`);
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
            logger.warn(`Application not found - applicationId: ${id}`);
            return res.status(404).json({ message: "Application not found" });
        }

        if (application.job.recruiterId !== recruiterId) {
            logger.warn(`Forbidden access - RecruiterId ${recruiterId} tried to access resume for applicationId ${id}`);
            return res.status(403).json({ message: "Forbidden" });
        }

        const resumeUrl = application.applicant.resumeUrl;

        if (!resumeUrl) {
            logger.warn(`Resume not found - ApplicationId: ${id}`);
            return res.status(404).json({ message: "Resume not found for this applicant." });
        }

        logger.info(`Redirecting to resume URL for applicationId: ${id}`);
        return res.redirect(resumeUrl);

    } catch (err) {
        logger.error(`Error fetching resume for applicationId: ${id} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
        logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
});

export default router;