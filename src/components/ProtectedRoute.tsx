import { Navigate, useLocation } from 'react-router-dom';
import { getUser } from '@/lib/data';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    try {
        const user = getUser();
        if (!user) {
            // Redirect to login, but save the attempted location
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
        return <>{children}</>;
    } catch {
        // No user logged in
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
}
