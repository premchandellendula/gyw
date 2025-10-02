import { UserPayload } from "types/types";
import { Role } from "../../generated/prisma";

declare global {
    namespace Express {
        interface User extends UserPayload {}
    }
}

export {};