import express, { Request, Response } from 'express';
import roleMiddleware from '../../middleware/roleMiddleware';
const router = express.Router();
import zod from 'zod';
import { CompanySize } from '../../generated/prisma';
import { PrismaClient } from '../../generated/prisma';
const prisma = new PrismaClient();

router.use(roleMiddleware('RECRUITER'))

const companyBody = zod.object({
    name: zod.string(),
    logoUrl: zod.string(),
    website: zod.string(),
    industry: zod.string(),
    companySize: zod.enum(CompanySize),
    headquarters: zod.string(),
    foundedYear: zod.number(),
    description: zod.string()
})

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

router.put('/:id', async (req: Request, res: Response) => {
  const response = companyPutBody.safeParse(req.body);

  if(!response.success){
    return res.status(400).json({
      message: "Incorrect inputs",
      error: response.error
    })
  }

  const companyId = req.params.id;
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