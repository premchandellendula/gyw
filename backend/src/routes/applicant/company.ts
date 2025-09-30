import express, { Request, Response } from 'express';
const router = express.Router();
import { PrismaClient } from '@prisma/client';
import roleMiddleware from '../../middleware/roleMiddleware';
import { Documentation, Methods, SchemaObject } from '../../docs/documentation';
import logger from '../../utils/logger';
const prisma = new PrismaClient();

class GetCompaniesResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "Companies fetched successfully",
      },
      companies: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", example: "company-id-123" },
            name: { type: "string", example: "Acme Corp" },
            industry: { type: "string", example: "Technology" },
            location: { type: "string", example: "San Francisco" },
            size: { type: "string", example: "100-500" },
            createdAt: { type: "string", format: "date-time", example: "2024-01-01T00:00:00Z" }
          }
        }
      },
      meta: {
        type: "object",
        properties: {
          total: { type: "integer", example: 100 },
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          totalPages: { type: "integer", example: 10 }
        }
      }
    }
  }
}

Documentation.addSchema()(GetCompaniesResponse)

Documentation.addRoute({
  path: "/companies/",
  method: Methods.get,
  tags: ["Company - Applicant"],
  summary: "Get a list of companies with filtering, sorting, and pagination",
  parameters: [
    { in: "query", name: "name", schema: { type: "string" }, required: false },
    { in: "query", name: "industry", schema: { type: "string" }, required: false },
    { in: "query", name: "location", schema: { type: "string" }, required: false },
    { in: "query", name: "size", schema: { type: "string" }, required: false },
    { in: "query", name: "sortBy", schema: { type: "string", example: "createdAt" }, required: false },
    { in: "query", name: "order", schema: { type: "string", enum: ["asc", "desc"], example: "desc" }, required: false },
    { in: "query", name: "page", schema: { type: "integer", example: 1 }, required: false },
    { in: "query", name: "limit", schema: { type: "integer", example: 10 }, required: false }
  ],
  responses: {
    "200": {
      description: "Companies fetched successfully",
      value: GetCompaniesResponse.schema
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

router.get('/', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
  const applicantId = req.user?.userId;
  logger.info(`GET / - Fetching companies for applicantId: ${applicantId}, IP: ${req.ip}`);

  if (!applicantId) {
    logger.warn(`Unauthorized access attempt - Missing applicantId. IP: ${req.ip}`);
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
  logger.debug(`Query params received - name: ${name}, industry: ${industry}, location: ${location}, size: ${size}, sortBy: ${sortBy}, order: ${order}, page: ${page}, limit: ${limit}`);

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
  logger.debug(`Constructed filters: ${JSON.stringify(filters)}`);
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  try {
    logger.debug(`DB Query - Fetching companies from DB with filters: ${JSON.stringify(filters)}, skip: ${skip}, take: ${limitNumber}, sortBy: ${sortBy}, order: ${order}`);
    const companies = await prisma.company.findMany({
      where: filters,
      orderBy: {
        [sortBy as string]: order
      },
      skip,
      take: limitNumber
    });

    logger.debug(`DB Result - Companies fetched: ${companies.length}`);

    const total = await prisma.company.count({ where: filters });
    logger.debug(`DB Result - Total companies count: ${total}`);

    logger.info(`Companies fetched successfully for applicantId: ${applicantId}, page: ${pageNumber}, limit: ${limitNumber}`);

    return res.status(200).json({
      message: "Companies fetched successfully",
      companies,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        hasNextPage: skip + limitNumber < total,
        hasPrevPage: pageNumber > 1
      }
    });
  } catch (err) {
    logger.error(`Error fetching companies for applicantId: ${applicantId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
    console.error(`Error fetching the list of companies `, err)
    return res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error"
    })
  }
})

class GetCompanyJobsResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "Company fetched successfully"
      },
      company: {
        type: "object",
        properties: {
          id: { type: "string", example: "company-id-123" },
          jobs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", example: "Frontend Developer" },
                skills: {
                  type: "array",
                  items: { type: "string" },
                  example: ["React", "TypeScript", "GraphQL"]
                },
                minCTC: { type: "number", example: 60000 },
                maxCTC: { type: "number", example: 90000 },
                minExperience: { type: "number", example: 2 },
                maxExperience: { type: "number", example: 5 },
                employmentType: { type: "string", example: "Full-time" },
                jobType: { type: "string", example: "Permanent" },
                openings: { type: "integer", example: 3 },
                noticePeriod: { type: "integer", example: 30 }
              }
            }
          }
        }
      }
    }
  }
}

Documentation.addSchema()(GetCompanyJobsResponse);

Documentation.addRoute({
  path: "/companies/:id/jobs",
  method: Methods.get,
  tags: ["Company - Applicant"],
  summary: "Get jobs posted by a company",
  parameters: [
    {
      in: "path",
      name: "id",
      required: true,
      schema: { type: "string", example: "company-id-123" }
    }
  ],
  responses: {
    "200": {
      description: "Company jobs fetched successfully",
      value: GetCompanyJobsResponse.schema
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

router.get('/:id/jobs', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
  const { id } = req.params;
  const applicantId = req.user?.userId;
  logger.info(`GET /:id/jobs - Fetching jobs for companyId: ${id}, applicantId: ${applicantId}, IP: ${req.ip}`);

  if (!applicantId) {
    logger.warn(`Unauthorized access attempt - Missing applicantId. IP: ${req.ip}`);
    return res.status(401).json({ message: "Unauthorized" })
  }

  try {
    logger.debug(`DB Query - Fetching jobs of a company with companyId: ${id}`);
    const jobs = await prisma.job.findMany({
      where: {
        companyId: id
      },
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
    })
    if (!jobs) {
      logger.warn(`Jobs for companyId: ${id} not found`);
      return res.status(404).json({ message: "Jobs not found" });
    }
    logger.debug(`DB Result - ${jobs.length} job(s) fetched for companyId: ${id}`);

    logger.info(`Company and jobs fetched successfully for companyId: ${id}`);

    return res.status(200).json({
      message: "Jobs fetched successfully",
      jobs
    });
  } catch (err) {
    logger.error(`Error fetching jobs for companyId: ${id} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
    console.error(`Error fetching the company with id:${id} `, err)
    return res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error"
    })
  }
})

class CompanyWithJobsResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "Company fetched successfully",
      },
      company: {
        type: "object",
        properties: {
          id: { type: "string", example: "company-id-123" },
          name: { type: "string", example: "Acme Corp" },
          industry: { type: "string", example: "Technology" },
          location: { type: "string", example: "San Francisco" },
          size: { type: "string", example: "100-500" },
          website: { type: "string", example: "https://example.com" },
          description: { type: "string", example: "Leading tech company" },
          createdAt: { type: "string", format: "date-time", example: "2023-01-01T12:00:00Z" },
          updatedAt: { type: "string", format: "date-time", example: "2023-01-15T12:00:00Z" },
          jobs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", example: "job-id-456" },
                title: { type: "string", example: "Frontend Developer" },
                skills: {
                  type: "array",
                  items: { type: "string" },
                  example: ["React", "TypeScript"]
                },
                minCTC: { type: "number", example: 60000 },
                maxCTC: { type: "number", example: 90000 },
                minExperience: { type: "number", example: 2 },
                maxExperience: { type: "number", example: 5 },
                employmentType: { type: "string", example: "Full-time" },
                jobType: { type: "string", example: "Permanent" },
                openings: { type: "integer", example: 3 },
                noticePeriod: { type: "integer", example: 30 },
                createdAt: { type: "string", format: "date-time", example: "2023-01-10T12:00:00Z" },
                updatedAt: { type: "string", format: "date-time", example: "2023-01-12T12:00:00Z" }
              }
            }
          }
        }
      }
    },
    required: ["message", "company"]
  }
}

