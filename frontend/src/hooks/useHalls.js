import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useHalls() {
  return useQuery({
    queryKey: ['halls'],
    queryFn: () => api('/api/halls').then((d) => d.halls || []),
  });
}

export function useCreateHall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hall) =>
      api('/api/halls', {
        method: 'POST',
        body: JSON.stringify(hall),
      }),
    onMutate: async (hall) => {
      await qc.cancelQueries({ queryKey: ['halls'] });
      await qc.cancelQueries({ queryKey: ['schedule'] });
      const prev = qc.getQueryData(['halls']);
      qc.setQueryData(['halls'], (old) => [
        ...(old || []),
        {
          id: `optimistic-${Date.now()}`,
          name: hall.name,
          description: hall.description || '',
          active: 1,
        },
      ]);
      return { prev };
    },
    onError: (_err, _hall, context) => {
      if (context?.prev) qc.setQueryData(['halls'], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['halls'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useDeactivateHall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/api/halls/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['halls'] });
      await qc.cancelQueries({ queryKey: ['schedule'] });
      const prev = qc.getQueryData(['halls']);
      qc.setQueryData(['halls'], (old) => (old || []).filter((h) => h.id !== id));
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(['halls'], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['halls'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}
