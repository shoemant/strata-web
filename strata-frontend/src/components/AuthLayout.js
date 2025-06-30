import Image from 'next/image';

export default function AuthLayout({ children }) {
    return (
        <div className="flex min-h-screen overflow-hidden">
            {/* Static Left Section */}
            <div className="w-2/3 bg-accent flex items-center justify-center">
                <img
                    src="/images/apartment.svg"
                    alt="Apartment Rent"
                    className="w-full h-full object-contain p-12"
                />
            </div>


            {/* Right Content Area */}
            <div className="w-1/3 flex items-center justify-center bg-background transition-all duration-300">
                {children}
            </div>
        </div>
    );
}
