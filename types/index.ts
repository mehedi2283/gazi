export type Campaign = {
  id: string
  organization_id: string
  name: string
  status: string
}

export type Lead = {
  id: string
  email: string
  first_name?: string
  last_name?: string
}
