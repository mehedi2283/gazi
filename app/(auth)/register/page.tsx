import React from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 main-bg">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">Create account</h2>
        <form className="space-y-4">
          <input placeholder="Full name" className="w-full px-3 py-2 border rounded" />
          <input placeholder="Email" className="w-full px-3 py-2 border rounded" />
          <input placeholder="Password" type="password" className="w-full px-3 py-2 border rounded" />
          <button className="w-full bg-indigo-600 text-white py-2 rounded">Register</button>
        </form>
        <p className="mt-4 text-sm">Already have an account? <Link href="/auth/login" className="text-indigo-600">Sign in</Link></p>
      </div>
    </div>
  )
}
