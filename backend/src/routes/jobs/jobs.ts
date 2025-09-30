import { Request, Response, Router } from "express";
const router = Router();
import zod from 'zod';
import roleMiddleware from "../../middleware/roleMiddleware";
import { PrismaClient } from '@prisma/client';
import { DepartmentEnum, JobRolEnum } from "../../types/types";
import { Documentation, Methods, SchemaObject } from "../../docs/documentation";
import logger from "../../utils/logger";
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

class CreateJobRequestSchema {
  static schema: SchemaObject = {
      type: "object",
      required: [
          "companyId", "title", "description", "skills", "location", "role", "department",
          "ctcType", "minCTC", "maxCTC", "currency", "minExperience", "maxExperience",
          "employmentType", "jobType", "openings", "noticePeriod", "applicationDeadline"
      ],
      properties: {
          companyId: { type: "string", format: "uuid", example: "abc123-def456-ghi789" },
          title: { type: "string", example: "Frontend Developer" },
          description: { type: "string", example: "Build and maintain UIs" },
          skills: {
              type: "array",
              items: { type: "string" },
              example: ["React", "TypeScript"]
          },
          location: { type: "string", example: "Bangalore, India" },
          role: {
              type: "string",
              enum: ["FRONTEND_DEVELOPER", "BACKEND_DEVELOPER", "FULLSTACK_DEVELOPER"],
              example: "FRONTEND_DEVELOPER"
          },
          department: {
              type: "string",
              enum: ["ENGINEERING", "PRODUCT", "DESIGN"],
              example: "ENGINEERING"
          },
          ctcType: {
              type: "string",
              enum: ["RANGE", "COMPETITIVE", "UNDISCLOSED"],
              example: "RANGE"
          },
          minCTC: { type: "number", example: 500000 },
          maxCTC: { type: "number", example: 800000 },
          currency: { type: "string", enum: ["INR", "USD", "EUR"], example: "INR" },
          minExperience: { type: "number", example: 1 },
          maxExperience: { type: "number", example: 3 },
          employmentType: {
              type: "string",
              enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"],
              example: "FULL_TIME"
          },
          jobType: {
              type: "string",
              enum: ["ONSITE", "REMOTE", "HYBRID"],
              example: "ONSITE"
          },
          openings: { type: "number", example: 5 },
          relocationAssistance: { type: "boolean", example: false },
          visaSponsorship: { type: "boolean", example: false },
          noticePeriod: {
              type: "string",
              enum: ["IMMEDIATE", "WITHIN_15_DAYS", "WITHIN_30_DAYS", "FLEXIBLE"],
              example: "IMMEDIATE"
          },
          durationInMonths: { type: "number", nullable: true, example: 6 },
          benefits: {
              type: "array",
              items: { type: "string" },
              example: ["Health insurance", "Flexible hours"]
          },
          applicationDeadline: {
              type: "string",
              format: "date-time",
              example: "2025-12-31T23:59:59Z"
          }
      }
  }
};

class CreateJobResponseSchema {
  static schema: SchemaObject = {
    type: "object",
    properties: {
        message: {
            type: "string",
            example: "Job created successfully"
        },
        job: {
            type: "object",
            example: {
                id: "job-id-uuid",
                companyId: "company-id-uuid",
                title: "Frontend Developer",
                recruiterId: "recruiter-id",
                // ... more job fields
            }
        }
    }
  }
};

Documentation.addSchema()(CreateJobRequestSchema);
Documentation.addSchema()(CreateJobResponseSchema);

Documentation.addRoute({
    path: "/jobs",
    method: Methods.post,
    tags: ["Jobs - Recruiter"],
    summary: "Create a new job post",
    requestBody: CreateJobRequestSchema.schema,
    requestBodyDescription: "Job details to be created",
    responses: {
        "201": {
            description: "Job created successfully",
            value: CreateJobResponseSchema.schema
        },
        "400": {
            description: "Validation error",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Incorrect inputs" }
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
        "500": {
            description: "Server error",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Error creating a job" },
                    error: { type: "string", example: "Internal server error" }
                }
            }
        }
    }
})();

router.post('', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const recruiterId = req.user?.userId;
    logger.info(`POST / - Creating job - RecruiterId: ${recruiterId}, IP: ${req.ip}`);

    if (!recruiterId) {
      logger.warn(`Unauthorized access attempt to create job - Missing recruiterId. IP: ${req.ip}`);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const response = jobPostBody.safeParse(req.body);

    if(!response.success){
      logger.warn(`Validation failed for job creation - RecruiterId: ${recruiterId}, Body: ${JSON.stringify(req.body)}`);
      return res.status(400).json({
        message: "Incorrect inputs"
      })
    }

    const jobData = response.data;

    try {
      logger.debug(`DB Query - Creating job for RecruiterId: ${recruiterId}`);
      const job = await prisma.job.create({
          data: {
              ...jobData, 
              recruiterId: recruiterId
          }
      })

      logger.info(`Job created successfully - JobId: ${job.id}, RecruiterId: ${recruiterId}`);

      res.status(201).json({
          message: "Job created successfully",
          job
      })
    } catch(err) {
      logger.error(`Error creating job - RecruiterId: ${recruiterId}, IP: ${req.ip}, Message: ${err instanceof Error ? err.message : "Unknown error"}`);
      logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
      return res.status(500).json({
        message: "Error creating a job",
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
})


class GetMyJobsResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
        message: {
            type: "string",
            example: "Jobs by recruiter fetched successfully"
        },
        jobs: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string", example: "job-id-uuid" },
                    title: { type: "string", example: "Backend Developer" },
                    description: { type: "string", example: "Job description here" },
                    location: { type: "string", example: "Remote" },
                    recruiterId: { type: "string", example: "recruiter-id-uuid" },
                    companyId: { type: "string", example: "company-id-uuid" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },

                    company: {
                        type: "object",
                        properties: {
                            id: { type: "string", example: "company-id-uuid" },
                            name: { type: "string", example: "ABC Corp" },
                            logoUrl: { type: "string", example: "https://abc.com/logo.png" },
                            website: { type: "string", example: "https://abc.com" },
                        }
                    },

                    recruiter: {
                        type: "object",
                        properties: {
                            id: { type: "string", example: "recruiter-id-uuid" },
                            name: { type: "string", example: "John Doe" },
                            email: { type: "string", format: "email", example: "john@example.com" }
                        }
                    },

                    applications: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", example: "application-id" },
                                status: { type: "string", example: "PENDING" },
                                createdAt: { type: "string", format: "date-time" },
                                applicant: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string", example: "applicant-id" },
                                        name: { type: "string", example: "Jane Smith" },
                                        email: { type: "string", format: "email", example: "jane@example.com" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
  };
}

Documentation.addSchema()(GetMyJobsResponse);

Documentation.addRoute({
    path: "/jobs/me",
    method: Methods.get,
    tags: ["Jobs - Recruiter"],
    summary: "Get jobs posted by the current recruiter",
    responses: {
        "200": {
            description: "Jobs fetched successfully",
            value: GetMyJobsResponse.schema
        },
        "401": {
            description: "Unauthorized access",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Unauthorized" }
                }
            }
        },
        "500": {
            description: "Internal server error",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Error fetching jobs by a recruiter" },
                    error: { type: "string", example: "Database connection failed" }
                }
            }
        }
    }
})();

