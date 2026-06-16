'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ParticipantTable from '@/components/dashboard/ParticipantTable';

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studyId: '',
    firstName: '',
    lastName: '',
    email: '',
    timezone: 'America/Los_Angeles',
  });

  const loadParticipants = () => {
    setLoading(true);
    fetch('/api/participants')
      .then((res) => res.json())
      .then((data) => {
        setParticipants(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyId: formData.studyId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          timezone: formData.timezone,
        }),
      });

      if (res.ok) {
        setFormData({
          studyId: '',
          firstName: '',
          lastName: '',
          email: '',
          timezone: 'America/Los_Angeles',
        });
        setShowForm(false);
        loadParticipants();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create participant');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Participants</h1>
        <div className="space-x-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Add Participant'}
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-lg shadow-md mb-6"
        >
          <h2 className="text-lg font-semibold mb-4">New Participant</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Study ID *
              </label>
              <input
                type="text"
                required
                value={formData.studyId}
                onChange={(e) =>
                  setFormData({ ...formData, studyId: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Timezone
              </label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Participant'}
          </button>
        </form>
      )}

      {loading ? <p>Loading...</p> : <ParticipantTable participants={participants} />}
    </main>
  );
}
