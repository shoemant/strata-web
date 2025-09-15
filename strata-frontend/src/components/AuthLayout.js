// src/components/AuthLayout.js
import Image from 'next/image';

export default function AuthLayout({ children }) {
    return (
        /* Pin the whole layout to the viewport with fixed positioning            */
        <div className="fixed inset-0 flex overflow-hidden">
            {/* ---------- Left column ------------------------------------------- */}
            <div className="basis-3/5 bg-accent relative overflow-hidden">
                {/* cover > contain so the accent colour reaches every edge            */}
                <Image
                    src="/images/apartment.svg"
                    alt="Apartment illustration"
                    fill             /* next/image → position:absolute; inset:0 */
                    priority
                    className="object-cover"
                />
            </div>

            {/* ---------- Right column ------------------------------------------ */}
            <div
                className="basis-2/5 flex items-center justify-center bg-background overflow-hidden"
            >
                {/* Wrap children in a max-width container to prevent stretching */}
                <div className="w-full max-w-lg px-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
