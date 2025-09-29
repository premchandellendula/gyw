import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';

function roleMiddleware(role: Role){
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.cookies.token;

            if (!token) {
                return res.status(401).json({ 
                    message: 'Unauthorized: No token provided' 
                });
            }

            const JWT_SECRET = process.env.JWT_SECRET;
            if(!JWT_SECRET){
                throw new Error("JWT_SECRET not defined")
            }

            const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload

            if (decoded.role !== role) {
                return res.status(403).json({ 
                    message: 'Forbidden: Insufficient role' 
                });
            }

            req.user = {
                userId: decoded.userId,
                role: decoded.role
            }
            next();
        } catch(err) {
            return res.status(401).json({
                message: 'Unauthorized: Invalid token',
                error: err instanceof Error ? err.message : "Unknown error"
            })
        }
    }
}

export default roleMiddleware;