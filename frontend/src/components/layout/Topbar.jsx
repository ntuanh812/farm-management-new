import { useAuthStore } from '@/store/authStore';

export const Topbar = () => {
    const { user } = useAuthStore();

    return (
        <div className="topbar">
            <div className="topbar__user">
                <span className="topbar__user-name">Xin chào, {user?.full_name || user?.username || 'Khách'}</span>
                <span className="topbar__user-avatar">👤</span>
            </div>
        </div>
    )
}
