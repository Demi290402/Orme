import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ChevronDown, Plus, Check, AlertCircle } from 'lucide-react';
import { registerUser, getGruppiScout, aggiungiGruppoScout, GruppoScout } from '@/lib/data';
import { cn } from '@/lib/utils';

// =====================================================
// VALIDATION HELPERS
// =====================================================
const ITALIAN_REGIONS = [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
    'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
    'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
    'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'
];

type FieldErrors = Record<string, string>;

function validateEmail(email: string): string {
    const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!email) return 'Email obbligatoria';
    if (!re.test(email)) return 'Formato email non valido (es: nome@dominio.it)';
    return '';
}

function validateName(val: string, label: string): string {
    if (!val.trim()) return `${label} obbligatorio`;
    if (val.trim().length < 2) return `${label} deve avere almeno 2 caratteri`;
    if (!/^[a-zA-ZÀ-ÿ\s'\-]+$/.test(val.trim())) return `${label} può contenere solo lettere, spazi e trattini`;
    return '';
}

function validateNickname(val: string): string {
    if (!val.trim()) return ''; // optional
    if (val.trim().length < 2) return 'Totem deve avere almeno 2 caratteri';
    if (!/^[a-zA-ZÀ-ÿ0-9\s'\-]+$/.test(val.trim())) return 'Totem può contenere solo lettere e numeri';
    return '';
}

function validatePassword(val: string): string {
    if (!val) return 'Password obbligatoria';
    if (val.length < 8) return 'La password deve avere almeno 8 caratteri';
    if (!/[0-9]/.test(val)) return 'La password deve contenere almeno un numero';
    return '';
}

function validateGroupField(val: string, label: string): string {
    if (!val.trim()) return `${label} obbligatorio`;
    if (val.trim().length > 80) return `${label} troppo lungo (max 80 caratteri)`;
    if (/[<>"'%;()&+]/.test(val)) return `${label} contiene caratteri non ammessi`;
    return '';
}

// =====================================================
// CUSTOM DROPDOWN WITH "ADD NEW" OPTION
// =====================================================
interface CascadeDropdownProps {
    label: string;
    placeholder: string;
    options: string[];
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    error?: string;
    addNewLabel?: string;
    onAddNew?: (val: string) => Promise<void>;
    addNewPlaceholder?: string;
}

function CascadeDropdown({ label, placeholder, options, value, onChange, disabled, error, addNewLabel, onAddNew, addNewPlaceholder }: CascadeDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newValue, setNewValue] = useState('');
    const [addError, setAddError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleAddNew = async () => {
        if (!newValue.trim()) return;
        const err = validateGroupField(newValue, label);
        if (err) { setAddError(err); return; }
        setSaving(true);
        try {
            await onAddNew!(newValue.trim());
            onChange(newValue.trim());
            setIsAdding(false);
            setNewValue('');
            setIsOpen(false);
        } catch (e: any) {
            setAddError(e.message || 'Errore');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative">
            <label className={cn("block text-xs font-bold mb-1", disabled ? "text-gray-300" : "text-gray-600")}>{label}*</label>
            <button
                type="button"
                disabled={disabled}
                onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
                className={cn(
                    "w-full p-2.5 rounded-lg border text-left flex items-center justify-between text-sm transition-all",
                    disabled ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" : "bg-white border-gray-200 hover:border-scout-brown cursor-pointer",
                    error ? "border-red-300" : "",
                    isOpen ? "border-scout-brown ring-2 ring-scout-brown/20" : ""
                )}
            >
                <span className={value ? "text-gray-800 font-medium" : "text-gray-400"}>{value || placeholder}</span>
                <ChevronDown size={14} className={cn("transition-transform", isOpen ? "rotate-180" : "", disabled ? "text-gray-200" : "text-gray-400")} />
            </button>
            {error && <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                        {options.length === 0 && (
                            <div className="px-3 py-4 text-center text-[12px] text-gray-400 italic">Nessuna opzione disponibile</div>
                        )}
                        {options.map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between",
                                    value === opt ? "bg-scout-brown/10 text-scout-brown font-bold" : "hover:bg-gray-50 text-gray-700"
                                )}
                            >
                                {opt}
                                {value === opt && <Check size={14} className="text-scout-brown" />}
                            </button>
                        ))}
                    </div>
                    {onAddNew && (
                        <div className="border-t border-gray-100">
                            {!isAdding ? (
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(true)}
                                    className="w-full text-left px-4 py-2.5 text-sm text-scout-brown font-bold flex items-center gap-2 hover:bg-scout-brown/5 transition-colors"
                                >
                                    <Plus size={14} />{addNewLabel}
                                </button>
                            ) : (
                                <div className="p-3 space-y-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newValue}
                                        onChange={e => { setNewValue(e.target.value); setAddError(''); }}
                                        placeholder={addNewPlaceholder}
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-scout-brown"
                                    />
                                    {addError && <p className="text-red-500 text-[11px]">{addError}</p>}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleAddNew}
                                            disabled={saving}
                                            className="flex-1 bg-scout-brown text-white text-xs font-bold py-1.5 rounded-lg hover:bg-amber-900 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? 'Salvataggio...' : 'Aggiungi'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsAdding(false); setNewValue(''); setAddError(''); }}
                                            className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Annulla
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// =====================================================
// INPUT WITH VALIDATION
// =====================================================
function ValidatedInput({ label, type = 'text', value, onChange, error, placeholder, required = true, hint }: {
    label: string; type?: string; value: string; onChange: (v: string) => void;
    error?: string; placeholder?: string; required?: boolean; hint?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{label}{required && '*'}</label>
            {hint && <p className="text-[11px] text-gray-400 mb-1">{hint}</p>}
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "w-full p-3 rounded-xl border outline-none focus:ring-2 transition-all",
                    error
                        ? "border-red-300 bg-red-50 focus:ring-red-200"
                        : "border-gray-200 focus:ring-scout-green focus:border-scout-green"
                )}
            />
            {error && <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        </div>
    );
}

// =====================================================
// REGISTER PAGE
// =====================================================
export default function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        nickname: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [region, setRegion] = useState('');
    const [scoutZone, setScoutZone] = useState('');
    const [groupName, setGroupName] = useState('');

    const [gruppi, setGruppi] = useState<GruppoScout[]>([]);
    const [loadingGruppi, setLoadingGruppi] = useState(true);

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Load existing groups from DB
    useEffect(() => {
        getGruppiScout().then(g => { setGruppi(g); setLoadingGruppi(false); });
    }, []);

    // Derived options for cascading dropdowns
    const regionOptions = [...new Set([
        ...ITALIAN_REGIONS,
        ...gruppi.map(g => g.region)
    ])].sort();

    const zoneOptions = [...new Set(
        gruppi.filter(g => g.region === region).map(g => g.scoutZone)
    )].sort();

    const groupOptions = [...new Set(
        gruppi.filter(g => g.region === region && g.scoutZone === scoutZone).map(g => g.groupName)
    )].sort();

    // Reset downstream when upstream changes
    const handleRegionChange = (val: string) => {
        setRegion(val);
        setScoutZone('');
        setGroupName('');
        setFieldErrors(prev => ({ ...prev, region: '', scoutZone: '', groupName: '' }));
    };

    const handleZoneChange = (val: string) => {
        setScoutZone(val);
        setGroupName('');
        setFieldErrors(prev => ({ ...prev, scoutZone: '', groupName: '' }));
    };

    const handleGroupChange = (val: string) => {
        setGroupName(val);
        setFieldErrors(prev => ({ ...prev, groupName: '' }));
    };

    // Add new zone (requires region already set)
    const handleAddZone = async (val: string) => {
        // Just update local state, actual group creation happens with group selection
        setGruppi(prev => [...prev, { id: -1, region, scoutZone: val, groupName: '' }]);
    };

    // Add new group (creates record in DB)
    const handleAddGroup = async (val: string) => {
        const gruppo = await aggiungiGruppoScout(region, scoutZone, val);
        setGruppi(prev => [...prev.filter(g => g.id !== -1 || g.groupName !== ''), gruppo]);
        return;
    };

    // Validate all fields
    const validate = (): boolean => {
        const errors: FieldErrors = {
            firstName: validateName(formData.firstName, 'Nome'),
            lastName: validateName(formData.lastName, 'Cognome'),
            nickname: validateNickname(formData.nickname),
            email: validateEmail(formData.email),
            password: validatePassword(formData.password),
            confirmPassword: formData.confirmPassword !== formData.password ? 'Le password non corrispondono' : '',
            region: validateGroupField(region, 'Regione'),
            scoutZone: validateGroupField(scoutZone, 'Zona'),
            groupName: validateGroupField(groupName, 'Gruppo'),
        };
        setFieldErrors(errors);
        return Object.values(errors).every(e => !e);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        if (!validate()) return;

        setSubmitting(true);
        try {
            // Find numeric groupId from gruppi_scout, or create the group if new
            let gruppo = gruppi.find(g => g.region === region && g.scoutZone === scoutZone && g.groupName === groupName);
            if (!gruppo || gruppo.id === -1) {
                gruppo = await aggiungiGruppoScout(region, scoutZone, groupName);
            }

            await registerUser({
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                nickname: formData.nickname.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                region,
                scoutZone,
                groupName,
                groupId: String(gruppo.id), // numeric id as string
            });
            alert('Registrazione completata! Controlla la tua email per confermare l\'account prima di accedere.');
            navigate('/login');
        } catch (err: any) {
            setSubmitError(err.message || 'Errore durante la registrazione');
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = "w-full p-3 rounded-xl border outline-none focus:ring-2";

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-scout-beige-light p-4 pt-12">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 mb-12">
                <div className="flex justify-center mb-6">
                    <div className="bg-scout-brown p-4 rounded-full shadow-lg">
                        <UserPlus size={40} className="text-white" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-scout-green mb-2">Unisciti al Branco</h1>
                <p className="text-center text-gray-500 mb-8">Crea il tuo profilo scout.</p>

                {submitError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-center text-sm font-bold border border-red-100 flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />{submitError}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4" noValidate>
                    {/* Nome e Cognome */}
                    <div className="grid grid-cols-2 gap-4">
                        <ValidatedInput
                            label="Nome"
                            value={formData.firstName}
                            onChange={v => setFormData(p => ({ ...p, firstName: v }))}
                            error={fieldErrors.firstName}
                        />
                        <ValidatedInput
                            label="Cognome"
                            value={formData.lastName}
                            onChange={v => setFormData(p => ({ ...p, lastName: v }))}
                            error={fieldErrors.lastName}
                        />
                    </div>

                    {/* Nickname */}
                    <ValidatedInput
                        label="Nickname (Totem)"
                        value={formData.nickname}
                        onChange={v => setFormData(p => ({ ...p, nickname: v }))}
                        error={fieldErrors.nickname}
                        required={false}
                        hint="Facoltativo — il nome con cui sei conosciuto nel gruppo"
                    />

                    {/* Dati Gruppo Scout */}
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4">
                        <h3 className="text-xs font-bold text-scout-brown uppercase tracking-wider">Dati Gruppo Scout</h3>
                        <p className="text-[11px] text-gray-400">Seleziona la tua regione, zona e gruppo. Se non trovi il tuo, aggiungilo.</p>

                        {loadingGruppi ? (
                            <div className="text-center text-sm text-gray-400 py-4">Caricamento gruppi...</div>
                        ) : (
                            <>
                                {/* Regione */}
                                <CascadeDropdown
                                    label="Regione"
                                    placeholder="Seleziona regione..."
                                    options={regionOptions}
                                    value={region}
                                    onChange={handleRegionChange}
                                    error={fieldErrors.region}
                                    addNewLabel="Aggiungi nuova regione"
                                    addNewPlaceholder="Es: Puglia"
                                    onAddNew={async (val) => { setRegion(val); }}
                                />

                                {/* Zona */}
                                <CascadeDropdown
                                    label="Zona"
                                    placeholder="Prima seleziona la regione..."
                                    options={zoneOptions}
                                    value={scoutZone}
                                    onChange={handleZoneChange}
                                    disabled={!region}
                                    error={fieldErrors.scoutZone}
                                    addNewLabel="Aggiungi nuova zona"
                                    addNewPlaceholder="Es: Bari Sud"
                                    onAddNew={handleAddZone}
                                />

                                {/* Gruppo */}
                                <CascadeDropdown
                                    label="Gruppo"
                                    placeholder="Prima seleziona la zona..."
                                    options={groupOptions}
                                    value={groupName}
                                    onChange={handleGroupChange}
                                    disabled={!region || !scoutZone}
                                    error={fieldErrors.groupName}
                                    addNewLabel="Aggiungi nuovo gruppo"
                                    addNewPlaceholder="Es: Turi 1"
                                    onAddNew={handleAddGroup}
                                />
                            </>
                        )}
                    </div>

                    {/* Email */}
                    <ValidatedInput
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={v => setFormData(p => ({ ...p, email: v }))}
                        error={fieldErrors.email}
                    />

                    {/* Password */}
                    <ValidatedInput
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={v => setFormData(p => ({ ...p, password: v }))}
                        error={fieldErrors.password}
                        placeholder="Minimo 8 caratteri, almeno 1 numero"
                        hint="Minimo 8 caratteri, almeno un numero"
                    />

                    {/* Conferma Password */}
                    <ValidatedInput
                        label="Conferma Password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={v => setFormData(p => ({ ...p, confirmPassword: v }))}
                        error={fieldErrors.confirmPassword}
                        placeholder="••••••••"
                    />

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-scout-green text-white font-bold py-3 rounded-xl shadow-md hover:bg-scout-green-dark transition-colors mt-4 disabled:opacity-60"
                    >
                        {submitting ? 'Registrazione in corso...' : 'Registrati'}
                    </button>
                </form>

                <p className="text-center mt-6 text-sm text-gray-500">
                    Hai già un account? <Link to="/login" className="text-scout-brown font-bold hover:underline">Accedi</Link>
                </p>
            </div>
        </div>
    );
}
