'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Car, DollarSign, MapPin, Settings } from 'lucide-react';

interface User {
  username: string;
  role: string;
  email: string;
  fullName: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const token = localStorage.getItem('durdle_admin_token');

        if (!token) {
          router.push('/admin/login');
          return;
        }

        const response = await fetch('https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/auth/session', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          localStorage.removeItem('durdle_admin_token');
          router.push('/admin/login');
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error('Session verification failed:', error);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');

      await fetch('https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      localStorage.removeItem('durdle_admin_token');
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('durdle_admin_token');
      router.push('/admin/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-slate-900">Durdle Admin</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user?.fullName}</p>
                <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h2>
          <p className="text-slate-600">Manage your transport pricing and operations</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Vehicle Types</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">3</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Car className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Fixed Routes</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <MapPin className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Base Fare</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">£5.00</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
              <Car className="text-blue-600" size={24} />
              <div>
                <p className="font-medium text-slate-900">Manage Vehicle Types</p>
                <p className="text-sm text-slate-500">Update pricing and vehicle details</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left">
              <MapPin className="text-green-600" size={24} />
              <div>
                <p className="font-medium text-slate-900">Manage Fixed Routes</p>
                <p className="text-sm text-slate-500">Add common routes with fixed pricing</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left">
              <DollarSign className="text-purple-600" size={24} />
              <div>
                <p className="font-medium text-slate-900">Variable Pricing</p>
                <p className="text-sm text-slate-500">Configure base fares and rates</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-lg hover:border-slate-500 hover:bg-slate-50 transition text-left">
              <Settings className="text-slate-600" size={24} />
              <div>
                <p className="font-medium text-slate-900">Settings</p>
                <p className="text-sm text-slate-500">System configuration and preferences</p>
              </div>
            </button>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">Phase 2B Complete</h4>
          <p className="text-blue-700">
            The admin dashboard is now functional with authentication. Management pages for vehicles, pricing, and routes are coming in the next phases.
          </p>
        </div>
      </main>
    </div>
  );
}
