import express, { Request, Response } from 'express';
const router  = express.Router();
import zod, { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from "@prisma/client"
import authMiddleware from '../../middleware/authMiddleware';
import { Documentation, Methods, SchemaObject } from '../../docs/documentation';
import rateLimit from 'express-rate-limit';
const prisma = new PrismaClient();

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 40,
    message: 'Too many login/signup attempts. Try again in 10 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

router.use(loginLimiter);

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

class SignupRequest {
    static schema: SchemaObject = {
        type: "object",
        required: ["email", "name", "role", "password"],
        properties: {
            name: { type: "string", example: "John Doe"},
            email: { type: "string",format: "email", example: "johndoe@gmail.com"},
            role: { type: "string", enum: ["APPLICANT", "RECRUITER"], example: "APPLICANT"},
            password: { type: "string", format: "password", example: "secret1234"},
            confirmPassword: { type: "string", format: "password", example: "secret1234"},
        }
    }
}

class SignupResponse {
    static schema: SchemaObject = {
        type: "object",
        properties: {
            message: { type: "string", example: "User created successfully" },
            data: {
                type: "object",
                properties: {
                    id: { type: "string", example: "d3rhr32-234gbef2-23brewr-12ndf8"},
                    name: { type: "string", example: "John Doe"},
                    email: { type: "string",format: "email", example: "johndoe@gmail.com"}
                }
            }
        }
    }
}

Documentation.addSchema()(SignupRequest)
Documentation.addSchema()(SignupResponse)

Documentation.addRoute({
    path: "/signup",
    method: Methods.post,
    tags: ["Auth"],
    summary: "Register a new user",
    requestBody: SignupRequest.schema,
    requestBodyDescription: "User signup payload",
    responses: {
        "201": {
            description: "User created successfully",
            value: SignupResponse.schema,
        },
        "400": {
            description: "Validation error (bad input)",
            value: { type: "object", properties: { message: { type: "string" } } },
        },
        "409": {
            description: "Email already exists",
            value: { type: "object", properties: { message: { type: "string" } } },
        },
        "500": {
            description: "Server error",
            value: { type: "object", properties: { message: { type: "string" }, error: { type: "string" } } },
        },
    },
})();

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

class SigninRequest {
    static schema: SchemaObject = {
        type: "object",
        required: ["email", "password"],
        properties: {
            email: { type: "string",format: "email", example: "johndoe@gmail.com"},
            password: { type: "string", format: "password", example: "secret1234"},
        }
    }
}

class SigninResponse {
    static schema: SchemaObject = {
        type: "object",
        properties: {
            message: { type: "string", example: "User created successfully" },
            data: {
                type: "object",
                properties: {
                    id: { type: "string", example: "d3rhr32-234gbef2-23brewr-12ndf8"},
                    name: { type: "string", example: "John Doe"},
                    email: { type: "string",format: "email", example: "johndoe@gmail.com"}
                }
            }
        }
    }
}

Documentation.addSchema()(SigninRequest)
Documentation.addSchema()(SigninResponse)

Documentation.addRoute({
    path: "/signin",
    method: Methods.post,
    tags: ["Auth"],
    summary: "Login a user",
    requestBody: SigninRequest.schema,
    requestBodyDescription: "User signin payload",
    responses: {
        "201": {
            description: "User created successfully",
            value: SigninResponse.schema,
        },
        "400": {
            description: "Validation error (bad input)",
            value: { type: "object", properties: { message: { type: "string" } } },
        },
        "500": {
            description: "Server error",
            value: { type: "object", properties: { message: { type: "string" }, error: { type: "string" } } },
        },
    },
})();

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

class GetProfileResponse {
    static schema: SchemaObject = {
        type: "object",
        properties: {
            message: { type: "string", example: "User fetched successfully" },
            user: {
                type: "object",
                properties: {
                    id: { type: "string", example: "d3rhr32-234gbef2-23brewr-12ndf8"},
                    name: { type: "string", example: "John Doe"},
                    email: { type: "string",format: "email", example: "johndoe@gmail.com"},
                    createdAt: { type: "string",  example: "date here"}
                }
            }
        }
    }
}

Documentation.addRoute({
    path: "/auth/me",
    method: Methods.get,
    tags: ["Auth"],
    summary: "Get your profile",
    requestBody: GetProfileResponse.schema,
    requestBodyDescription: "User profile payload",
    responses: {
        "200": {
            description: "User fetched successfully",
            value: SigninResponse.schema,
        },
        "500": {
            description: "Server error",
            value: { type: "object", properties: { message: { type: "string", example: "Error fetching user profile" }, error: { type: "string", example: "Internal server error" } } },
        },
    },
})();

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user?.userId
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
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

Documentation.addRoute({
    path: "/auth/logout",
    method: Methods.post,
    tags: ["Auth"],
    summary: "User logout",
    requestBody: GetProfileResponse.schema,
    requestBodyDescription: "User logout payload",
    responses: {
        "200": {
            description: "User logout successfully",
            value: {}
        },
        "500": {
            description: "Server error",
            value: { type: "object", properties: { message: { type: "string", example: "Error logging out user" }, error: { type: "string", example: "Internal server error" } } },
        },
    },
})();

router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        secure: false
    })

    res.status(200).json({
        message: "User logout successfully"
    })
})

export default router;