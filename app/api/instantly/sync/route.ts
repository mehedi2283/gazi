import { NextResponse } from 'next/server'
import { syncInstantly } from '@/lib/instantly/sync'

export async function POST() {
  const result = await syncInstantly()
  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  })
}