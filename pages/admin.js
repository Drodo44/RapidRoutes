{users
  .filter((user) => user.role !== "Admin") // don't show self if Admin
  .map((user) => (
    <tr key={user.id} className="border-b border-gray-700">
      <td className="px-4 py-2">{user.name}</td>
      <td className="px-4 py-2">{user.email}</td>
      <td className="px-4 py-2">{user.role}</td>
      <td className="px-4 py-2">
        <span
          className={`text-sm font-semibold ${
            user.active ? "text-green-400" : "text-red-400"
          }`}
        >
          {user.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-2 flex flex-wrap gap-2">
        {user.role === "Apprentice" && (
          <button
            onClick={() => updateRole(user.id, "Broker")}
            className="bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded text-sm"
          >
            Approve as Broker
          </button>
        )}
        {user.role !== "Admin" && (
          <button
            onClick={() => updateRole(user.id, "Support")}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm"
          >
            Promote to Support
          </button>
        )}
        <button
          onClick={() => toggleActive(user.id, !user.active)}
          className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-sm"
        >
          {user.active ? "Deactivate" : "Activate"}
        </button>
      </td>
    </tr>
  ))}
