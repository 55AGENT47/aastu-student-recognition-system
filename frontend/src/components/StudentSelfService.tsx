import StudentProfile from './StudentProfile';

export default function StudentSelfService() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Account</h2>
        <p className="mt-2 text-gray-600">Manage your account. To add a new account, use the <strong>Account</strong> tab.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">My Profile</h3>
          <StudentProfile />
        </div>
      </div>
    </div>
  );
}
