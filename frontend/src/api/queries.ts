import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
  Bounds,
  CaseRow,
  Category,
  NearbyReport,
  NewReport,
  PublicStats,
  ReportDetail,
  ReportSummary,
  Status,
  VoteKind,
} from './types'

export function useReportsInArea(
  bounds: Bounds | null,
  category: Category | '',
  includeClosed: boolean,
) {
  return useQuery({
    queryKey: ['reports', bounds, category, includeClosed],
    enabled: bounds !== null,
    // Keep showing the old markers while the map is panned, instead of flashing empty.
    placeholderData: keepPreviousData,
    queryFn: () => {
      const b = bounds!
      const params = new URLSearchParams({
        minLat: b.minLat.toFixed(5),
        minLng: b.minLng.toFixed(5),
        maxLat: b.maxLat.toFixed(5),
        maxLng: b.maxLng.toFixed(5),
        includeClosed: String(includeClosed),
      })
      if (category) params.set('category', category)
      return api<ReportSummary[]>(`/reports?${params}`)
    },
  })
}

export function useNearby(lat: number, lng: number, category: Category | '') {
  return useQuery({
    queryKey: ['nearby', lat.toFixed(5), lng.toFixed(5), category],
    enabled: category !== '',
    queryFn: () =>
      api<NearbyReport[]>(`/reports/nearby?lat=${lat}&lng=${lng}&category=${category}`),
  })
}

export const useReport = (id: number) =>
  useQuery({ queryKey: ['report', id], queryFn: () => api<ReportDetail>(`/reports/${id}`) })

/** `enabled` is false for guests, so the page doesn't fire a request that can only get a 401. */
export const useMyReports = (enabled = true) =>
  useQuery({
    queryKey: ['reports', 'mine'],
    enabled,
    queryFn: () => api<ReportSummary[]>('/reports/mine'),
  })

export const useStats = () =>
  useQuery({ queryKey: ['stats'], queryFn: () => api<PublicStats>('/stats') })

export const useCases = (status: Status | '', overdueOnly: boolean, enabled = true) =>
  useQuery({
    queryKey: ['cases', status, overdueOnly],
    enabled,
    queryFn: () => {
      const params = new URLSearchParams({ overdueOnly: String(overdueOnly) })
      if (status) params.set('status', status)
      return api<CaseRow[]>(`/cases?${params}`)
    },
  })

export function useCreateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ report, photo }: { report: NewReport; photo: File | null }) => {
      const created = await api<ReportDetail>('/reports', { method: 'POST', body: report })
      if (photo) {
        const form = new FormData()
        form.append('photo', photo)
        await api<void>(`/reports/${created.id}/photo`, { method: 'POST', body: form })
      }
      return created
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  })
}

/** Mutations that return the updated report put it straight into the cache. */
function useReportMutation<TVars>(request: (vars: TVars) => Promise<ReportDetail>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (report) => {
      queryClient.setQueryData(['report', report.id], report)
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

export const useVote = (id: number) =>
  useReportMutation((kind: VoteKind | null) =>
    kind === null
      ? api<ReportDetail>(`/reports/${id}/vote`, { method: 'DELETE' })
      : api<ReportDetail>(`/reports/${id}/vote`, { method: 'PUT', body: { kind } }),
  )

export const useChangeStatus = (id: number) =>
  useReportMutation((change: { status: Status; note: string }) =>
    api<ReportDetail>(`/cases/${id}/status`, { method: 'POST', body: change }),
  )

export const useAssign = (id: number) =>
  useReportMutation((responsible: string) =>
    api<ReportDetail>(`/cases/${id}/responsible`, { method: 'PUT', body: { responsible } }),
  )
