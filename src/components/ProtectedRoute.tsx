import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUser } from '@/lib/data';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        getUser()
            .then((u) => {
                if (isMounted) {
                    setUser(u);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });
        return () => { isMounted = false; };
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-scout-beige-light">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-green"></div>
            </div>
        );
    }

    if (!user) {
        // Redirect to login, but save the attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
