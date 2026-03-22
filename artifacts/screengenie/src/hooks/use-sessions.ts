import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useSession(sessionId: number) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetch(`/api/sessions/${sessionId}`).then(r => r.json()),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      if (query.state.data?.session?.status === 'completed') return false;
      return 5000;
    }
  });
}

export function useEndSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      fetch(`/api/sessions/${id}/end`, { method: 'POST' }).then(r => r.json()),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session', variables.id] });
    }
  });
}

export function useCreateSessionMutation() {
  return useMutation({
    mutationFn: (body: { interviewId: number; candidateName: string }) =>
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json())
  });
}
