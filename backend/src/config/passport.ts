import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { UserPayload } from "types/types";
import { PrismaClient, Role } from "@prisma/client";
const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:8000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile: Profile, done) => {
        try {
            const email = profile.emails?.[0].value;
            const googleId = profile.id;

            let user = await prisma.user.findUnique({ where: { googleId } });

            if (!user && email) {
                user = await prisma.user.findUnique({ where: { email } });

                if (user) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { googleId },
                    });
                }
            }
            if (!user) {
                user = await prisma.user.create({
                    data: {
                        googleId,
                        email: email!,
                        name: profile.displayName,
                        profilePicture: profile.photos?.[0].value || undefined,
                        role: Role.APPLICANT,
                        isActive: true,
                        lastLogin: new Date(),
                    },
                });
            }

            const userPayload: UserPayload = {
                userId: user.id,
                role: user.role,
                googleId: user.googleId ?? undefined,
                email: user.email,
                name: user.name,
                avatar: user.profilePicture,
            };

            return done(null, userPayload);
        } catch (err) {
            return done(err as any, undefined);
        }
    }
))

passport.serializeUser((user: UserPayload, done) => {
    done(null, user);
});

passport.deserializeUser((user: UserPayload, done) => {
    done(null, user);
});