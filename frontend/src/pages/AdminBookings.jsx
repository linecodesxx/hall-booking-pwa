import { ChevronDown, ChevronRight, ClipboardList } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BookingList, ListSkeleton } from '../components';
import { BookingModal } from '../components/BookingModal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  useApproveBooking,
  useApproveGroup,
  useBookings,
  useCancelBooking,
  useMarkSeen,
  useRejectBooking,
  useRejectGroup,
  useUpdateBooking,
} from '../hooks/useBookings';
import { useHalls } from '../hooks/useHalls';

export function AdminBookings({ setNotice, user }) {
  const [status, setStatus] = useState('pending');
  const [comments, setComments] = useState({});
  const [groupComments, setGroupComments] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [confirmReject, setConfirmReject] = useState(null);
  const [confirmGroupReject, setConfirmGroupReject] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const toggleGroup = (groupId) =>
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  const { data: bookings = [], isLoading } = useBookings(status === 'pending' ? 'pending' : '');
  const { data: halls = [] } = useHalls();
  const markSeen = useMarkSeen();
  useEffect(() => {
    if (status === 'pending') markSeen.mutate();
  }, [status, markSeen.mutate]);

  const approveBooking = useApproveBooking();
  const rejectBooking = useRejectBooking();
  const approveGroup = useApproveGroup();
  const rejectGroup = useRejectGroup();
  const cancelBooking = useCancelBooking();
  const updateBooking = useUpdateBooking();
  const filtered = user ? bookings.filter((b) => b.user_id !== user.id) : bookings;

  const { grouped, ungrouped } = useMemo(() => {
    const map = {};
    const ungrouped = [];
    for (const b of filtered) {
      if (b.group_id) {
        if (!map[b.group_id]) map[b.group_id] = [];
        map[b.group_id].push(b);
      } else {
        ungrouped.push(b);
      }
    }
    return { grouped: Object.entries(map), ungrouped };
  }, [filtered]);

  const act = async (id, action) => {
    try {
      const mutation = action === 'approve' ? approveBooking : rejectBooking;
      await mutation.mutateAsync({ id, comment: comments[id] || '' });
      setNotice(action === 'approve' ? 'Заявка подтверждена.' : 'Заявка отклонена.');
    } catch (err) {
      setNotice({ text: err.message, type: 'error' });
    }
  };

  const actGroup = async (groupId, action) => {
    try {
      const mutation = action === 'approve' ? approveGroup : rejectGroup;
      const result = await mutation.mutateAsync({
        groupId,
        comment: groupComments[groupId] || '',
      });
      if (action === 'approve' && result.errors?.length) {
        const dates = result.errors.map((e) => e.date).join(', ');
        setNotice({
          text: `Подтверждено ${result.approved.length} из ${result.approved.length + result.errors.length}. Ошибки: ${dates}`,
          type: 'error',
        });
      } else {
        setNotice(action === 'approve' ? 'Группа подтверждена.' : 'Группа отклонена.');
      }
    } catch (err) {
      setNotice({ text: err.message, type: 'error' });
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelBooking.mutateAsync(id);
      setNotice('Заявка отменена.');
    } catch (err) {
      setNotice({ text: err.message, type: 'error' });
    }
    setConfirmCancelId(null);
    setSelectedBooking(null);
  };

  const handleUpdate = async (data) => {
    try {
      await updateBooking.mutateAsync(data);
      setNotice('Заявка обновлена.');
    } catch (err) {
      setNotice({ text: err.message, type: 'error' });
    }
    setSelectedBooking(null);
  };

  if (isLoading) return <ListSkeleton rows={4} />;
  return (
    <div className="admin-bookings-layout">
      <div className="segmented">
        <button
          className={status === 'pending' ? 'active' : ''}
          onClick={() => setStatus('pending')}
        >
          На рассмотрении
        </button>
        <button className={!status ? 'active' : ''} onClick={() => setStatus('')}>
          Все заявки
        </button>
      </div>

      {/* Grouped bookings — collapsible */}
      {grouped.map(([groupId, group]) => {
        const allPending = group.filter((b) => b.status === 'pending');
        const expanded = expandedGroups[groupId] ?? allPending.length > 1;
        if (!allPending.length && status === 'pending') return null;
        return (
          <section
            key={groupId}
            className="card"
            style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}
          >
            <div
              className="card-head"
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                background: 'var(--bg-soft)',
                borderBottom: expanded ? '1px solid var(--border)' : 'none',
                borderRadius: expanded ? '8px 8px 0 0' : '8px',
                userSelect: 'none',
              }}
              onClick={() => toggleGroup(groupId)}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <strong>{group[0].title}</strong>
                    {group[0].user_name && (
                      <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
                        {group[0].user_name}
                      </span>
                    )}
                    <span
                      style={{
                        color: 'var(--muted)',
                        marginLeft: 8,
                        fontSize: 13,
                      }}
                    >
                      — {group.length} броней
                    </span>
                  </span>
                </div>
                {allPending.length === group.length && (
                  <div
                    style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      placeholder="Комментарий..."
                      value={groupComments[groupId] || ''}
                      onChange={(e) =>
                        setGroupComments((prev) => ({
                          ...prev,
                          [groupId]: e.target.value,
                        }))
                      }
                      style={{
                        maxWidth: 160,
                        fontSize: 13,
                        padding: '4px 8px',
                      }}
                    />
                    <button
                      className="primary"
                      style={{ fontSize: 13, padding: '4px 10px' }}
                      onClick={() => actGroup(groupId, 'approve')}
                    >
                      Подтвердить всё
                    </button>
                    <button
                      className="secondary danger"
                      style={{ fontSize: 13, padding: '4px 10px' }}
                      onClick={() => setConfirmGroupReject(groupId)}
                    >
                      Отклонить всё
                    </button>
                  </div>
                )}
              </div>
            </div>
            {expanded && (
              <BookingList
                bookings={group}
                adminActions={(booking) =>
                  booking.status === 'pending' ? (
                    <div className="admin-actions">
                      <label>
                        Комментарий администратора
                        <textarea
                          value={comments[booking.id] || ''}
                          onChange={(e) =>
                            setComments((prev) => ({
                              ...prev,
                              [booking.id]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="two-cols">
                        <button className="primary" onClick={() => act(booking.id, 'approve')}>
                          Подтвердить
                        </button>
                        <button
                          className="secondary danger"
                          onClick={() => setConfirmReject(booking.id)}
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ) : booking.status === 'approved' ? (
                    <div className="two-cols" style={{ marginTop: 8 }}>
                      <button className="secondary" onClick={() => setSelectedBooking(booking)}>
                        Инфо
                      </button>
                      <button
                        className="secondary danger"
                        onClick={() => setConfirmCancelId(booking.id)}
                      >
                        Отменить
                      </button>
                    </div>
                  ) : booking.status === 'rejected' ? (
                    <button
                      className="secondary"
                      style={{ marginTop: 8 }}
                      onClick={() => setSelectedBooking(booking)}
                    >
                      Редактировать
                    </button>
                  ) : null
                }
              />
            )}
          </section>
        );
      })}

      {/* Ungrouped bookings */}
      {ungrouped.length > 0 && (
        <BookingList
          bookings={ungrouped}
          adminActions={(booking) =>
            booking.status === 'pending' ? (
              <div className="admin-actions">
                <label>
                  Комментарий администратора
                  <textarea
                    value={comments[booking.id] || ''}
                    onChange={(e) =>
                      setComments((prev) => ({
                        ...prev,
                        [booking.id]: e.target.value,
                      }))
                    }
                  />
                </label>
                <div className="two-cols">
                  <button className="primary" onClick={() => act(booking.id, 'approve')}>
                    Подтвердить
                  </button>
                  <button className="secondary danger" onClick={() => setConfirmReject(booking.id)}>
                    Отклонить
                  </button>
                </div>
              </div>
            ) : booking.status === 'approved' ? (
              <div className="two-cols" style={{ marginTop: 8 }}>
                <button className="secondary" onClick={() => setSelectedBooking(booking)}>
                  Инфо
                </button>
                <button className="secondary danger" onClick={() => setConfirmCancelId(booking.id)}>
                  Отменить
                </button>
              </div>
            ) : booking.status === 'rejected' ? (
              <button
                className="secondary"
                style={{ marginTop: 8 }}
                onClick={() => setSelectedBooking(booking)}
              >
                Редактировать
              </button>
            ) : null
          }
        />
      )}

      {grouped.length === 0 && ungrouped.length === 0 && (
        <article className="card empty">
          <ClipboardList size={40} strokeWidth={1.5} />
          Заявок пока нет
        </article>
      )}

      {confirmReject && (
        <ConfirmModal
          title="Отклонить заявку"
          message="Вы уверены, что хотите отклонить эту заявку?"
          confirmLabel="Отклонить"
          danger
          onConfirm={() => {
            const id = confirmReject;
            setConfirmReject(null);
            act(id, 'reject');
          }}
          onCancel={() => setConfirmReject(null)}
        />
      )}
      {confirmGroupReject && (
        <ConfirmModal
          title="Отклонить группу заявок"
          message="Вы уверены, что хотите отклонить все заявки в этой группе?"
          confirmLabel="Отклонить всё"
          danger
          onConfirm={() => {
            const groupId = confirmGroupReject;
            setConfirmGroupReject(null);
            actGroup(groupId, 'reject');
          }}
          onCancel={() => setConfirmGroupReject(null)}
        />
      )}
      {confirmCancelId && (
        <ConfirmModal
          title="Отменить бронь"
          message="Вы уверены, что хотите отменить эту бронь?"
          confirmLabel="Отменить"
          danger
          onConfirm={() => handleCancel(confirmCancelId)}
          onCancel={() => setConfirmCancelId(null)}
        />
      )}
      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          user={user}
          onCancel={handleCancel}
          onUpdate={handleUpdate}
          halls={halls}
        />
      )}
    </div>
  );
}
