import express, { Request, Response } from 'express';
import roleMiddleware from '../../middleware/roleMiddleware';
const router = express.Router();
import zod from 'zod';
import { PrismaClient, CompanySize } from '@prisma/client';
import { Documentation, Methods, SchemaObject } from '../../docs/documentation';
const prisma = new PrismaClient();

router.use(roleMiddleware('RECRUITER'))

const companyBody = zod.object({
    name: zod.string(),
    logoUrl: zod.string(),
    website: zod.string(),
    industry: zod.string(),
    companySize: zod.enum(["SELF_EMPLOYED", "SIZE_2_10", "SIZE_11_50", "SIZE_51_200", "SIZE_201_500", "SIZE_501_1000", "SIZE_1001_5000", "SIZE_5001_10000", "SIZE_10000_PLUS"]),
    headquarters: zod.string(),
    foundedYear: zod.number(),
    description: zod.string()
})

class CreateCompanyRequest {
    static schema: SchemaObject = {
        type: "object",
        required: ["name", "logoUrl", "website", "industy", "companySize", "headQuarters", "foundedYear", "description"],
        properties: {
            name: { type: "string", example: "XYZ Company"},
            logoUrl: { type: "string", example: "https://example.com/logo.png"},
            website: { type: "string", example: "https://www.example.com"},
            industry: { type: "string", example: "IT"},
            companySize: { type: "string", enum: ["SELF_EMPLOYED", "SIZE_2_10", "SIZE_11_50", "SIZE_51_200", "SIZE_201_500", "SIZE_501_1000", "SIZE_1001_5000", "SIZE_5001_10000", "SIZE_10000_PLUS"], example: "11-50"},
            headQuarters: { type: "string", example: "Bangalore, India, 560102"},
            foundedYear: { type: "number", example: 2016},
            description: { type: "string", example: "Description for the company."},
        }
    }
}

class CreateCompanyResponse {
    static schema: SchemaObject = {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "Company created and linked successfully",
            },
            company: {
                type: "object",
                example: {
                    id: "xyz-123",
                    name: "XYZ Company",
                    address: "123 Main St, Springfield"
                },
            },
            recruiter: {
                type: "object",
                properties: {
                    id: { type: "string", example: "d3rhr32-234gbef2-23brewr-12ndf8" },
                    name: { type: "string", example: "John Doe" },
                    email: { type: "string", format: "email", example: "johndoe@gmail.com" }
                }
            }
        }
    }
}

Documentation.addSchema()(CreateCompanyRequest)
Documentation.addSchema()(CreateCompanyResponse)

Documentation.addRoute({
    path: "/companies/",
    method: Methods.post,
    tags: ["Company - Recruiter"],
    summary: "Register a new company to create jobs",
    requestBody: CreateCompanyRequest.schema,
    requestBodyDescription: "Add company payload",
    responses: {
        "201": {
            description: "Company created and linked successfully",
            value: CreateCompanyResponse.schema,
        },
        "400": {
            description: "Validation error (bad input)",
            value: { type: "object", properties: { message: { type: "string", example: "Invalid input" }, error: { type: "string", example: "Invalid company name or missing fields" } } },
        },
        "401": {
            description: "Unauthorized (no recruiter ID)",
            value: { type: "object", properties: { message: { type: "string", example: "Unauthorized" }, error: { type: "string", example: "Missing user ID in request" } } },
        },
        "500": {
            description: "Server error",
            value: { type: "object", properties: { message: { type: "string", example: "Error creating company" }, error: { type: "string", example: "Some internal Prisma or server error message" } } },
        },
    },
})();