router.get('/me', roleMiddleware("RECRUITER") , async (req: Request, res: Response) => {
    const recruiterId = req.user?.userId;
    logger.info(`GET /me - Fetching jobs for recruiterId: ${recruiterId}, IP: ${req.ip}`);

    if (!recruiterId) {
      logger.warn(`Unauthorized access attempt to /me - Missing recruiterId. IP: ${req.ip}`);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      logger.debug(`DB Query - Fetching jobs for recruiterId: ${recruiterId}`);
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

      logger.info(`Jobs fetched successfully - Total: ${jobs.length}, RecruiterId: ${recruiterId}`);

      return res.status(200).json({
        message: "Jobs by recruiter fetched successfully",
        jobs
      });
    } catch(err) {
      logger.error(`Error fetching jobs for recruiterId: ${recruiterId}, IP: ${req.ip}, Message: ${err instanceof Error ? err.message : 'Unknown error'}`);
      logger.debug(`Stack trace: ${err instanceof Error ? err.stack : 'No stack trace'}`);
      return res.status(500).json({
        message: "Error fetching jobs by a recruiter",
        error: err instanceof Error ? err.message : "Unknown error"
      })
    }
})


const jobPatchBody = zod.object({
    companyId: zod.string().uuid().optional(),
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
    applicationDeadline: zod.coerce.date()
        .refine(date => date > new Date(), { message: "Deadline must be in the future" })
        .optional()
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

class UpdateJobRequest {
  static schema: SchemaObject = {
    type: "object",
    properties: {
        companyId: { type: "string", format: "uuid", example: "company-id-uuid" },
        title: { type: "string", example: "Senior Backend Engineer" },
        description: { type: "string", example: "Updated job description" },
        skills: {
            type: "array",
            items: { type: "string" },
            example: ["Node.js", "PostgreSQL"]
        },
        location: { type: "string", example: "Remote" },
        ctcType: {
            type: "string",
            enum: ["RANGE", "COMPETITIVE", "UNDISCLOSED"],
            example: "RANGE"
        },
        minCTC: { type: "number", example: 500000 },
        maxCTC: { type: "number", example: 1000000 },
        currency: {
            type: "string",
            enum: ["INR", "USD", "EUR"],
            example: "INR"
        },
        minExperience: { type: "number", example: 2 },
        maxExperience: { type: "number", example: 5 },
        employmentType: {
            type: "string",
            enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"],
            example: "FULL_TIME"
        },
        jobType: {
            type: "string",
            enum: ["ONSITE", "REMOTE", "HYBRID"],
            example: "REMOTE"
        },
        openings: { type: "number", example: 3 },
        relocationAssistance: { type: "boolean", example: false },
        visaSponsorship: { type: "boolean", example: false },
        noticePeriod: {
            type: "string",
            enum: ["IMMEDIATE", "WITHIN_15_DAYS", "WITHIN_30_DAYS", "FLEXIBLE"],
            example: "WITHIN_30_DAYS"
        },
        durationInMonths: { type: "number", example: 6, nullable: true },
        benefits: {
            type: "array",
            items: { type: "string" },
            example: ["Health insurance", "Remote work"]
        },
        applicationDeadline: {
            type: "string",
            format: "date-time",
            example: "2025-12-31T23:59:59Z"
        }
    }
  };
}

Documentation.addSchema()(UpdateJobRequest);

Documentation.addRoute({
    path: "/jobs/:jobId",
    method: Methods.patch,
    tags: ["Jobs - Recruiter"],
    summary: "Update job by ID (recruiter only)",
    requestBody: UpdateJobRequest.schema,
    requestBodyDescription: "Fields to update in the job post (all optional)",
    responses: {
        "200": {
            description: "Job updated successfully",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Job updated successfully" },
                    job: { type: "object", example: { id: "job-id-uuid", title: "Updated title" } }
                }
            }
        },
        "400": {
            description: "Validation error",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Incorrect inputs" }
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
            description: "Forbidden",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Forbidden: You can't edit this job" }
                }
            }
        },
        "404": {
            description: "Job not found",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Job not found" }
                }
            }
        },
        "500": {
            description: "Internal server error",
            value: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Error updating the job" },
                    error: { type: "string", example: "Database connection lost" }
                }
            }
        }
    }
})();

