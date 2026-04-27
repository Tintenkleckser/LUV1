import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/',
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/assessment/:path*', '/results/:path*', '/chat/:path*', '/profile/:path*'],
};