router.post('/', async (req: Request, res: Response) => {
    const response = companyBody.safeParse(req.body);
    if (!response.success) {
        return res.status(400).json({
            message: 'Invalid input',
            errors: response.error
        });
    }

    const recruiterId = req.user?.userId;
    if (!recruiterId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const companyData = response.data;

    try {
        const company = await prisma.company.create({
            data: companyData,
        });

        const companyRecruiter = await prisma.recruiterCompany.create({
          data: {
            companyId: company.id,
            recruiterId: recruiterId,
            isCurrent: true
          }
        })

        res.status(201).json({
            message: 'Company created and linked successfully',
            company,
            recruiter: companyRecruiter,
        });
    } catch(err) {
        console.error(err);
        return res.status(500).json({
            message: "Error creating company", 
            error: err instanceof Error ? err.message : "Unknown error",
        })
    }
})

class JoinCompanyRequest {
    static schema: SchemaObject = {
        type: "object",
        required: ["companyId"],
        properties: {
          companyId: { type: "string", example: "gsd623-wd28r7ef-235fs-28eggd8"}
        }
    }
}

class JoinCompanyResponse {
    static schema: SchemaObject = {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "Successfully joined company",
            },
            recruiter: {
                type: "object",
                properties: {
                  companyId: { type: "string", example: "d3rhr32-234gbef2-23brewr-12ndf8" },
                  recruiterId: { type: "string", example: "d3rhr32-234gbef2-23brewr-12ndf8" },
                  isCurrent: { type: "boolean", example: "true" }
                }
            }
        }
    }
}

Documentation.addSchema()(JoinCompanyRequest)
Documentation.addSchema()(JoinCompanyResponse)

Documentation.addRoute({
    path: "/companies/join",
    method: Methods.post,
    tags: ["Company - Recruiter"],
    summary: "Join a new company to create jobs for that company",
    requestBody: JoinCompanyRequest.schema,
    requestBodyDescription: "Join company payload",
    responses: {
        "201": {
          description: "Successfully joined company",
          value: {
            type: "object",
            properties: {
              message: { type: "string", example: "Successfully joined company" },
              recruiter: {
                type: "object",
                properties: {
                  id: { type: "string", example: "rec-comp-id-123" },
                  companyId: { type: "string", example: "company-id-xyz" },
                  recruiterId: { type: "string", example: "recruiter-id-abc" },
                  isCurrent: { type: "boolean", example: true },
                  createdAt: { type: "string", format: "date-time", example: "2025-09-27T12:00:00.000Z" },
                  updatedAt: { type: "string", format: "date-time", example: "2025-09-27T12:00:00.000Z" }
                }
              }
            }
          }
        },
        "400": {
          description: "Validation error (bad input)",
          value: { type: "object", properties: { message: { type: "string", example: "Invalid input" }, error: { type: "string", example: "Invalid company name or missing fields" } } },
        },
        "401": {
          description: "Unauthorized (no recruiter ID)",
          value: { type: "object", properties: { message: { type: "string", example: "Unauthorized" }, error: { type: "string", example: "Missing user ID in request" } } },
        },
        "404": {
          description: "Company Not Found",
          value: { type: "object", properties: { message: { type: "string", example: "Company not found" }, error: { type: "string", example: "Company not found" } } },
        },
        "500": {
          description: "Server error",
          value: { type: "object", properties: { message: { type: "string", example: "Error joining company" }, error: { type: "string", example: "Internal server error" } } },
        },
    },
})();

router.post('/join', async (req, res) => {
  const recruiterId = req.user?.userId;
  if(!recruiterId){
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { companyId } = req.body;

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const updatedRecruiterCompany = await prisma.recruiterCompany.create({
      data: {
        companyId: company.id,
        recruiterId: recruiterId,
        isCurrent: true
      }
    })

    res.status(200).json({
      message: 'Successfully joined company',
      recruiter: updatedRecruiterCompany,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
        message: "Error joining company", 
        error: err instanceof Error ? err.message : "Unknown error",
    })
  }
});