router.patch('/:jobId', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
  const recruiterId = req.user?.userId;
  const { jobId } = req.params;

  logger.info(`PATCH /${jobId} - Update job request by recruiterId: ${recruiterId}, IP: ${req.ip}`);

  if (!recruiterId) {
    logger.warn(`Unauthorized access attempt to update job ${jobId} - Missing recruiterId. IP: ${req.ip}`);
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const response = jobPatchBody.safeParse(req.body);
  if(!response.success){
    logger.warn(`Validation failed for job update on jobId: ${jobId} - RecruiterId: ${recruiterId}, Body: ${JSON.stringify(req.body)}`);
    return res.status(400).json({
      message: "Incorrect inputs"
    })
  }

    const jobData = response.data;

    try {
      logger.debug(`DB Query - Finding job with id: ${jobId}`);

      const job = await prisma.job.findUnique({
          where: { id: jobId }
      });

      if (!job) {
        logger.warn(`Job not found with id: ${jobId} - RecruiterId: ${recruiterId}`);
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.recruiterId !== recruiterId) {
        logger.warn(`Forbidden update attempt on jobId: ${jobId} by recruiterId: ${recruiterId}`);
        return res.status(403).json({ message: "Forbidden: You can't edit this job" });
      }

      logger.debug(`DB Query - Updating job with id: ${jobId}`);

      const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: jobData
      });

      logger.info(`Job updated successfully - JobId: ${jobId}, RecruiterId: ${recruiterId}`);

      return res.status(200).json({
        message: "Job updated successfully",
        job: updatedJob
      });
    } catch(err) {
      logger.error(`Error updating job ${jobId} by recruiterId ${recruiterId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
      logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
      return res.status(500).json({
          message: "Error updating the job",
          error: err instanceof Error ? err.message : "Unknown error"
      })
    }
})


class DeleteJobResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "Job deleted successfully",
      },
      job: {
        type: "object",
        properties: {
          id: { type: "string", example: "job-id-uuid" },
          title: { type: "string", example: "Backend Developer" },
        },
      },
    },
  };
}

Documentation.addSchema()(DeleteJobResponse);

Documentation.addRoute({
  path: "/jobs/:jobId",
  method: Methods.delete,
  tags: ["Jobs - Recruiter"],
  summary: "Delete a job by ID",
  parameters: [
    {
      name: "jobId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "ID of the job to delete",
    },
  ],
  responses: {
    "200": {
      description: "Job deleted successfully",
      value: DeleteJobResponse.schema,
    },
    "401": {
      description: "Unauthorized",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Unauthorized" },
        },
      },
    },
    "403": {
      description: "Forbidden",
      value: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "Forbidden: You can't delete this job",
          },
        },
      },
    },
    "404": {
      description: "Job not found",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Job not found" },
        },
      },
    },
    "500": {
      description: "Server error",
      value: { type: "object", properties: { message: { type: "string", example: "Error deleting a job created by you." }, error: { type: "string", example: "Internal server error" } } },
    },
  },
})();

router.delete('/:jobId', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
    const recruiterId = req.user?.userId;
    const { jobId } = req.params;

    logger.info(`DELETE /${jobId} - Delete job request by recruiterId: ${recruiterId}, IP: ${req.ip}`);

    if (!recruiterId) {
      logger.warn(`Unauthorized access attempt to delete job ${jobId} - Missing recruiterId. IP: ${req.ip}`);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      logger.debug(`DB Query - Finding job with id: ${jobId}`);
      const job = await prisma.job.findUnique({
          where: {
              id: jobId
          }
      })

      if(!job){
        logger.warn(`Job not found with id: ${jobId} - RecruiterId: ${recruiterId}`);
        return res.status(404).json({
          message: "Job not found"
        })
      }

      if (job.recruiterId !== recruiterId) {
        logger.warn(`Forbidden delete attempt on jobId: ${jobId} by recruiterId: ${recruiterId}`);
        return res.status(403).json({ message: "Forbidden: You can't delete this job" });
      }

      logger.debug(`DB Query - Deleting job with id: ${jobId}`);
      const deletedJob = await prisma.job.delete({
        where: {
          id: jobId
        }
      })

      logger.info(`Job deleted successfully - JobId: ${jobId}, RecruiterId: ${recruiterId}`);
      res.status(200).json({
        message: "Job deleted successfully",
        job: { id: deletedJob.id, title: deletedJob.title }
      })
    } catch(err) {
      logger.error(`Error deleting job ${jobId} by recruiterId ${recruiterId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
      logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
      return res.status(500).json({
        message: "Error deleting the job",
        error: err instanceof Error ? err.message : "Unknown error"
      })
    }
})


class JobDashboardResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: { type: "string", example: "Job dashboard fetched successfully" },
      job: {
        type: "object",
        properties: {
          id: { type: "string", example: "job-id-uuid" },
          title: { type: "string", example: "Backend Developer" },
          description: { type: "string", example: "Job description here" },
          createdAt: { type: "string", format: "date-time" },
          company: {
            type: "object",
            properties: {
              id: { type: "string", example: "company-id-uuid" },
              name: { type: "string", example: "ABC Corp" },
              logoUrl: { type: "string", example: "https://abc.com/logo.png" },
              website: { type: "string", example: "https://abc.com" },
            },
          },
          recruiterId: { type: "string", example: "recruiter-id-uuid" },
        },
      },
      stats: {
        type: "object",
        example: {
          APPLIED: 10,
          INTERVIEWING: 5,
          REJECTED: 2,
          HIRED: 1,
        },
      },
      applications: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", example: "application-id-uuid" },
            createdAt: { type: "string", format: "date-time" },
            applicant: {
              type: "object",
              properties: {
                id: { type: "string", example: "applicant-id-uuid" },
                resumeUrl: { type: "string", example: "https://resume.link/resume.pdf" },
                user: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "Jane Doe" },
                    email: { type: "string", format: "email", example: "jane@example.com" },
                  },
                },
              },
            },
          },
        },
      },
      pagination: {
        type: "object",
        properties: {
          page: { type: "number", example: 1 },
          limit: { type: "number", example: 10 },
          total: { type: "number", example: 50 },
          totalPages: { type: "number", example: 5 },
        },
      },
    },
    required: ["message", "job", "stats", "applications", "pagination"],
  };
}

Documentation.addRoute({
  path: "/jobs/:jobId/dashboard",
  method: Methods.get,
  tags: ["Jobs - Recruiter"],
  summary: "Get dashboard data for a job by ID",
  parameters: [
    {
      name: "jobId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "ID of the job",
    },
    {
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer"},
      description: "Page number for applications pagination",
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer"},
      description: "Number of applications per page",
    },
  ],
  responses: {
    "200": {
      description: "Job dashboard fetched successfully",
      value: JobDashboardResponse.schema,
    },
    "401": {
      description: "Unauthorized",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Unauthorized" },
        },
      },
    },
    "403": {
      description: "Forbidden",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Forbidden: You can only view your own jobs." },
        },
      },
    },
    "404": {
      description: "Job not found",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Job not found" },
        },
      },
    },
    "500": {
      description: "Server error",
      value: { type: "object", properties: { message: { type: "string", example: "Error fetching dashboard for a job created by you." }, error: { type: "string", example: "Internal server error" } } },
    },
  },
})();

