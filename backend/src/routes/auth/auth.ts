import express, { Request, Response } from 'express';
const router  = express.Router();
import zod, { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '../../generated/prisma';
import authMiddleware from '../../middleware/authMiddleware';
const prisma = new PrismaClient();

const signupBody = zod.object({
    name: zod.string(),
    email: zod.email(),
    role: z.enum([Role.APPLICANT, Role.RECRUITER]),
    password: zod.string().min(8),
    confirmPassword: zod.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});

router.post('/signup', async (req: Request, res: Response) => {
    const response = signupBody.safeParse(req.body)

    if(!response.success){
        res.status(400).json({
            message: "Incorrect inputs",
            errors: response.error,
        })
        return;
    }

    const { name, email, password, role } = response.data;

    try {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    {email: email}
                ]
            }
        }) 

        if(existingUser){
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role
            }
        })

        const JWT_SECRET = process.env.JWT_SECRET;
        if(!JWT_SECRET){
            throw new Error("JWT_SECRET not defined")
        }

        const token = jwt.sign({userId: user.id, role: role}, JWT_SECRET, {expiresIn: "2d"})

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 2, // 2 days
            sameSite: "none",
            secure: true
        })

        res.status(201).json({
            message: "User created successfully",
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
            }
        })
    } catch (err) {
        res.status(500).json({
            message: "Error creating user",
            error: err instanceof Error ? err.message : "Unknown error",
        })
    }
})

const signinBody = zod.object({
    email: zod.email(),
    password: zod.string().min(8)
})

router.post('/signin', async (req: Request, res: Response) => {
    const response = signinBody.safeParse(req.body)

    if(!response.success){
        res.status(400).json({
            message: "Incorrect inputs",
            errors: response.error,
        })
        return;
    }

    const { email, password } = response.data;

    try {
        const user = await prisma.user.findFirst({
            where: {
                email: email
            }
        })

        if(!user){
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if(!isPasswordValid){
            return res.status(401).json({
                message: "Incorrect password"
            })
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        if(!JWT_SECRET){
            throw new Error("JWT_SECRET not defined")
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        const token = jwt.sign({userId: user.id, role: user.role}, JWT_SECRET, {expiresIn: "2d"})

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 2, // 2 days
            sameSite: "none",
            secure: true
        })

        res.status(200).json({
            message: "User signed in successfully",
            data: {
                name: user.name,
                email: user.email,
            }
        })

    } catch(err) {
        return res.status(500).json({
            message: "Error signing user", 
            error: err instanceof Error ? err.message : "Unknown error",
        })
    }
})

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: "1"
            }
        })

        res.status(200).json({
            message: "User fetched successfully",
            user
        })
    } catch(err) {
        return res.status(500).json({
            message: "Error signing user",
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
})

router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        secure: false
    })

    res.status(200).json({
        message: "Logged out"
    })
})

export default router;