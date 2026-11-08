import { cache } from "react";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

// Deduplicate session reads within a render, without caching across users or requests.
export const getSession = cache(() => getServerSession(authOptions));
