import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function Lanes() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('my');
  const [lanes, setLanes] = useState([]);
  const [cities, setCities] = useState([]);
  const [formData, setFormData] = useState({
    origin_city: '',
    origin_state: '',
    origin_zip: '',
    origin_kma_code: '',
    origin_kma_name: '',
    dest_city: '',
    dest_state: '',
    dest_zip: '',
    dest_kma_code: '',
    dest_kma_name: '',
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

  useEffect(() => {
    const loadCities = async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('state_or_province', { ascending: true })
        .order('city', { ascending: true });
      if (!error && data) setCities(data);
    };
    loadCities();
  }, []);

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
    const selectedCity = cities.find(
      (c) => `${c.city}, ${c.state_or_province} ${c.zip}` === value
    );
    if (selectedCity) {
      setFormData({
        ...formData,
        [`${field}_city`]: selectedCity.city,
        [`${field}_state`]: selectedCity.state_or_province,
        [`${field}_zip`]: selectedCity.zip,
        [`${field}_kma_code`]: selectedCity.kma_code,
        [`${field}_kma_name`]: selectedCity.kma_name
      });
    }
  };

  const addLane = async () => {
    if (!user || !formData.origin_city || !formData.dest_city) return;

    const { error } = await supabase.from('lanes').insert([
      {
        user_id: user.id,
        origin_city: formData.origin_city,
        origin_state: formData.origin_state,
        origin_zip: formData.origin_zip,
        origin_kma_code: formData.origin_kma_code,
        origin_kma_name: formData.origin_kma_name,
        dest_city: formData.dest_city,
        dest_state: formData.dest_state,
        dest_zip: formData.dest_zip,
        dest_kma_code: formData.dest_kma_code,
        dest_kma_name: formData.dest_kma_name,
        equipment: formData.equipment,
        weight: formData.weight,
        length: formData.length,
        date: formData.date,
        comment: formData.comment,
        status: 'Active'
      }
    ]);

    if (!error) {
      setFormData({
        origin_city: '',
        origin_state: '',
        origin_zip: '',
        origin_kma_code: '',
        origin_kma_name: '',
        dest_city: '',
        dest_state: '',
        dest_zip: '',
        dest_kma_code: '',
        dest_kma_name: '',
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
      <h1 className="text-3xl font-bold mb-6 text-cyan-400">Lane Management</h1>

      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded-xl transition ${activeTab === 'my' ? 'bg-cyan-600 shadow-lg' : 'bg-gray-800 hover:bg-gray-700'}`}
          onClick={() => setActiveTab('my')}
        >
          My Lanes
        </button>
        <button
          className={`px-4 py-2 rounded-xl transition ${activeTab === 'all' ? 'bg-cyan-600 shadow-lg' : 'bg-gray-800 hover:bg-gray-700'}`}
          onClick={() => setActiveTab('all')}
        >
          All Lanes
        </button>
        <button
          className={`px-4 py-2 rounded-xl transition ${activeTab === 'archived' ? 'bg-cyan-600 shadow-lg' : 'bg-gray-800 hover:bg-gray-700'}`}
          onClick={() => setActiveTab('archived')}
        >
          Archived Lanes
        </button>
      </div>

      <div className="bg-gray-900 p-4 rounded-2xl mb-6 shadow-lg">
        <h2 className="text-xl text-emerald-400 mb-4">Add a Lane</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={
              formData.origin_city
                ? `${formData.origin_city}, ${formData.origin_state} ${formData.origin_zip}`
                : ''
            }
            onChange={(e) => handleCitySelect('origin', e.target.value)}
            className="bg-gray-800 text-white p-2 rounded-lg"
          >
            <option value="">Select Origin</option>
            {cities.map((c, idx) => (
              <option key={idx} value={`${c.city}, ${c.state_or_province} ${c.zip}`}>
                {c.city}, {c.state_or_province} {c.zip}
              </option>
            ))}
          </select>
          <select
            value={
              formData.dest_city
                ? `${formData.dest_city}, ${formData.dest_state} ${formData.dest_zip}`
                : ''
            }
            onChange={(e) => handleCitySelect('dest', e.target.value)}
            className="bg-gray-800 text-white p-2 rounded-lg"
          >
            <option value="">Select Destination</option>
            {cities.map((c, idx) => (
              <option key={idx} value={`${c.city}, ${c.state_or_province} ${c.zip}`}>
                {c.city}, {c.state_or_province} {c.zip}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Equipment"
            value={formData.equipment}
            onChange={(e) => handleInputChange('equipment', e.target.value)}
            className="bg-gray-800 text-white p-2 rounded-lg"
          />
          <input
            type="number"
            placeholder="Weight (lbs)"
            value={formData.weight}
            onChange={(e) => handleInputChange('weight', e.target.value)}
            className="bg-gray-800 text-white p-2 rounded-lg"
          />
          <input
            type="number"
            placeholder="Length (ft)"
            value={formData.length}
            onChange={(e) => handleInputChange('length', e.target.value)}
            className="bg-gray-800 text-white p-2 rounded-lg"
          />
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="bg-gray-800 text-white p-2 rounded-lg"
          />
          <textarea
            placeholder="Comments"
            value={formData.comment}
            onChange={(e) => handleInputChange('comment', e.target.value)}
            className="bg-gray-800 text-white p-2 rounded-lg col-span-2"
          />
        </div>
        <button
          onClick={addLane}
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-lg transition"
        >
          Add Lane
        </button>
      </div>

      <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
        <h2 className="text-xl mb-4 text-cyan-400">
          {activeTab === 'my' && 'My Active Lanes'}
          {activeTab === 'all' && 'All Active Lanes'}
          {activeTab === 'archived' && 'Archived Lanes'}
        </h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-emerald-400">
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
              <tr key={lane.id} className="hover:bg-gray-800">
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
                      className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => updateLaneStatus(lane.id, 'Active')}
                      className="bg-cyan-600 hover:bg-cyan-700 px-3 py-1 rounded-lg"
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