router.get('/:jobId/dashboard', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
  const recruiterId = req.user?.userId;
  const { jobId } = req.params;
  logger.info(`GET /${jobId}/dashboard - Fetch job dashboard request by recruiterId: ${recruiterId}, IP: ${req.ip}`);
  if(!recruiterId){
    logger.warn(`Unauthorized access attempt to job dashboard for jobId: ${jobId} - Missing recruiterId. IP: ${req.ip}`);
    return res.status(401).json({ message: "Unauthorized" })
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  try {
    logger.debug(`DB Query - Fetch job with id: ${jobId}`);
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
            id: true,
            title: true,
            description: true,
            createdAt: true,
            company: true,
            recruiterId: true,
        }
    });

    if (!job) {
      logger.warn(`Job not found with id: ${jobId} for recruiterId: ${recruiterId}`);
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.recruiterId !== recruiterId) {
      logger.warn(`Forbidden dashboard access attempt on jobId: ${jobId} by recruiterId: ${recruiterId}`);
      return res.status(403).json({ message: "Forbidden: You can only view your own jobs." });
    }

    logger.debug(`DB Query - Grouping application stats for jobId: ${jobId}`);
    const applicationStats = await prisma.application.groupBy({
      by: ['status'],
      where: { jobId },
      _count: {
          status: true
      }
    });

    const stats = applicationStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    logger.debug(`DB Query - Fetch paginated applications for jobId: ${jobId}`);
    const applications = await prisma.application.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
          applicant: {
              select: {
                  id: true,
                  user: {
                      select: {
                          name: true,
                          email: true
                      }
                  },
                  resumeUrl: true,
              }
          }
      }
    });
    const totalApplications = await prisma.application.count({ where: { jobId } });

    logger.info(`Job dashboard fetched successfully for jobId: ${jobId} by recruiterId: ${recruiterId}`);

    return res.status(200).json({
        message: "Job dashboard fetched successfully",
        job,
        stats,
        applications,
        pagination: {
            page,
            limit,
            total: totalApplications,
            totalPages: Math.ceil(totalApplications / limit),
        }
    });
  } catch(err) {
    logger.error(`Error fetching job dashboard for jobId: ${jobId} by recruiterId: ${recruiterId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
    logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);

    return res.status(500).json({
          message: "Internal server error",
          error: err instanceof Error ? err.message : "Unknown error"
    })
  }
})


class JobApplicationsResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: { type: "string", example: "Job applications fetched successfully" },
      job: {
        type: "object",
        properties: {
          id: { type: "string", example: "job-id-uuid" },
          title: { type: "string", example: "Backend Developer" },
          description: { type: "string", example: "Job description here" },
          createdAt: { type: "string", format: "date-time" },
          company: {
            type: "object",
            properties: {
              id: { type: "string", example: "company-id-uuid" },
              name: { type: "string", example: "ABC Corp" },
              logoUrl: { type: "string", example: "https://abc.com/logo.png" },
              website: { type: "string", example: "https://abc.com" },
            },
          },
          recruiterId: { type: "string", example: "recruiter-id-uuid" },
        },
      },
      applications: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", example: "application-id-uuid" },
            createdAt: { type: "string", format: "date-time" },
            applicant: {
              type: "object",
              properties: {
                id: { type: "string", example: "applicant-id-uuid" },
                resumeUrl: { type: "string", example: "https://resume.link/resume.pdf" },
                user: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "Jane Doe" },
                    email: { type: "string", format: "email", example: "jane@example.com" },
                  },
                },
              },
            },
          },
        },
      },
      pagination: {
        type: "object",
        properties: {
          page: { type: "number", example: 1 },
          limit: { type: "number", example: 10 },
          total: { type: "number", example: 50 },
          totalPages: { type: "number", example: 5 },
        },
      },
    },
    required: ["message", "job", "applications", "pagination"],
  };
}

Documentation.addRoute({
  path: "/jobs/:jobId/applications",
  method: Methods.get,
  tags: ["Jobs - Recruiter"],
  summary: "Get applications for a job by ID",
  parameters: [
    {
      name: "jobId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "ID of the job",
    },
    {
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer"},
      description: "Page number for pagination",
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer"},
      description: "Number of applications per page",
    },
  ],
  responses: {
    "200": {
      description: "Job applications fetched successfully",
      value: JobApplicationsResponse.schema,
    },
    "401": {
      description: "Unauthorized",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Unauthorized" },
        },
      },
    },
    "403": {
      description: "Forbidden",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Forbidden: You can only view your own jobs." },
        },
      },
    },
    "404": {
      description: "Job not found",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Job not found" },
        },
      },
    },
    "500": {
      description: "Server error",
      value: { type: "object", properties: { message: { type: "string", example: "Error fetching applications for a job created by you." }, error: { type: "string", example: "Internal server error" } } },
    },
  },
})();


router.get('/:jobId/applications', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const recruiterId = req.user?.userId;
  logger.info(`GET /${jobId}/applications - Fetch job applications request by recruiterId: ${recruiterId}, IP: ${req.ip}`);
  if(!recruiterId){
    logger.warn(`Unauthorized access attempt to job applications for jobId: ${jobId} - Missing recruiterId. IP: ${req.ip}`);
    return res.status(401).json({ message: "Unauthorized" })
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    logger.debug(`DB Query - Fetch job with id: ${jobId}`);
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
            id: true,
            title: true,
            description: true,
            createdAt: true,
            company: true,
            recruiterId: true,
        }
    });

    if (!job) {
      logger.warn(`Job not found with id: ${jobId} for recruiterId: ${recruiterId}`);
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.recruiterId !== recruiterId) {
      logger.warn(`Forbidden job applications access attempt on jobId: ${jobId} by recruiterId: ${recruiterId}`);
      return res.status(403).json({ message: "Forbidden: You can only view your own jobs." });
    }

    logger.debug(`DB Query - Fetch paginated applications for jobId: ${jobId}`);
    const applications = await prisma.application.findMany({
        where: { jobId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
            applicant: {
                select: {
                    id: true,
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    resumeUrl: true,
                }
            }
        }
    });
    const totalApplications = await prisma.application.count({ where: { jobId } });
    logger.info(`Job applications fetched successfully for jobId: ${jobId} by recruiterId: ${recruiterId}`);

    return res.status(200).json({
        message: "Job applications fetched successfully",
        job,
        applications,
        pagination: {
            page,
            limit,
            total: totalApplications,
            totalPages: Math.ceil(totalApplications / limit),
        }
    });
  } catch(err) {
    logger.error(`Error fetching applications for jobId: ${jobId} by recruiterId: ${recruiterId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
    logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
    return res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error"
    })
  }
})

