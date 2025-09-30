import express, { Request, Response } from 'express';
import roleMiddleware from '../../middleware/roleMiddleware';
const router = express.Router();
import { ApplicationStatus, PrismaClient } from '@prisma/client';
import { Documentation, Methods, SchemaObject } from '../../docs/documentation';
import logger from '../../utils/logger';
const prisma = new PrismaClient();

class GetMyApplicationsResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: { type: "string", example: "Applications fetched successfully" },
      data: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", example: "application-id-123" },
            status: { type: "string", example: "PENDING" },
            createdAt: { type: "string", format: "date-time" },
            job: {
              type: "object",
              properties: {
                id: { type: "string", example: "job-id-456" },
                title: { type: "string", example: "Frontend Developer" },
                company: {
                  type: "object",
                  properties: {
                    id: { type: "string", example: "company-id-789" },
                    name: { type: "string", example: "Acme Corp" }
                  }
                },
                recruiter: {
                  type: "object",
                  properties: {
                    id: { type: "string", example: "recruiter-id-321" },
                    name: { type: "string", example: "John Recruiter" }
                  }
                }
              }
            }
          }
        }
      },
      pagination: {
        type: "object",
        properties: {
          total: { type: "number", example: 100 },
          page: { type: "number", example: 1 },
          limit: { type: "number", example: 10 },
          totalPages: { type: "number", example: 10 },
          hasNextPage: { type: "boolean", example: true },
          hasPrevPage: { type: "boolean", example: false }
        }
      }
    }
  }
}

Documentation.addSchema()(GetMyApplicationsResponse);

Documentation.addRoute({
  path: "/applications/me",
  method: Methods.get,
  tags: ["Application - Applicant"],
  summary: "Get applications submitted by the logged-in applicant",
  parameters: [
    {
      in: "query",
      name: "page",
      required: false,
      schema: { type: "integer", example: 1 }
    },
    {
      in: "query",
      name: "limit",
      required: false,
      schema: { type: "integer", example: 10 }
    },
    {
      in: "query",
      name: "status",
      required: false,
      schema: { 
        type: "string",
        enum: ["PENDING", "REVIEWED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
        example: "PENDING"
      }
    }
  ],
  responses: {
    "200": {
      description: "Applications fetched successfully",
      value: GetMyApplicationsResponse.schema
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
      description: "Internal server error",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Internal server error" },
          error: { type: "string", example: "Unknown error" }
        }
      }
    }
  }
})();

router.get('/me', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
    const applicantId = req.user?.userId;
    logger.info(`GET /me - Fetching applications for applicantId: ${applicantId}, IP: ${req.ip}`);

    if(!applicantId){
      logger.warn(`Unauthorized access attempt - Missing applicantId. IP: ${req.ip}`);
      return res.status(401).json({ message: "Unauthorized" })
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const statusRaw = req.query.status as string | undefined;
    const validStatuses = Object.values(ApplicationStatus);
    logger.debug(`Query params - page: ${page}, limit: ${limit}, statusRaw: ${statusRaw}`);

    const status = statusRaw && validStatuses.includes(statusRaw as ApplicationStatus)
    ? (statusRaw as ApplicationStatus)
    : undefined;

    if (statusRaw && !status) {
        logger.warn(`Invalid status filter provided: ${statusRaw}`);
    }

    try {
        logger.debug(`DB Query - Counting applications for applicantId: ${applicantId}, status: ${status}`);
        const total = await prisma.application.count({
            where: {
                applicantId,
                ...(status ? { status} : {})
            }
        })
        logger.debug(`DB Result - Total applications found: ${total}`);

        logger.debug(`DB Query - Fetching applications with pagination - skip: ${skip}, take: ${limit}`);
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
        logger.debug(`DB Result - Applications fetched: ${applications.length}`);
        logger.info(`Applications fetched successfully for applicantId: ${applicantId}, page: ${page}, limit: ${limit}`);

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
        logger.error(`Error fetching applications for applicantId: ${applicantId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
        console.error(`Error fetching applications applied by applicantId:${applicantId}`, err)
        return res.status(500).json({
            message: "Internal server error",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

export default router;