class MyCompaniesResponse {
  static schema: SchemaObject = {
      type: "object",
      properties: {
          message: {
              type: "string",
              example: "Company fetched successfully",
          },
          companies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid", example: "d3rhr32-234gbef2-23brewr-12ndf8" },
                name: { type: "string", example: "ACME Inc." },
                logoUrl: { type: "string", example: "https://example.com/logo.png" },
                website: { type: "string", example: "https://acme.com" },
                industry: { type: "string", example: "Technology" },
                companySize: { type: "string", example: "51-200" },
                headquarters: { type: "string", example: "New York, USA" },
                foundedYear: { type: "integer", example: 2010 },
                description: { type: "string", example: "We build rockets and cool stuff." },
                companyType: { type: "string", example: "Private" },

                companyRecruiters: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", example: "recruiterCompany-id-123" },
                      companyId: { type: "string", example: "company-id-456" },
                      recruiterId: { type: "string", example: "recruiter-id-789" },
                      isCurrent: { type: "boolean", example: true },
                      createdAt: { type: "string", format: "date-time", example: "2025-09-27T12:00:00Z" },
                      updatedAt: { type: "string", format: "date-time", example: "2025-09-27T12:10:00Z" },
                      recruiter: {
                        type: "object",
                        properties: {
                          id: { type: "string", example: "recruiter-id-789" },
                          userId: { type: "string", example: "user-id-abc" },
                          user: {
                            type: "object",
                            properties: {
                              id: { type: "string", example: "user-id-abc" },
                              email: { type: "string", format: "email", example: "jane@example.com" },
                              name: { type: "string", example: "Jane Doe" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
      }
  }
}

Documentation.addSchema()(MyCompaniesResponse)

Documentation.addRoute({
    path: "/companies/me",
    method: Methods.get,
    tags: ["Company - Recruiter"],
    summary: "Fetch companies linked to current recruiter",
    requestBody: MyCompaniesResponse.schema,
    requestBodyDescription: "companies by a recruiter payload",
    responses: {
        "201": {
          description: "Company fetched successfully",
          value: MyCompaniesResponse.schema
        },
        "401": {
          description: "Unauthorized (no recruiter ID)",
          value: { type: "object", properties: { message: { type: "string", example: "Unauthorized" }, error: { type: "string", example: "Missing user ID in request" } } },
        },
        "404": {
          description: "No associated company found",
          value: { type: "object", properties: { message: { type: "string", example: "No associated company found" }, error: { type: "string", example: "No companies linked to this recruiter" } } },
        },
        "500": {
          description: "Error fetching company",
          value: { type: "object", properties: { message: { type: "string", example: "Error fetching company" }, error: { type: "string", example: "Internal server error" } } },
        },
    },
})();

router.get('/me', async (req: Request, res: Response) => {
  const recruiterId = req.user?.userId;
  if(!recruiterId){
    return res.status(401).json({ message: "Unauthorized"})
  }
  
  try {
    const companyDetails = await prisma.company.findMany({
      where: {
        companyRecruiters: {
          some: {
            recruiterId: recruiterId
          }
        }
      },
      include: {
        companyRecruiters: {
          where: {
            recruiterId
          },
          include: {
            recruiter: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!companyDetails) {
      return res.status(404).json({ message: 'No associated company found' });
    }

    res.status(200).json({
      message: "Company fetched successfully",
      companies: companyDetails
    })
  } catch(err) {
    console.error(err);
    return res.status(500).json({
        message: "Error fetching company", 
        error: err instanceof Error ? err.message : "Unknown error",
    })
  }
})

const companyPutBody = zod.object({
  name: zod.string().optional(),
  logoUrl: zod.string().optional(),
  website: zod.string().optional(),
  industry: zod.string().optional(),
  companySize: zod.enum([
    'SELF_EMPLOYED',
    'SIZE_2_10',
    'SIZE_11_50',
    'SIZE_51_200',
    'SIZE_201_500',
    'SIZE_501_1000',
    'SIZE_1001_5000',
    'SIZE_5001_10000',
    'SIZE_10000_PLUS',
  ]).optional(),
  headquarters: zod.string().optional(),
  foundedYear: zod.number().optional(),
  description: zod.string().optional()
})

class EditCompanyRequest {
  static schema: SchemaObject = {
    type: "object",
    required: [],
    properties: {
      name: { type: "string", example: "XYZ Company"},
      logoUrl: { type: "string", example: "https://example.com/logo.png"},
      website: { type: "string", example: "https://www.example.com"},
      industry: { type: "string", example: "IT"},
      companySize: { type: "string", enum: ["SELF_EMPLOYED", "SIZE_2_10", "SIZE_11_50", "SIZE_51_200", "SIZE_201_500", "SIZE_501_1000", "SIZE_1001_5000", "SIZE_5001_10000", "SIZE_10000_PLUS"], example: "11-50"},
      headQuarters: { type: "string", example: "Bangalore, India, 560102"},
      foundedYear: { type: "number", example: 2016},
      description: { type: "string", example: "Description for the company."},
    }
  }
}

class EditCompanyResponse {
  static schema: SchemaObject = {
    type: "object",
    properties: {
        message: {
          type: "string",
          example: "Company updated successfully",
        },
        company: {
          type: "object",
          properties: {
            id: { type: "string", example: "d3rhr32-234gbef2-23brewr-12ndf8" },
            name: { type: "string", example: "New Company Name" },
            logoUrl: { type: "string", example: "https://example.com/logo.png" },
            website: { type: "string", example: "https://new-site.com" },
            industry: { type: "string", example: "Tech" },
            companySize: { type: "string", example: "SIZE_51_200" },
            headquarters: { type: "string", example: "New York" },
            foundedYear: { type: "integer", example: 2020 },
            description: { type: "string", example: "We build rockets" },
            companyType: { type: "string", example: "Private" },
          }
        }
    }
  }
}

Documentation.addSchema()(EditCompanyRequest)
Documentation.addSchema()(EditCompanyResponse)

Documentation.addRoute({
    path: "/companies/:companyId",
    method: Methods.put,
    tags: ["Company - Recruiter"],
    summary: "Edit an existing company",
    parameters: [
      {
        in: "path",
        name: "companyId",
        required: true,
        schema: { type: "string", example: "gsd623-wd28r7ef-235fs-28eggd8" },
      }
    ],
    requestBody: EditCompanyRequest.schema,
    responses: {
      "201": {
        description: "Company updated successfully",
        value: {
          type: "object",
          properties: {
            message: { type: "string", example: "Company updated successfully" },
            company: {
              type: "object",
              properties: {
                id: { type: "string", example: "company-id-123" },
                name: { type: "string", example: "Updated Company Name" },
              }
            }
          }
        }
      },
      "400": {
        description: "Validation error (bad input)",
        value: { type: "object", properties: { message: { type: "string", example: "Invalid input" }, error: { type: "string", example: "Zod validation error string" } } },
      },
      "401": {
        description: "Unauthorized",
        value: { type: "object", properties: { message: { type: "string", example: "Unauthorized" }, error: { type: "string", example: "Missing user ID" } } },
      },
      "500": {
        description: "Server error",
        value: { type: "object", properties: { message: { type: "string", example: "Error updating company" }, error: { type: "string", example: "Internal server error" } } },
      },
    },
})();

router.put('/:companyId', async (req: Request, res: Response) => {
  const response = companyPutBody.safeParse(req.body);

  if(!response.success){
    return res.status(400).json({
      message: "Incorrect inputs",
      error: response.error
    })
  }

  const companyId = req.params.companyId;
  const recruiterId = req.user?.userId;

  if (!recruiterId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: response.data,
    });

    return res.status(200).json({
      message: 'Company updated successfully',
      company: updatedCompany,
    });
  } catch(err) {
    console.error(err);
    return res.status(500).json({
        message: "Error updating company", 
        error: err instanceof Error ? err.message : "Unknown error",
    })
  }
})

export default router;