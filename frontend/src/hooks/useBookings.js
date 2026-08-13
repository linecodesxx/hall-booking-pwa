import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { todayISO } from '../utils';

let tempIdCounter = 0;
const tempId = () => `optimistic-${++tempIdCounter}`;

function updateBookingsCache(qc, id, updates) {
  const queries = qc.getQueriesData({ queryKey: ['bookings'] });
  for (const [key, data] of queries) {
    if (!Array.isArray(data)) continue;
    qc.setQueryData(key, (old) => old?.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }
}

function updateScheduleCache(qc, id, updates) {
  const queries = qc.getQueriesData({ queryKey: ['schedule'] });
  for (const [key, _data] of queries) {
    qc.setQueryData(key, (old) => {
      if (Array.isArray(old) && old.length && old[0]?.id !== undefined)
        return old.map((hall) => ({
          ...hall,
          bookings: (hall.bookings || []).map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }));
      if (Array.isArray(old) && old.length && old[0]?.date !== undefined)
        return old.map((item) => ({
          ...item,
          halls: (item.halls || []).map((hall) => ({
            ...hall,
            bookings: (hall.bookings || []).map((b) => (b.id === id ? { ...b, ...updates } : b)),
          })),
        }));
      return old;
    });
  }
}

export function useBookings(status, options = {}) {
  return useQuery({
    queryKey: ['bookings', status || 'all'],
    queryFn: () =>
      api(`/api/bookings${status ? `?status=${status}` : ''}`).then((d) => d.bookings || []),
    ...options,
  });
}

export function useUnreadCount(options = {}) {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api('/api/bookings?status=pending').then((d) => d.unread_count || 0),
    ...options,
  });
}

export function useMarkSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/api/bookings/mark-seen', { method: 'PATCH', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useCreateBooking(role) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (booking) =>
      api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(booking),
      }),
    onMutate: async (booking) => {
      const date = booking.date || todayISO();
      await qc.cancelQueries({ queryKey: ['schedule', date] });
      const prev = qc.getQueryData(['schedule', date]);
      qc.setQueryData(['schedule', date], (old) => {
        if (!old?.length) return old;
        return old.map((hall) => {
          if (hall.id !== Number(booking.hall_id)) return hall;
          return {
            ...hall,
            bookings: [
              ...(hall.bookings || []),
              {
                id: tempId(),
                hall_id: Number(booking.hall_id),
                date,
                start_time: booking.start_time,
                end_time: booking.end_time,
                title: booking.title,
                comment: booking.comment,
                status: role === 'admin' ? 'approved' : 'pending',
                user_id: 0,
                user_name: '',
              },
            ],
          };
        });
      });
      return { prev, date };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev && context?.date) qc.setQueryData(['schedule', context.date], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useCreateBookingBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookings) =>
      api('/api/bookings/batch', {
        method: 'POST',
        body: JSON.stringify({ bookings }),
      }),
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(context.key, context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      api(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onMutate: async ({ id, ...data }) => {
      await qc.cancelQueries({ queryKey: ['bookings'] });
      await qc.cancelQueries({ queryKey: ['schedule'] });
      const queries = qc.getQueriesData({ queryKey: ['bookings'] });
      const prev = Object.fromEntries(queries);
      updateBookingsCache(qc, id, data);
      updateScheduleCache(qc, id, data);
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev)
        for (const [key, data] of Object.entries(context.prev)) qc.setQueryData(key, data);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      api(`/api/bookings/${id}/cancel`, {
        method: 'PATCH',
        body: '{}',
      }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['bookings'] });
      await qc.cancelQueries({ queryKey: ['schedule'] });
      const queries = qc.getQueriesData({ queryKey: ['bookings'] });
      const prev = Object.fromEntries(queries);
      updateBookingsCache(qc, id, { status: 'cancelled' });
      updateScheduleCache(qc, id, { status: 'cancelled' });
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev)
        for (const [key, data] of Object.entries(context.prev)) qc.setQueryData(key, data);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useApproveBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }) =>
      api(`/api/bookings/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_comment: comment || '' }),
      }),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['bookings'] });
      await qc.cancelQueries({ queryKey: ['schedule'] });
      const queries = qc.getQueriesData({ queryKey: ['bookings'] });
      const prev = Object.fromEntries(queries);
      updateBookingsCache(qc, id, { status: 'approved' });
      updateScheduleCache(qc, id, { status: 'approved' });
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev)
        for (const [key, data] of Object.entries(context.prev)) qc.setQueryData(key, data);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useApproveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, comment }) =>
      api(`/api/bookings/group/${groupId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_comment: comment || '' }),
      }),
    onMutate: async ({ groupId }) => {
      await qc.cancelQueries({ queryKey: ['bookings'] });
      await qc.cancelQueries({ queryKey: ['schedule'] });
      const queries = qc.getQueriesData({ queryKey: ['bookings'] });
      const prev = Object.fromEntries(queries);
      for (const [key, data] of queries) {
        if (!Array.isArray(data)) continue;
        qc.setQueryData(key, (old) =>
          old?.map((b) =>
            b.group_id === groupId && b.status === 'pending' ? { ...b, status: 'approved' } : b,
          ),
        );
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev)
        for (const [key, data] of Object.entries(context.prev)) qc.setQueryData(key, data);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useRejectGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, comment }) =>
      api(`/api/bookings/group/${groupId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_comment: comment || '' }),
      }),
    onMutate: async ({ groupId }) => {
      await qc.cancelQueries({ queryKey: ['bookings'] });
      await qc.cancelQueries({ queryKey: ['schedule'] });
      const queries = qc.getQueriesData({ queryKey: ['bookings'] });
      const prev = Object.fromEntries(queries);
      for (const [key, data] of queries) {
        if (!Array.isArray(data)) continue;
        qc.setQueryData(key, (old) =>
          old?.map((b) =>
            b.group_id === groupId && b.status === 'pending' ? { ...b, status: 'rejected' } : b,
          ),
        );
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev)
        for (const [key, data] of Object.entries(context.prev)) qc.setQueryData(key, data);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useRejectBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }) =>
      api(`/api/bookings/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_comment: comment || '' }),
      }),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['bookings'] });
      await qc.cancelQueries({ queryKey: ['schedule'] });
      const queries = qc.getQueriesData({ queryKey: ['bookings'] });
      const prev = Object.fromEntries(queries);
      updateBookingsCache(qc, id, { status: 'rejected' });
      updateScheduleCache(qc, id, { status: 'rejected' });
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev)
        for (const [key, data] of Object.entries(context.prev)) qc.setQueryData(key, data);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}
