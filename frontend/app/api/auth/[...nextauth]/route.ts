import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    pages: {
        signIn: "/admin/upload", // Point back to upload if they need to sign in
    },
    callbacks: {
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.sub;
            }
            return session;
        },
        async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
            const adminBase = baseUrl.replace('/api/auth', ''); // e.g., http://localhost:3003/admin or http://localhost:3000/admin
            
            if (url.startsWith("/")) {
                return `${adminBase}${url.replace(/^\/admin/, '')}`;
            }
            if (url.startsWith(adminBase)) {
                return url;
            }
            return adminBase;
        }
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
