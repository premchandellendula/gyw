import express, { Request, Response } from 'express';
import roleMiddleware from '../../middleware/roleMiddleware';
const router = express.Router();
import { PrismaClient } from '@prisma/client';
import { Documentation, Methods, SchemaObject } from '../../docs/documentation';
const prisma = new PrismaClient();

class GetJobSeekersResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "Applicants fetched successfully",
      },
      applicants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", example: "applicant-id-123" },
            skills: {
              type: "array",
              items: { type: "string", example: "JavaScript" }
            },
            user: {
              type: "object",
              properties: {
                name: { type: "string", example: "John Doe" },
                profilePicture: { type: "string", example: "https://example.com/pic.png" }
              }
            }
          }
        }
      },
      pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          total: { type: "integer", example: 25 },
          totalPages: { type: "integer", example: 3 }
        }
      }
    }
  }
}
Documentation.addSchema()(GetJobSeekersResponse);

Documentation.addRoute({
  path: "/seekers/search",
  method: Methods.get,
  tags: ["Seekers"],
  summary: "Get applicants matching role and skills",
  parameters: [
    {
      in: "query",
      name: "skills",
      required: false,
      schema: { type: "string", example: "JavaScript,React" },
      description: "Comma-separated skills to search by"
    },
    {
      in: "query",
      name: "role",
      required: false,
      schema: { type: "string", example: "Frontend" },
      description: "Role name (partial match)"
    },
    {
      in: "query",
      name: "page",
      required: false,
      schema: { type: "string", example: "1" },
      description: "Page number"
    },
    {
      in: "query",
      name: "limit",
      required: false,
      schema: { type: "string", example: "10" },
      description: "Items per page"
    }
  ],
  responses: {
    "200": {
      description: "Applicants fetched successfully",
      value: GetJobSeekersResponse.schema
    },
    "401": {
      description: "Unauthorized",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Unauthorized" },
          error: { type: "string", example: "Missing recruiter ID" }
        }
      }
    },
    "500": {
      description: "Server error",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Internal server error" },
          error: { type: "string", example: "Something went wrong while fetching applicants" }
        }
      }
    }
  }
})();

router.get('/search', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
  const recruiterId = req.user?.userId;
  if (!recruiterId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { skills, role, page = '1', limit = '10' } = req.query;

  const pageNumber = parseInt(page as string) || 1;
  const limitNumber = parseInt(limit as string) || 10;
  const skip = (pageNumber - 1) * limitNumber;

  try {
    const whereClause: any = {};

    if (skills) {
      whereClause.skills = {
        hasSome: (skills as string).split(','),
      };
    }

    if (role) {
      whereClause.role = {
        contains: role as string,
        mode: 'insensitive',
      };
    }

    const [applicants, total] = await Promise.all([
      prisma.applicant.findMany({
        where: whereClause,
        skip,
        take: limitNumber,
        select: {
          id: true,
          skills: true,
          user: {
            select: {
              name: true,
              profilePicture: true,
            }
          }
        }
      }),
      prisma.applicant.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      message: "Applicants fetched successfully",
      applicants,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      }
    });
  } catch (error) {
    console.error('Error searching applicants', error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

class ApplicantDetailsResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "Applicant fetched successfully",
      },
      applicant: {
        type: "object",
        properties: {
          id: { type: "string", example: "applicant-id-123" },
          user: {
            type: "object",
            properties: {
              name: { type: "string", example: "John Doe" },
              profilePicture: { type: "string", example: "https://example.com/image.jpg" },
              email: { type: "string", example: "john@example.com" },
              phoneNumber: { type: "string", example: "+1234567890" }
            },
            required: ["name", "profilePicture"]
          },
          experience: {
            type: "array",
            items: {
              type: "object",
              properties: {
                company: { type: "string", example: "Acme Corp" },
                role: { type: "string", example: "Software Engineer" },
                startDate: { type: "string", example: "2020-01-01" },
                endDate: { type: "string", example: "2022-01-01" },
              }
            }
          },
          education: {
            type: "array",
            items: {
              type: "object",
              properties: {
                institution: { type: "string", example: "State University" },
                degree: { type: "string", example: "Bachelor of Science" },
                fieldOfStudy: { type: "string", example: "Computer Science" },
                startDate: { type: "string", example: "2016-09-01" },
                endDate: { type: "string", example: "2020-06-01" },
              }
            }
          }
        }
      }
    }
  }
}

Documentation.addSchema()(ApplicantDetailsResponse);

Documentation.addRoute({
  path: "/seekers/:id",
  method: Methods.get,
  tags: ["Seekers"],
  summary: "Get details of an applicant if recruiter owns the job they applied for",
  parameters: [
    {
      in: "path",
      name: "id",
      required: true,
      schema: { type: "string", example: "applicant-id-123" },
    }
  ],
  responses: {
    "200": {
      description: "Applicant fetched successfully",
      value: ApplicantDetailsResponse.schema,
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
      description: "Applicant not found",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Applicant not found" }
        }
      }
    },
    "500": {
      description: "Internal server error",
      value: {
        type: "object",
        properties: {
          message: { type: "string", example: "Internal server error" },
          error: { type: "string", example: "Database connection failed" }
        }
      }
    }
  }
})();

router.get('/:id', roleMiddleware("RECRUITER"), async (req: Request, res: Response) => {
  const recruiterId = req.user?.userId;
  if (!recruiterId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const applicantId = req.params.id;

  try {
    const application = await prisma.application.findFirst({
      where: {
        applicantId,
        job: { recruiterId },
      },
      select: {
        id: true,
      },
    });

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: {
        user: {
          select: {
            name: true,
            profilePicture: true,
            email: application ? true : false,
            phoneNumber: application ? true : false,
          }
        },
        experience: true,
        education: true,
      }
    });

    if (!applicant) {
      return res.status(404).json({ message: "Applicant not found" });
    }

    return res.status(200).json({
      message: "Applicant fetched successfully",
      applicant,
    });
  } catch (error) {
    console.error(`Error fetching applicant with id:${applicantId}`, error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;