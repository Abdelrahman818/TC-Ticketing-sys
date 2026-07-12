'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES, apiRequest, getStoredUser } from '@/config';
import { AuthGuard } from '@/components/auth-guard';

function formatRole(role) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => getStoredUser());

  const loadUsers = async () => {
    try {
      const response = await apiRequest(`${API_ROUTES.users.list}?page=1&limit=100`);
      setUsers(response?.data?.items || []);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'owner') {
      router.replace('/');
      return;
    }

    void loadUsers();
  }, [user, router]);

  if (!user || user.role !== 'owner' || loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <AuthGuard allowedRoles={['owner']}>
      <div className="min-h-full bg-[linear-gradient(135deg,#f8fbff_0%,#f7f8fc_100%)] p-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-600">Administration</p>
              <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
            </div>
            <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
              ← Back to board
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">No users found</td>
                  </tr>
                ) : (
                  users.map((person) => (
                    <tr key={person._id} className="cursor-pointer hover:bg-slate-50/50" onClick={() => router.push(`/users/${person._id}`)}>
                      <td className="px-4 py-3 font-medium text-slate-900">{person.name}</td>
                      <td className="px-4 py-3">{person.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {formatRole(person.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{person.departmentId?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${person.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {person.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