// ─────────────────────────────
//     APPLICANT JOB ROUTES
// ─────────────────────────────


class JobListResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      page: { type: "number", example: 1 },
      count: { type: "number", example: 25 },
      totalJobs: { type: "number", example: 123 },
      totalPages: { type: "number", example: 5 },
      jobs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", example: "job-id-uuid" },
            title: { type: "string", example: "Backend Developer" },
            description: { type: "string", example: "Job description here" },
            location: { type: "string", example: "Remote" },
            role: { type: "string", example: "Developer" },
            skills: {
              type: "array",
              items: { type: "string" },
              example: ["Node.js", "TypeScript"]
            },
            jobType: { type: "string", example: "Full-time" },
            workMode: { type: "string", example: "Remote" },
            department: { type: "string", example: "Engineering" },
            salaryMin: { type: "number", example: 50000 },
            salaryMax: { type: "number", example: 100000 },
            companyType: { type: "string", example: "Startup" },
            createdAt: { type: "string", format: "date-time", example: "2023-01-01T12:00:00Z" },
            company: {
              type: "object",
              properties: {
                id: { type: "string", example: "company-id-uuid" },
                name: { type: "string", example: "ABC Corp" },
                logoUrl: { type: "string", example: "https://abc.com/logo.png" }
              }
            },
            recruiter: {
              type: "object",
              properties: {
                id: { type: "string", example: "recruiter-id-uuid" },
                positionTitle: { type: "string", example: "Senior Recruiter" },
                user: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "John Doe" }
                  }
                }
              }
            }
          }
        }
      }
    },
    required: ["page", "count", "totalJobs", "totalPages", "jobs"],
  }
}

