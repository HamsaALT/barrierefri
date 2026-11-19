export type Category =
  | 'BrokenElevator'
  | 'BlockedSidewalk'
  | 'MissingRamp'
  | 'SteepCurb'
  | 'MissingAudioSignal'
  | 'InaccessibleEntrance'
  | 'Other'

export type Status = 'Open' | 'InProgress' | 'Resolved' | 'Rejected'
export type VoteKind = 'StillThere' | 'Fixed'

export interface ReportSummary {
  id: number
  category: Category
  title: string
  latitude: number
  longitude: number
  locationHint: string | null
  status: Status
  reportedAt: string
  confidence: number
  likelyFixed: boolean
  hasPhoto: boolean
}

export interface HistoryEntry {
  from: Status
  to: Status
  note: string | null
  changedAt: string
}

export interface ReportDetail extends ReportSummary {
  description: string | null
  responsible: string | null
  dueAt: string
  resolvedAt: string | null
  isOverdue: boolean
  stillThereCount: number
  fixedCount: number
  isMine: boolean
  myVote: VoteKind | null
  history: HistoryEntry[]
}

export interface NearbyReport {
  id: number
  category: Category
  title: string
  status: Status
  distanceMeters: number
}

export interface NewReport {
  category: Category
  title: string
  description: string
  latitude: number
  longitude: number
  locationHint: string
  ignoreNearby?: boolean
}

export interface CaseRow {
  id: number
  category: Category
  title: string
  locationHint: string | null
  status: Status
  responsible: string | null
  reportedAt: string
  dueAt: string
  isOverdue: boolean
  stillThereCount: number
  fixedCount: number
  confidence: number
  likelyFixed: boolean
}

export interface PublicStats {
  activeReports: number
  overdueReports: number
  resolvedLast90Days: number
  medianDaysToResolve: number | null
}

export interface Bounds {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

/** RFC 9457 problem body. Validation errors come keyed by field name. */
export interface Problem {
  title?: string
  detail?: string
  status?: number
  errors?: Record<string, string[]>
  nearby?: NearbyReport[]
  /** Stable, language-neutral name for the problem, e.g. "STATUS_TRANSITION_INVALID". */
  code?: string
  params?: Record<string, unknown>
}
