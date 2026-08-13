import { CalendarDays, ClipboardList, DoorOpen, Home, Plus, Users } from 'lucide-react';
import { useUnreadCount } from '../hooks/useBookings';

export function BottomNav({ user, route, go }) {
  const { data: unreadCount = 0 } = useUnreadCount({
    enabled: user.role === 'admin',
  });
  const items =
    user.role === 'admin'
      ? [
          ['/today', Home, 'Главная'],
          ['/schedule', CalendarDays, 'Расписание'],
          ['/new-booking', Plus, 'Новая'],
          ['/admin/bookings', ClipboardList, 'Все брони', unreadCount],
          ['/admin/halls', DoorOpen, 'Помещения'],
          ['/admin/users', Users, 'Пользователи'],
        ]
      : [
          ['/today', Home, 'Главная'],
          ['/schedule', CalendarDays, 'Расписание'],
          ['/new-booking', Plus, 'Новая'],
          ['/my-bookings', ClipboardList, 'Мои заявки'],
        ];
  return (
    <nav className="bottom-nav">
      {items.map(([path, Icon, label, badge]) => (
        <button
          key={path}
          className={route.startsWith(path) ? 'active' : ''}
          onClick={() => go(path)}
        >
          <Icon size={20} />
          <span>{label}</span>
          {badge > 0 && <span className="nav-badge">{badge}</span>}
        </button>
      ))}
    </nav>
  );
}
