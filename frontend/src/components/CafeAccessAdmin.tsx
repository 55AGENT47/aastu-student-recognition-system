import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Student } from '../types';

export default function CafeAccessAdmin() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStudents();
      setStudents(data);
      const sel: Record<string, boolean> = {};
      data.forEach((s) => (sel[String(s.StudentID)] = false));
      setSelected(sel);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [String(id)]: !prev[String(id)] }));
  };

  const selectAll = () => {
    const sel: Record<string, boolean> = {};
    students.forEach((s) => (sel[String(s.StudentID)] = true));
    setSelected(sel);
  };

  const clearSelection = () => {
    const sel: Record<string, boolean> = {};
    students.forEach((s) => (sel[String(s.StudentID)] = false));
    setSelected(sel);
  };

  const bulkUpdate = async (enable: boolean) => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) {
      alert('No students selected');
      return;
    }

    if (!confirm(`Are you sure you want to ${enable ? 'enable' : 'disable'} cafeteria access for ${ids.length} students?`)) {
      return;
    }

    setProcessing(true);
    const results: { id: string; ok: boolean; error?: any }[] = [];
    for (const id of ids) {
      try {
        const s = students.find((x) => x.StudentID === id);
        if (!s) continue;
        const payload = {
          FirstName: s.FirstName,
          LastName: s.LastName,
          Email: s.Email,
          Department: (s as any).Department,
          PhotoPath: (s as any).PhotoPath,
          CafeAccess: enable
        };
        await apiService.updateStudent(id, payload);
        results.push({ id, ok: true });
      } catch (err) {
        console.error('Failed to update student', id, err);
        results.push({ id, ok: false, error: err });
      }
    }

    
    await fetchStudents();
    setProcessing(false);

    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      alert(`Completed with ${failed.length} failures. Check console for details.`);
    } else {
      alert('Bulk update completed successfully');
    }
  };

  if (loading) return <div className="py-12 text-center">Loading students...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Cafeteria Access Administration</h2>
        <p className="mt-2 text-gray-600">Select multiple students and enable or disable cafeteria access in bulk.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button onClick={selectAll} className="px-3 py-1 bg-gray-100 rounded">Select All</button>
            <button onClick={clearSelection} className="px-3 py-1 bg-gray-100 rounded">Clear</button>
          </div>
          <div className="flex items-center space-x-2">
            <button disabled={processing} onClick={() => bulkUpdate(true)} className="px-3 py-1 bg-green-600 text-white rounded">Enable</button>
            <button disabled={processing} onClick={() => bulkUpdate(false)} className="px-3 py-1 bg-red-600 text-white rounded">Disable</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cafe Access</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((s) => (
                <tr key={s.StudentID} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <input type="checkbox" checked={!!selected[String(s.StudentID)]} onChange={() => toggleSelect(s.StudentID)} />
                  </td>
                  <td className="px-6 py-3">{s.FirstName} {s.LastName}</td>
                  <td className="px-6 py-3">{s.StudentID}</td>
                  <td className="px-6 py-3">{s.Email}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${(s as any).CafeAccess ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {(s as any).CafeAccess ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