Documentation.addRoute({
  path: "/jobs",
  method: Methods.get,
  tags: ["Jobs - Applicant"],
  summary: "Fetch paginated list of jobs with filters",
  parameters: [
    { name: "page", in: "query", required: false, schema: { type: "string", example: "1" }, description: "Page number" },
    { name: "limit", in: "query", required: false, schema: { type: "string", example: "25" }, description: "Number of jobs per page" },
    { name: "roles", in: "query", required: false, schema: { type: "string" }, description: "Comma-separated roles to filter" },
    { name: "skills", in: "query", required: false, schema: { type: "string" }, description: "Comma-separated skills to filter" },
    { name: "jobType", in: "query", required: false, schema: { type: "string" }, description: "Comma-separated job types to filter" },
    { name: "location", in: "query", required: false, schema: { type: "string" }, description: "Comma-separated locations to filter" },
    { name: "workMode", in: "query", required: false, schema: { type: "string" }, description: "Comma-separated work modes to filter" },
    { name: "department", in: "query", required: false, schema: { type: "string" }, description: "Comma-separated departments to filter" },
    { name: "salaryMin", in: "query", required: false, schema: { type: "string" }, description: "Minimum salary filter" },
    { name: "salaryMax", in: "query", required: false, schema: { type: "string" }, description: "Maximum salary filter" },
    { name: "companyType", in: "query", required: false, schema: { type: "string" }, description: "Comma-separated company types" },
    { name: "postedDate", in: "query", required: false, schema: { type: "string", enum: ["oldest", "newest"] }, description: "Sort by oldest or newest" },
    { name: "company", in: "query", required: false, schema: { type: "string" }, description: "Filter by company name" },
    { name: "minExperience", in: "query", required: false, schema: { type: "string" }, description: "Minimum experience in years" },
    { name: "maxExperience", in: "query", required: false, schema: { type: "string" }, description: "Maximum experience in years" }
  ],
  responses: {
    "200": {
      description: "Paginated list of jobs fetched successfully",
      value: JobListResponse.schema,
    },
    "500": {
      description: "Internal server error",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Error fetching jobs" },
          error: { type: "string", example: "Unknown error" }
        }
      }
    }
  }
})()

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

      if (Array.isArray(param)) return param.map(String).map(s => s.trim()).filter(Boolean);
      return String(param).split(',').map(s => s.trim()).filter(Boolean);
    }
    logger.info(`GET / - Fetch jobs request. UserId: ${userId || 'Guest'}, IP: ${req.ip}, Page: ${pageNumber}, Limit: ${limitNumber}`);

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
            logger.debug(`Filtering roles: ${rolesArray.join(', ')}`);
        }

        const skillsArray = parseToArray(skills);
        if (skillsArray && skillsArray.length) {
            whereClause.skills = {
                hasSome: skillsArray,
            };
            logger.debug(`Filtering skills: ${skillsArray.join(', ')}`);
        }

        const minExperience = parseInt(req.query.minExperience as string);
        const maxExperience = parseInt(req.query.maxExperience as string);

        if (!isNaN(minExperience) || !isNaN(maxExperience)) {
            whereClause.AND = whereClause.AND || [];

            if (!isNaN(minExperience)) {
                whereClause.AND.push({
                    maxExperience: { gte: minExperience }
                });
                logger.debug(`Filtering minExperience: ${minExperience}`);
            }

            if (!isNaN(maxExperience)) {
                whereClause.AND.push({
                    minExperience: { lte: maxExperience }
                });
                logger.debug(`Filtering maxExperience: ${maxExperience}`);
            }
        }

        if (company && typeof company === 'string') {
            whereClause.company = {
                name: {
                    contains: company,
                    mode: 'insensitive',
                },
            };
            logger.debug(`Filtering company name contains: ${company}`);
        }

        const jobTypeArray = parseToArray(jobType);
        if (jobTypeArray && jobTypeArray.length) {
            whereClause.jobType = {
                in: jobTypeArray,
            };
            logger.debug(`Filtering jobType: ${jobTypeArray.join(', ')}`);
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
            logger.debug(`Filtering location: ${locationArray.join(', ')}`);
        }

        const workModeArray = parseToArray(workMode);
        if (workModeArray && workModeArray.length) {
            whereClause.workMode = {
                in: workModeArray,
            };
            logger.debug(`Filtering workMode: ${workModeArray.join(', ')}`);
        }

        const departmentArray = parseToArray(department);
        if (departmentArray && departmentArray.length) {
            whereClause.department = {
                in: departmentArray,
            };
            logger.debug(`Filtering department: ${departmentArray.join(', ')}`);
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
                  logger.debug(`Filtering salaryMin: ${minSalary}`);
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
                  logger.debug(`Filtering salaryMax: ${maxSalary}`);
                }
            }
        }

        const companyTypeArray = parseToArray(companyType);
        if (companyTypeArray && companyTypeArray.length) {
            whereClause.companyType = {
                in: companyTypeArray,
            };
            logger.debug(`Filtering companyType: ${companyTypeArray.join(', ')}`);
        }

        let orderBy = { createdAt: 'desc' as 'asc' | 'desc' };
        if (postedDate && typeof postedDate === 'string' && postedDate.toLowerCase() === 'oldest') {
            orderBy = { createdAt: 'asc' };
            logger.debug(`Ordering by oldest posted date`);
        } else {
            logger.debug(`Ordering by newest posted date`);
        }

        logger.debug(`DB Query - Fetch jobs with filters`);

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
        logger.info(`Jobs fetched successfully. Count: ${jobs.length} / Total: ${totalJobs}`);

        return res.status(200).json({
            page: pageNumber,
            count: limitNumber,
            totalJobs,
            totalPages: Math.ceil(totalJobs / limitNumber),
            jobs,
        });
    } catch(err) {
        logger.error(`Error fetching jobs - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
        logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
        return res.status(500).json({
            message: "Error fetching jobs",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})


class JobDetailResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: { type: "string", example: "Job fetched successfully" },
      job: {
        type: "object",
        properties: {
          id: { type: "string", example: "job-id-uuid" },
          title: { type: "string", example: "Backend Developer" },
          description: { type: "string", example: "Job description here" },
          location: { type: "string", example: "Remote" },
          role: { type: "string", example: "Developer" },
          skills: {
            type: "array",
            items: { type: "string" },
            example: ["Node.js", "TypeScript"]
          },
          jobType: { type: "string", example: "Full-time" },
          workMode: { type: "string", example: "Remote" },
          department: { type: "string", example: "Engineering" },
          salaryMin: { type: "number", example: 50000 },
          salaryMax: { type: "number", example: 100000 },
          company: {
            type: "object",
            properties: {
              name: { type: "string", example: "ABC Corp" },
              logoUrl: { type: "string", example: "https://abc.com/logo.png" }
            }
          },
          recruiter: {
            type: "object",
            properties: {
              positionTitle: { type: "string", example: "Senior Recruiter" },
              user: {
                type: "object",
                properties: {
                  name: { type: "string", example: "John Doe" }
                }
              }
            }
          },
          createdAt: { type: "string", format: "date-time", example: "2023-01-01T12:00:00Z" },
        },
        required: ["id", "title", "company", "recruiter"]
      },
      meta: {
        type: "object",
        properties: {
          isApplied: { type: "boolean", example: false },
          isHidden: { type: "boolean", example: true }
        },
        required: ["isApplied", "isHidden"]
      }
    },
    required: ["message", "job", "meta"]
  }
}

Documentation.addRoute({
  path: "/jobs/:jobId",
  method: Methods.get,
  tags: ["Jobs - Applicant"],
  summary: "Fetch a single job by ID",
  parameters: [
    {
      name: "jobId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "ID of the job to fetch"
    }
  ],
  responses: {
    "200": {
      description: "Job fetched successfully",
      value: JobDetailResponse.schema
    },
    "404": {
      description: "Job not found",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Job not found" }
        }
      }
    },
    "500": {
      description: "Internal server error",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Error fetching the job" },
          error: { type: "string", example: "Unknown error" }
        }
      }
    }
  }
})();


router.get('/:jobId', async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const userId = req.user?.userId;
    logger.info(`GET /${jobId} - Fetch job request. UserId: ${userId || 'Guest'}, IP: ${req.ip}`);
    try {
      logger.debug(`DB Query - Fetch job with id: ${jobId}`);
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
        logger.warn(`Job not found with id: ${jobId} (requested by userId: ${userId || 'Guest'})`);
        return res.status(404).json({
            message: "Job not found",
        });
      }

      let isApplied = false;
      let isHidden = false

      if(userId){
        logger.debug(`Checking application and hidden status for userId: ${userId} on jobId: ${jobId}`);
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
        logger.debug(`Application status: ${isApplied}, Hidden status: ${isHidden} for userId: ${userId} on jobId: ${jobId}`);
      }
      logger.info(`Job fetched successfully for jobId: ${jobId} (UserId: ${userId || 'Guest'})`);

      res.status(200).json({
          message: "Job fetched successfully",
          job,
          meta: {
              isApplied,
              isHidden
          }
      })
    } catch(err) {
      logger.error(`Error fetching job with id: ${jobId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
      logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
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

class JobApplicationRequest {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      resume: { type: "string", nullable: true, example: "https://resume.link/myresume.pdf" },
      coverLetter: { type: "string", nullable: true, example: "I am very interested in this position because..." },
      portfolioUrl: { type: "string", format: "url", nullable: true, example: "https://myportfolio.com" },
    }
  };
}

class JobApplicationResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: { type: "string", example: "Application submitted successfully" },
      application: {
        type: "object",
        properties: {
          id: { type: "string", example: "application-id-uuid" },
          applicantId: { type: "string", example: "applicant-id-uuid" },
          jobId: { type: "string", example: "job-id-uuid" },
          resume: { type: "string", nullable: true, example: "https://resume.link/myresume.pdf" },
          coverLetter: { type: "string", nullable: true, example: "I am very interested in this position because..." },
          portfolioUrl: { type: "string", format: "url", nullable: true, example: "https://myportfolio.com" },
          createdAt: { type: "string", format: "date-time", example: "2025-01-01T12:00:00Z" },
        },
        required: ["id", "applicantId", "jobId", "createdAt"],
      },
    },
    required: ["message", "application"],
  };
}

Documentation.addRoute({
  path: "/jobs/:jobId/apply",
  method: Methods.post,
  tags: ["Jobs - Applicant"],
  summary: "Apply for a job",
  requestBody: JobApplicationRequest.schema,
  requestBodyDescription: "job application for the jobId",
  parameters: [
    {
      name: "jobId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "ID of the job to fetch",
    },
  ],
  responses: {
    "200": {
      description: "Job applied successfully",
      value: JobApplicationResponse.schema,
    },
    "404": {
      description: "Job not found",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Job not found" },
        },
      },
    },
    "500": {
      description: "Internal server error",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Error applying for the job" },
          error: { type: "string", example: "Unknown error" },
        },
      },
    },
  },
})();


