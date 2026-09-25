import React, { useEffect, useState } from 'react';
import { Save, Wallet } from 'lucide-react';
import apiFetch, { triggerFinanceRefresh } from '../api';
import { useToast } from '../components/Toast';

export default function FinanceFees() {
  const toast = useToast();
  const [intakes, setIntakes] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/finance/intakes')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setIntakes(list);
        setDrafts(Object.fromEntries(list.map((intake) => [intake._id, { tuitionFee: String(intake.tuitionFee || 0), currency: intake.currency || 'RWF' }])));
      })
      .catch((error) => toast.error(error.message || 'Failed to load intake fees.'))
      .finally(() => setLoading(false));
  }, [toast]);

  const saveFee = async (intake) => {
    const draft = drafts[intake._id];
    if (!draft || Number(draft.tuitionFee) < 0) { toast.error('Enter a valid fee.'); return; }
    setSaving(intake._id);
    try {
      const updated = await apiFetch(`/finance/intakes/${intake._id}/fee`, { method: 'PUT', body: JSON.stringify({ tuitionFee: Number(draft.tuitionFee), currency: draft.currency }) });
      setIntakes((current) => current.map((item) => item._id === updated._id ? updated : item));
      toast.success('Intake fee updated.');
      triggerFinanceRefresh();
    } catch (error) { toast.error(error.message || 'Failed to update intake fee.'); } finally { setSaving(''); }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading intake fees...</div>;
  return <div className="workspace-page"><div className="workspace-intro"><div><h2>Intake Fees</h2><p>Required amounts are private staff data and never shown on the public website.</p></div><Wallet size={24} className="workspace-header-icon" /></div><div className="table-scroll"><table className="admin-table"><thead><tr><th>Intake / level</th><th>Required fee</th><th>Currency</th><th>Action</th></tr></thead><tbody>{intakes.length === 0 && <tr><td colSpan={4} className="table-empty">No intakes found.</td></tr>}{intakes.map((intake) => { const draft = drafts[intake._id] || {}; return <tr key={intake._id}><td><strong>{intake.title}</strong><small className="table-subtext">{intake.program}</small></td><td><input className="form-control" type="number" min="0" step="100" value={draft.tuitionFee || ''} onChange={(e) => setDrafts((current) => ({ ...current, [intake._id]: { ...current[intake._id], tuitionFee: e.target.value } }))} /></td><td><select className="form-control" value={draft.currency || 'RWF'} onChange={(e) => setDrafts((current) => ({ ...current, [intake._id]: { ...current[intake._id], currency: e.target.value } }))}><option value="RWF">RWF</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></td><td><button className="btn btn-primary btn-xs" onClick={() => saveFee(intake)} disabled={saving === intake._id}><Save size={13} /> {saving === intake._id ? 'Saving' : 'Save'}</button></td></tr>; })}</tbody></table></div></div>;
}
