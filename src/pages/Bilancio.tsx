// src/pages/Bilancio.tsx
import { useEffect, useState } from 'react';
import { Wallet, Filter, Plus, X } from 'lucide-react';
import { fetchBilancio, addBilancioMovimento, updateBilancioMovimento, deleteBilancioMovimento } from '@/lib/bilancio';
import type { BilancioMovimento, BrancaType } from '@/types';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';

// Helper: format amount with sign
const formatAmount = (mov: BilancioMovimento) =>
  `${mov.tipo === 'entrata' ? '+' : '-'}${mov.importo.toFixed(2)} €`;

export default function BilancioPage() {
  const [movements, setMovements] = useState<BilancioMovimento[]>([]);
  const [groupId, setGroupId] = useState<string>(''); // will be set from user context later
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterBranca, setFilterBranca] = useState<BrancaType | ''>('');
  const [filterTipo, setFilterTipo] = useState<'entrata' | 'uscita' | ''>('');

  // Load movements
  useEffect(() => {
    if (!groupId) return;
    fetchBilancio(groupId).then(setMovements).catch(console.error);
  }, [groupId]);

  // Simulate obtaining groupId from current user (placeholder)
  useEffect(() => {
    // TODO: replace with real group context
    setGroupId('demo-group-id');
  }, []);

  const filtered = movements.filter((m) => {
    const matchBranca = filterBranca ? m.branca === filterBranca : true;
    const matchTipo = filterTipo ? m.tipo === filterTipo : true;
    return matchBranca && matchTipo;
  });

  // Form state for new movement
  const [form, setForm] = useState<Omit<BilancioMovimento, 'id' | 'createdAt'>>({
    groupId: '',
    titolo: '',
    importo: 0,
    tipo: 'entrata',
    branca: 'L/C',
    categoria: '',
    data: new Date().toISOString().slice(0, 10),
    note: '',
    createdBy: '',
  });

  const handleAdd = async () => {
    try {
      const newMov = await addBilancioMovimento({ ...form, groupId });
      setMovements((prev) => [newMov, ...prev]);
      setShowAddModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Header with filters */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet size={24} className="text-scout-green" /> Bilancio
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <Filter size={18} /> Filtra
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-4 py-2 bg-scout-green text-white rounded-md hover:bg-scout-green-dark transition"
          >
            <Plus size={18} /> Nuovo movimento
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <select
            value={filterBranca}
            onChange={(e) => setFilterBranca(e.target.value as BrancaType)}
            className="p-2 border rounded"
          >
            <option value="">Tutte le branche</option>
            <option value="L/C">L/C</option>
            <option value="E/G">E/G</option>
            <option value="R/S">R/S</option>
            <option value="Gruppo">Gruppo</option>
            <option value="CoCa">CoCa</option>
          </select>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as any)}
            className="p-2 border rounded"
          >
            <option value="">Tutti i tipi</option>
            <option value="entrata">Entrata</option>
            <option value="uscita">Uscita</option>
          </select>
          <button
            onClick={() => {
              setFilterBranca('');
              setFilterTipo('');
            }}
            className="col-span-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md"
          >
            Resetta filtri
          </button>
        </div>
      )}

      {/* Movements table */}
      <div className="overflow-x-auto rounded-md shadow">
        <table className="min-w-full bg-white dark:bg-gray-900">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="p-2 text-left">Data</th>
              <th className="p-2 text-left">Titolo</th>
              <th className="p-2 text-left">Branca</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-right">Importo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-gray-200 dark:border-gray-700">
                <td className="p-2">{m.data}</td>
                <td className="p-2">{m.titolo}</td>
                <td className="p-2">{m.branca}</td>
                <td className="p-2 capitalize">{m.tipo}</td>
                <td className="p-2 text-right font-mono text-green-600 dark:text-green-400">
                  {formatAmount(m)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Nessun movimento trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Nuovo movimento</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="p-2 border rounded"
                placeholder="Data"
              />
              <input
                type="text"
                value={form.titolo}
                onChange={(e) => setForm({ ...form, titolo: e.target.value })}
                className="p-2 border rounded"
                placeholder="Titolo"
              />
              <select
                value={form.branca}
                onChange={(e) => setForm({ ...form, branca: e.target.value as BrancaType })}
                className="p-2 border rounded"
              >
                <option value="L/C">L/C</option>
                <option value="E/G">E/G</option>
                <option value="R/S">R/S</option>
                <option value="Gruppo">Gruppo</option>
                <option value="CoCa">CoCa</option>
              </select>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
                className="p-2 border rounded"
              >
                <option value="entrata">Entrata</option>
                <option value="uscita">Uscita</option>
              </select>
              <input
                type="number"
                value={form.importo}
                onChange={(e) => setForm({ ...form, importo: parseFloat(e.target.value) })}
                className="p-2 border rounded"
                placeholder="Importo"
              />
              <input
                type="text"
                value={form.categoria || ''}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="p-2 border rounded"
                placeholder="Categoria"
              />
            </div>
            <textarea
              value={form.note || ''}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="mt-4 w-full p-2 border rounded"
              rows={3}
              placeholder="Note (opzionali)"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-scout-green text-white rounded hover:bg-scout-green-dark"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