router.post('/:jobId/apply', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const applicantId = req.user?.userId;
    logger.info(`POST /${jobId}/apply - Application attempt by applicantId: ${applicantId}, IP: ${req.ip}`);

    if (!applicantId) {
        logger.warn(`Unauthorized application attempt to jobId: ${jobId} - Missing applicantId. IP: ${req.ip}`);
        return res.status(401).json({ message: "Unauthorized" });
    }

    const response = jobApplicationBody.safeParse(req.body);
    if(!response.success){
        logger.warn(`Invalid application input for jobId: ${jobId} by applicantId: ${applicantId}`);
        return res.status(400).json({ message: "Invalid input" });
    }

    const applicationData = response.data;

    try {
      logger.debug(`DB Query - Fetch applicant with id: ${applicantId}`);
        const applicant = await prisma.applicant.findUnique({
            where: {
                id: applicantId
            }
        })

        if(!applicant){
          logger.warn(`Applicant profile not found for applicantId: ${applicantId}`);
            return res.status(404).json({ message: "Applicant profile not found" })
        }

        logger.warn(`Applicant profile not found for applicantId: ${applicantId}`);
        const job = await prisma.job.findUnique({
            where: {
                id: jobId
            }
        })

        if(!job){
          logger.warn(`Job not found with id: ${jobId} (ApplicantId: ${applicantId})`);
            return res.status(404).json({ message: "Job not found" })
        }

        logger.debug(`DB Query - Check existing application for jobId: ${jobId} and applicantId: ${applicantId}`);
        const existing = await prisma.application.findUnique({
            where: {
                applicantId_jobId: {
                    applicantId: applicantId,
                    jobId
                }
            }
        })

        if(existing){
          logger.info(`Duplicate application attempt to jobId: ${jobId} by applicantId: ${applicantId}`);
            return res.status(409).json({ message: "You have already applied to this job" })
        }

        logger.debug(`DB Insert - Creating application for jobId: ${jobId} by applicantId: ${applicantId}`);
        const application = await prisma.application.create({
            data: {
                applicantId: applicantId,
                jobId,
                ...applicationData
            }
        })

        logger.info(`Application submitted successfully for jobId: ${jobId} by applicantId: ${applicantId}`);

        return res.status(201).json({
            message: "Application submitted successfully",
            application
        })
    } catch(err) {
        logger.error(`Error applying to jobId: ${jobId} by applicantId: ${applicantId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
        logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

// ------ Saved ------

class SavedJobResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: { type: "string", example: "Job saved successfully" },
      job: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "saved-job-id-uuid" },
          jobId: { type: "string", format: "uuid", example: "job-id-uuid" },
          applicantId: { type: "string", format: "uuid", example: "applicant-id-uuid" },
          createdAt: { type: "string", format: "date-time", example: "2025-09-28T12:34:56Z" },
        },
        required: ["id", "jobId", "applicantId", "createdAt"],
      },
    },
    required: ["message", "job"],
  };
}

Documentation.addRoute({
  path: "/jobs/:jobId/save",
  method: Methods.post,
  tags: ["Saved"],
  summary: "Save a job for an applicant",
  parameters: [
    {
      name: "jobId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "ID of the job to save",
    },
  ],
  responses: {
    "201": {
      description: "Job saved successfully",
      value: SavedJobResponse.schema,
    },
    "401": {
      description: "Unauthorized",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Unauthorized" },
        },
      },
    },
    "404": {
      description: "Job not found",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Job not found" },
        },
      },
    },
    "409": {
      description: "Job already saved",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "You have already saved this job." },
        },
      },
    },
    "500": {
      description: "Internal server error",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Internal server error" },
          error: { type: "string", example: "Unknown error" },
        },
      },
    },
  },
})();

router.post('/:jobId/save', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const applicantId = req.user?.userId;
    const { jobId } = req.params;
    logger.info(`POST /${jobId}/save - Save job attempt by applicantId: ${applicantId}, IP: ${req.ip}`);

    if (!applicantId) {
        logger.warn(`Unauthorized job save attempt for jobId: ${jobId} - Missing applicantId. IP: ${req.ip}`);
        return res.status(401).json({ message: "Unauthorized" });
    }


    try {
        logger.debug(`DB Query - Fetch job with id: ${jobId}`);
        const job = await prisma.job.findUnique({
            where: {
                id: jobId
            }
        })

        if(!job){
          logger.warn(`Job not found with id: ${jobId} (ApplicantId: ${applicantId})`);
            return res.status(404).json({message: "Job not found"})
        }

        logger.debug(`DB Query - Check if job is already saved [jobId=${jobId}, applicantId=${applicantId}]`);
        const alreadySaved = await prisma.savedJob.findFirst({
            where: {
                jobId,
                applicantId
            }
        })

        if (alreadySaved) {
          logger.info(`Duplicate save attempt for jobId: ${jobId} by applicantId: ${applicantId}`);
            return res.status(409).json({
                message: "You have already saved this job."
            });
        }

        logger.debug(`DB Insert - Saving job for applicantId: ${applicantId}, jobId: ${jobId}`);
        const savedJob = await prisma.savedJob.create({
            data: {
                jobId,
                applicantId
            }
        })
        logger.info(`Job saved successfully [jobId=${jobId}] by applicantId: ${applicantId}`);

        return res.status(201).json({
            message: "Job saved successfully",
            job: savedJob
        })
    } catch(err) {
        logger.error(`Error saving job [jobId=${jobId}, applicantId=${applicantId}] - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
        logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

class DeletedSavedJobResponse {
  static schema = {
    type: "object",
    properties: {
      message: { type: "string", example: "Saved job removed successfully" },
      job: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "saved-job-id-uuid" },
          jobId: { type: "string", format: "uuid", example: "job-id-uuid" },
          applicantId: { type: "string", format: "uuid", example: "applicant-id-uuid" },
          createdAt: { type: "string", format: "date-time", example: "2025-09-28T12:34:56Z" },
          deletedAt: { type: "string", format: "date-time", example: "2025-09-29T09:10:11Z" }, // optional if you track this
        },
        required: ["id", "jobId", "applicantId", "createdAt"],
      },
    },
    required: ["message", "job"],
  };
}

