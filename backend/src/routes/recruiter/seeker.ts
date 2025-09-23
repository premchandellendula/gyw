import express, { Request, Response } from 'express';
import roleMiddleware from '../../middleware/roleMiddleware';
const router = express.Router();
import { PrismaClient } from '../../generated/prisma';
const prisma = new PrismaClient();

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
      }
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