import '@/styles/globals.css';
import SupabaseProvider from '@/components/SupabaseProvider';
import NavBar from '@/components/NavBar';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <NavBar />
          <main className="p-4">{children}</main>
        </SupabaseProvider>
      </body>
    </html>
  );
}