Documentation.addRoute({
  path: "/jobs/:jobId/unsave",
  method: Methods.delete,
  tags: ["Saved"],
  summary: "Remove a saved job for an applicant",
  parameters: [
    {
      name: "jobId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "ID of the job to remove from saved list",
    },
  ],
  responses: {
    "200": {
      description: "Saved job removed successfully",
      value: DeletedSavedJobResponse.schema,
    },
    "401": {
      description: "Unauthorized",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Unauthorized" },
        },
      },
    },
    "404": {
      description: "Job or saved job not found",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Job not found" },
        },
      },
    },
    "500": {
      description: "Internal server error",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Internal server error" },
          error: { type: "string", example: "Unknown error" },
        },
      },
    },
  },
})();

router.delete('/:jobId/unsave', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const applicantId = req.user?.userId;
    const { jobId } = req.params;

    logger.info(`DELETE /${jobId}/save - Unsave job attempt by applicantId: ${applicantId}, IP: ${req.ip}`);

    if (!applicantId) {
        logger.warn(`Unauthorized unsave job attempt for jobId: ${jobId} - Missing applicantId. IP: ${req.ip}`);
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      logger.debug(`DB Query - Fetch job with id: ${jobId}`);
        const job = await prisma.job.findUnique({
            where: {
                id: jobId
            }
        })

        if(!job){
            logger.warn(`Job not found with id: ${jobId} (applicantId: ${applicantId})`);
            return res.status(404).json({message: "Job not found"})
        }

        logger.debug(`DB Query - Find saved job [jobId=${jobId}, applicantId=${applicantId}]`);
        const savedJob = await prisma.savedJob.findFirst({
            where: { jobId, applicantId }
        });

        if (!savedJob) {
          logger.warn(`Saved job not found for jobId: ${jobId} and applicantId: ${applicantId}`);
            return res.status(404).json({
                message: "Saved job not found."
            });
        }

        logger.debug(`DB Delete - Removing saved job [jobId=${jobId}, applicantId=${applicantId}]`);
        const deletedJob = await prisma.savedJob.delete({
            where: {
                applicantId_jobId: {
                    applicantId: applicantId,
                    jobId
                }
            }
        })

        logger.info(`Saved job removed successfully [jobId=${jobId}] by applicantId: ${applicantId}`);

        return res.status(200).json({
            message: "Saved job removed successfully",
            job: deletedJob
        })
    } catch(err) {
        logger.error(`Error removing saved job [jobId=${jobId}, applicantId=${applicantId}] - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
        logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})


class SavedJob {
  static schema = {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid", example: "saved-job-id-uuid" },
      createdAt: { type: "string", format: "date-time", example: "2025-09-28T12:34:56Z" },
      job: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "job-id-uuid" },
          title: { type: "string", example: "Backend Developer" },
          description: { type: "string", example: "Job description here" },
          createdAt: { type: "string", format: "date-time", example: "2025-09-20T09:00:00Z" },
          company: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid", example: "company-id-uuid" },
              name: { type: "string", example: "ABC Corp" },
              logoUrl: { type: "string", example: "https://abc.com/logo.png" },
              website: { type: "string", example: "https://abc.com" },
            },
            required: ["id", "name"],
          },
        },
        required: ["id", "title", "company"],
      },
      applicantId: { type: "string", format: "uuid", example: "applicant-id-uuid" },
    },
    required: ["id", "job", "applicantId", "createdAt"],
  };
}

class Pagination {
  static schema = {
    type: "object",
    properties: {
      total: { type: "integer", example: 100 },
      page: { type: "integer", example: 1 },
      limit: { type: "integer", example: 10 },
      totalPages: { type: "integer", example: 10 },
      order: { type: "string", enum: ["asc", "desc"], example: "desc" },
    },
    required: ["total", "page", "limit", "totalPages", "order"],
  };
}

class SavedJobsResponse {
  static schema = {
    type: "object",
    properties: {
      message: { type: "string", example: "Saved jobs fetched successfully" },
      data: {
        type: "array",
        items: SavedJob.schema,
      },
      pagination: Pagination.schema,
    },
    required: ["message", "data", "pagination"],
  };
}

Documentation.addRoute({
  path: "/jobs/saved",
  method: Methods.get,
  tags: ["Saved"],
  summary: "Fetch saved jobs for the logged-in applicant",
  parameters: [
    {
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer"},
      description: "Page number for pagination",
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer"},
      description: "Number of saved jobs per page",
    },
    {
      name: "order",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["asc", "desc"] },
      description: "Order of saved jobs by creation date",
    },
  ],
  responses: {
    "200": {
      description: "Saved jobs fetched successfully",
      value: SavedJobsResponse.schema,
    },
    "401": {
      description: "Unauthorized",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Unauthorized" },
        },
      },
    },
    "500": {
      description: "Internal server error",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Internal server error" },
          error: { type: "string", example: "Unknown error" },
        },
      },
    },
  },
})();

router.get('/saved', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const applicantId = req.user?.userId;
    logger.info(`GET /saved - Fetch saved jobs request by applicantId: ${applicantId}, IP: ${req.ip}`);

    if (!applicantId) {
        logger.warn(`Unauthorized saved jobs access attempt. IP: ${req.ip}`);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const order = (req.query.order as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    try {
      logger.debug(`DB Query - Count total saved jobs for applicantId: ${applicantId}`);
        const totalCount = await prisma.savedJob.count({
            where: { applicantId }
        });

        logger.debug(`DB Query - Fetch saved jobs for applicantId: ${applicantId} with pagination (page: ${page}, limit: ${limit}, order: ${order})`);
        const savedJobs = await prisma.savedJob.findMany({
            where: {
                applicantId
            },
            include: {
                job: {
                    include: {
                        company: true
                    }
                }
            },
            orderBy: {
                createdAt: order
            },
            skip,
            take: limit
        })
        
        logger.info(`Saved jobs fetched successfully for applicantId: ${applicantId} (count: ${savedJobs.length})`);
        return res.status(200).json({
            message: "Saved jobs fetched successfully",
            data: savedJobs,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
                order
            }
        })
    } catch(err) {
        logger.error(`Error fetching saved jobs for applicantId=${applicantId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
        logger.debug(`Stack trace: ${err instanceof Error ? err.stack : "No stack trace"}`);
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

export default router;