import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import logger from "../utils/logger";

function authMiddleware(req: Request, res: Response, next: NextFunction){    
    try {
        const token = req.cookies.token
    
        if(!token){
            logger.warn(`Unauthorized access attempt: No token provided - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
            return res.status(401).json({
                message: 'Unauthorized: No token provided' 
            })
        }
        const JWT_SECRET = process.env.JWT_SECRET;
        if(!JWT_SECRET){
            throw new Error("JWT_SECRET not defined")
        }
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        if (decoded?.userId) {
            req.user = {
                userId: decoded.userId,
                role: decoded.role,
            };
            next();
        }else{
            logger.warn(`Unauthorized access attempt: Invalid token payload - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
            res.status(401).json({
                message: "Invalid token payload"
            })
            return;
        }
    } catch(err) {
        logger.warn(`Unauthorized access attempt: Invalid token - ${req.method} ${req.originalUrl} - IP: ${req.ip} - Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return res.status(401).json({
            message: 'Unauthorized: Invalid token',
            error: err instanceof Error ? err.message : "Unknown error"
        })
    }
}

export default authMiddleware;