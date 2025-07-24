import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import cities from '../data/allCitiesCleaned.js';

export default function Lanes() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('my');
  const [lanes, setLanes] = useState([]);
  const [formData, setFormData] = useState({
    origin: '',
    dest: '',
    equipment: '',
    weight: '',
    length: '',
    date: '',
    comment: ''
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (user) fetchLanes();
  }, [user, activeTab]);

  const fetchLanes = async () => {
    if (!user) return;

    let query = supabase.from('lanes').select('*');

    if (activeTab === 'my') {
      query = query.eq('user_id', user.id).eq('status', 'Active');
    } else if (activeTab === 'all') {
      query = query.eq('status', 'Active');
    } else if (activeTab === 'archived') {
      query = query.eq('status', 'Archived');
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error) setLanes(data);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCitySelect = (field, value) => {
    const selectedCity = cities.find(c => `${c.city}, ${c.state} ${c.zip}` === value);
    if (selectedCity) {
      setFormData({
        ...formData,
        [`${field}_city`]: selectedCity.city,
        [`${field}_state`]: selectedCity.state,
        [`${field}_zip`]: selectedCity.zip,
        [`${field}_kma`]: selectedCity.kma
      });
    }
  };

  const addLane = async () => {
    if (!user || !formData.origin_city || !formData.dest_city) return;

    const { error } = await supabase.from('lanes').insert([{
      user_id: user.id,
      origin_city: formData.origin_city,
      origin_state: formData.origin_state,
      origin_zip: formData.origin_zip,
      origin_kma: formData.origin_kma,
      dest_city: formData.dest_city,
      dest_state: formData.dest_state,
      dest_zip: formData.dest_zip,
      dest_kma: formData.dest_kma,
      equipment: formData.equipment,
      weight: formData.weight,
      length: formData.length,
      date: formData.date,
      comment: formData.comment,
      status: 'Active'
    }]);

    if (!error) {
      setFormData({
        origin: '',
        dest: '',
        equipment: '',
        weight: '',
        length: '',
        date: '',
        comment: ''
      });
      fetchLanes();
    }
  };

  const updateLaneStatus = async (id, newStatus) => {
    await supabase.from('lanes').update({ status: newStatus }).eq('id', id);
    fetchLanes();
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Lanes</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'my' ? 'bg-cyan-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('my')}
        >
          My Lanes
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'all' ? 'bg-cyan-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('all')}
        >
          All Lanes
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'archived' ? 'bg-cyan-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('archived')}
        >
          Archived Lanes
        </button>
      </div>

      {/* Lane Form */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl mb-4">Add a Lane</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={formData.origin}
            onChange={(e) => handleCitySelect('origin', e.target.value)}
            className="bg-gray-900 text-white p-2 rounded"
          >
            <option value="">Select Origin</option>
            {cities.map((c, idx) => (
              <option key={idx} value={`${c.city}, ${c.state} ${c.zip}`}>
                {c.city}, {c.state} {c.zip}
              </option>
            ))}
          </select>
          <select
            value={formData.dest}
            onChange={(e) => handleCitySelect('dest', e.target.value)}
            className="bg-gray-900 text-white p-2 rounded"
          >
            <option value="">Select Destination</option>
            {cities.map((c, idx) => (
              <option key={idx} value={`${c.city}, ${c.state} ${c.zip}`}>
                {c.city}, {c.state} {c.zip}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Equipment"
            value={formData.equipment}
            onChange={(e) => handleInputChange('equipment', e.target.value)}
            className="bg-gray-900 text-white p-2 rounded"
          />
          <input
            type="number"
            placeholder="Weight (lbs)"
            value={formData.weight}
            onChange={(e) => handleInputChange('weight', e.target.value)}
            className="bg-gray-900 text-white p-2 rounded"
          />
          <input
            type="number"
            placeholder="Length (ft)"
            value={formData.length}
            onChange={(e) => handleInputChange('length', e.target.value)}
            className="bg-gray-900 text-white p-2 rounded"
          />
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="bg-gray-900 text-white p-2 rounded"
          />
          <textarea
            placeholder="Comments"
            value={formData.comment}
            onChange={(e) => handleInputChange('comment', e.target.value)}
            className="bg-gray-900 text-white p-2 rounded col-span-2"
          />
        </div>
        <button
          onClick={addLane}
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded"
        >
          Add Lane
        </button>
      </div>

      {/* Lane Table */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl mb-4">
          {activeTab === 'my' && 'My Lanes'}
          {activeTab === 'all' && 'All Lanes'}
          {activeTab === 'archived' && 'Archived Lanes'}
        </h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b p-2">Origin</th>
              <th className="border-b p-2">Destination</th>
              <th className="border-b p-2">Equipment</th>
              <th className="border-b p-2">Weight</th>
              <th className="border-b p-2">Date</th>
              <th className="border-b p-2">Status</th>
              <th className="border-b p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => (
              <tr key={lane.id}>
                <td className="p-2">{lane.origin_city}, {lane.origin_state}</td>
                <td className="p-2">{lane.dest_city}, {lane.dest_state}</td>
                <td className="p-2">{lane.equipment}</td>
                <td className="p-2">{lane.weight}</td>
                <td className="p-2">{lane.date}</td>
                <td className="p-2">{lane.status}</td>
                <td className="p-2">
                  {activeTab !== 'archived' ? (
                    <button
                      onClick={() => updateLaneStatus(lane.id, 'Archived')}
                      className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => updateLaneStatus(lane.id, 'Active')}
                      className="bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded"
                    >
                      Repost
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