Documentation.addSchema()(CompanyWithJobsResponse);

Documentation.addRoute({
  path: "companies/:id/details",
  method: Methods.get,
  tags: ["Company - Applicant"],
  summary: "Get company details including all jobs",
  parameters: [
    {
      in: "path",
      name: "id",
      required: true,
      schema: { type: "string", example: "company-id-123" }
    }
  ],
  responses: {
    "200": {
      description: "Company details fetched successfully",
      value: CompanyWithJobsResponse.schema
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
    "404": {
      description: "Company not found",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Company not found" }
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

router.get('/:id/details', roleMiddleware("APPLICANT"), async (req: Request, res: Response) => {
  const applicantId = req.user?.userId;
  const companyId = req.params.id;
  logger.info(`GET /:id/details - Fetching details for companyId: ${companyId}, applicantId: ${applicantId}, IP: ${req.ip}`);

  if (!applicantId) {
    logger.warn(`Unauthorized access attempt - Missing applicantId. IP: ${req.ip}`);
    return res.status(401).json({ message: "Unauthorized" })
  }

  try {
    logger.debug(`DB Query - Fetching details of a company with companyId: ${companyId}`);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            skills: true,
            minCTC: true,
            maxCTC: true,
            minExperience: true,
            maxExperience: true,
            employmentType: true,
            jobType: true,
            openings: true,
            noticePeriod: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });

    if (!company) {
      logger.warn(`Company not found with companyId: ${companyId}`);
      return res.status(404).json({ message: "Company not found" });
    }

    logger.debug(`DB Result - ${company} company fetched for companyId: ${companyId}`);

    logger.info(`Company details fetched successfully for companyId: ${companyId}`);

    return res.status(200).json({
      message: "Company fetched successfully",
      company
    });
  } catch (err) {
    logger.error(`Error fetching details of companyId: ${companyId} - ${err instanceof Error ? err.message : "Unknown error"} - IP: ${req.ip}`);
    console.error(`Error fetching company with id: ${companyId}`, err);
    return res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error"
    });
  }
})

export default router;