import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addIscrittoPubblico, getImpostazioniIscrizione, CLASSI } from '@/lib/listaAttesa';
import { ImpostazioniIscrizione, FormBlock, FormQuestion, FormSection } from '@/types';
import { 
    Compass, 
    User, 
    Award, 
    CheckCircle, 
    AlertCircle, 
    ChevronLeft, 
    ChevronRight, 
    Send
} from 'lucide-react';

interface SectionGroup {
    sectionBlock?: FormSection;
    blocks: FormBlock[];
}

export default function IscrizionePubblica() {
    const { groupId } = useParams<{ groupId: string }>();
    const [groupName, setGroupName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [settings, setSettings] = useState<ImpostazioniIscrizione | null>(null);

    // Static form states (fallback)
    const [staticNomeGenitore, setStaticNomeGenitore] = useState('');
    const [staticTelefonoGenitore, setStaticTelefonoGenitore] = useState('');
    const [staticNomeRagazzo, setStaticNomeRagazzo] = useState('');
    const [staticCognomeRagazzo, setStaticCognomeRagazzo] = useState('');
    const [staticDataNascita, setStaticDataNascita] = useState('');
    const [staticClasse, setStaticClasse] = useState('');
    const [staticNote, setStaticNote] = useState('');

    // Dynamic form states
    const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
    const [otherAnswers, setOtherAnswers] = useState<Record<string, string>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

    // Track submitted child name for success screen
    const [submittedChildName, setSubmittedChildName] = useState({ nome: '', cognome: '' });

    const formatSuccessMessage = (template: string) => {
        return template
            .replace(/{nomeRagazzo}/g, submittedChildName.nome || staticNomeRagazzo)
            .replace(/{cognomeRagazzo}/g, submittedChildName.cognome || staticCognomeRagazzo)
            .replace(/{groupName}/g, groupName);
    };

    useEffect(() => {
        async function loadData() {
            if (!groupId) {
                setErrorMsg('Codice gruppo non specificato.');
                setLoading(false);
                return;
            }
            try {
                // Carica nome del gruppo
                const { data, error } = await supabase
                    .from('users')
                    .select('group_name')
                    .eq('group_id', groupId)
                    .limit(1);

                if (error) throw error;

                if (data && data.length > 0 && data[0].group_name) {
                    setGroupName(data[0].group_name);
                } else {
                    setGroupName(`Gruppo Scout (Codice: ${groupId})`);
                }

                // Carica impostazioni form
                const formSettings = await getImpostazioniIscrizione(groupId);
                if (formSettings) {
                    setSettings(formSettings);
                }
            } catch (err) {
                console.error('Errore nel caricamento dei dati:', err);
                setGroupName(`Gruppo Scout (Codice: ${groupId})`);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [groupId]);

    // Partition schema blocks into sections (pages)
    const sections = useMemo<SectionGroup[]>(() => {
        const schema = settings?.formSchema;
        if (!schema || schema.length === 0) return [];

        const groups: SectionGroup[] = [];
        let current: SectionGroup = { blocks: [] };

        schema.forEach((block) => {
            if (block.type === 'section') {
                if (current.blocks.length > 0 || current.sectionBlock) {
                    groups.push(current);
                }
                current = {
                    sectionBlock: block,
                    blocks: []
                };
            } else {
                current.blocks.push(block);
            }
        });

        if (current.blocks.length > 0 || current.sectionBlock) {
            groups.push(current);
        }

        return groups.length > 0 ? groups : [{ blocks: schema }];
    }, [settings?.formSchema]);

    // Handle answer changes
    const handleAnswerChange = (questionId: string, val: any) => {
        setFormAnswers(prev => ({ ...prev, [questionId]: val }));
        if (fieldErrors[questionId]) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[questionId];
                return next;
            });
        }
    };

    const handleCheckboxToggle = (questionId: string, option: string) => {
        const currentVals: string[] = formAnswers[questionId] || [];
        const nextVals = currentVals.includes(option)
            ? currentVals.filter(v => v !== option)
            : [...currentVals, option];
        handleAnswerChange(questionId, nextVals);
    };

    const handleOtherAnswerChange = (questionId: string, text: string) => {
        setOtherAnswers(prev => ({ ...prev, [questionId]: text }));
    };

    // Validate a specific section
    const validateSection = (secIndex: number): boolean => {
        const sec = sections[secIndex];
        if (!sec) return true;

        const newErrors: Record<string, string> = {};
        sec.blocks.forEach(block => {
            if (block.type === 'question' && block.required) {
                const answer = formAnswers[block.id];
                const isEmpty = answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && answer.length === 0);
                if (isEmpty) {
                    newErrors[block.id] = 'Questo campo è obbligatorio.';
                }
            }
        });

        setFieldErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Advance to next section
    const handleNextSection = () => {
        if (!validateSection(currentSectionIndex)) {
            window.scrollTo({ top: 100, behavior: 'smooth' });
            return;
        }
        setCurrentSectionIndex(i => i + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Go back to previous section
    const handlePrevSection = () => {
        setCurrentSectionIndex(i => Math.max(0, i - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Submit dynamic form
    const handleSubmitDynamic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupId) return;

        // Validate current section
        if (!validateSection(currentSectionIndex)) {
            window.scrollTo({ top: 100, behavior: 'smooth' });
            return;
        }

        // Validate all required questions in whole schema before sending
        const allErrors: Record<string, string> = {};
        let firstFailingSection = -1;

        sections.forEach((sec, sIdx) => {
            sec.blocks.forEach(block => {
                if (block.type === 'question' && block.required) {
                    const answer = formAnswers[block.id];
                    const isEmpty = answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && answer.length === 0);
                    if (isEmpty) {
                        allErrors[block.id] = 'Questo campo è obbligatorio.';
                        if (firstFailingSection === -1) firstFailingSection = sIdx;
                    }
                }
            });
        });

        if (Object.keys(allErrors).length > 0) {
            setFieldErrors(allErrors);
            if (firstFailingSection !== -1) {
                setCurrentSectionIndex(firstFailingSection);
            }
            setErrorMsg('Compila tutti i campi obbligatori prima di inviare.');
            window.scrollTo({ top: 100, behavior: 'smooth' });
            return;
        }

        setSubmitting(true);
        setErrorMsg('');

        try {
            // Extract core fields and assemble custom answers
            const allBlocks = settings?.formSchema || [];
            let nomeRagazzo = '';
            let cognomeRagazzo = '';
            let dataNascita = '';
            let classe = '';
            let nomeGenitore = '';
            let telefonoGenitore = '';
            let noteBase = '';
            const customNotes: string[] = [];

            allBlocks.forEach(b => {
                if (b.type !== 'question') return;
                const rawVal = formAnswers[b.id];
                const otherVal = otherAnswers[b.id];

                let strVal = '';
                if (Array.isArray(rawVal)) {
                    strVal = rawVal.join(', ');
                } else if (rawVal !== undefined && rawVal !== null) {
                    strVal = String(rawVal).trim();
                }

                if (otherVal && otherVal.trim()) {
                    strVal = strVal ? `${strVal} (Altro: ${otherVal.trim()})` : otherVal.trim();
                }

                if (b.isCoreField) {
                    if (b.coreMapping === 'nomeRagazzo') nomeRagazzo = strVal;
                    else if (b.coreMapping === 'cognomeRagazzo') cognomeRagazzo = strVal;
                    else if (b.coreMapping === 'dataNascita') dataNascita = strVal;
                    else if (b.coreMapping === 'classe') classe = strVal;
                    else if (b.coreMapping === 'nomeGenitore') nomeGenitore = strVal;
                    else if (b.coreMapping === 'telefonoGenitore') telefonoGenitore = strVal;
                    else if (b.coreMapping === 'note') noteBase = strVal;
                } else {
                    if (strVal) {
                        customNotes.push(`• ${b.title}: ${strVal}`);
                    }
                }
            });

            // Combine note
            let finalNote = noteBase ? noteBase.trim() : '';
            if (customNotes.length > 0) {
                if (finalNote) finalNote += '\n\n';
                finalNote += `[Risposte Aggiuntive Modulo]\n${customNotes.join('\n')}`;
            }

            setSubmittedChildName({ nome: nomeRagazzo, cognome: cognomeRagazzo });

            const successSubmit = await addIscrittoPubblico(groupId, {
                nomeRagazzo: nomeRagazzo || 'Da compilare',
                cognomeRagazzo: cognomeRagazzo || 'Da compilare',
                dataNascita: dataNascita || new Date().toISOString().split('T')[0],
                classe: classe || '1a Elementare',
                nomeGenitore: nomeGenitore || 'Da compilare',
                telefonoGenitore: telefonoGenitore || 'Non fornito',
                dataIscrizione: new Date().toISOString().split('T')[0],
                note: finalNote
            });

            if (successSubmit) {
                setSuccess(true);
            } else {
                setErrorMsg('Si è verificato un errore durante l\'invio. Riprova più tardi.');
            }
        } catch (err) {
            console.error('Errore invio form:', err);
            setErrorMsg('Errore imprevisto durante l\'invio. Riprova più tardi.');
        } finally {
            setSubmitting(false);
        }
    };

    // Submit fallback static form
    const handleSubmitStatic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupId) return;

        if (!staticNomeGenitore || !staticTelefonoGenitore || !staticNomeRagazzo || !staticCognomeRagazzo || !staticDataNascita || !staticClasse) {
            setErrorMsg('Per favore, compila tutti i campi obbligatori.');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');

        setSubmittedChildName({ nome: staticNomeRagazzo, cognome: staticCognomeRagazzo });

        const successSubmit = await addIscrittoPubblico(groupId, {
            nomeGenitore: staticNomeGenitore,
            telefonoGenitore: staticTelefonoGenitore,
            nomeRagazzo: staticNomeRagazzo,
            cognomeRagazzo: staticCognomeRagazzo,
            dataNascita: staticDataNascita,
            classe: staticClasse,
            dataIscrizione: new Date().toISOString().split('T')[0],
            note: staticNote
        });

        if (successSubmit) {
            setSuccess(true);
        } else {
            setErrorMsg('Si è verificato un errore durante l\'invio. Riprova più tardi.');
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <Compass className="w-16 h-16 text-emerald-600 animate-spin" />
                    </div>
                    <p className="text-emerald-800 dark:text-emerald-200 font-medium">Caricamento portale d'iscrizione...</p>
                </div>
            </div>
        );
    }

    const hasDynamicSchema = Boolean(settings?.formSchema && settings.formSchema.length > 0);
    const activeSection = sections[currentSectionIndex];
    const isMultiSection = sections.length > 1;
    const isLastSection = currentSectionIndex === sections.length - 1;

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-amber-50/30 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 flex flex-col justify-between py-6 px-3 sm:px-6">
            <div className="flex-1 max-w-xl md:max-w-2xl lg:max-w-[62vw] w-full mx-auto space-y-4">
                
                {/* ─── Form Banner Card ────────────────────────────────────── */}
                <div 
                    className="w-full h-36 sm:h-52 bg-cover bg-center rounded-2xl md:rounded-3xl shadow-md border border-gray-200/50 dark:border-gray-800 relative overflow-hidden"
                    style={{ backgroundImage: `url('${settings?.bannerUrl || '/scout_banner.png'}')` }}
                />

                {/* ─── Success Confirmation Screen ─────────────────────────── */}
                {success ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-xl border border-emerald-100 dark:border-gray-800 text-center space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-inner">
                            <CheckCircle className="w-12 h-12" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-2xl md:text-3xl font-black text-emerald-800 dark:text-emerald-200">
                                {settings?.successTitle || 'Iscrizione Ricevuta!'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base max-w-lg mx-auto">
                                {settings?.successMessage ? (
                                    formatSuccessMessage(settings.successMessage)
                                ) : (
                                    <>
                                        Grazie per aver espresso la volontà di iscrivere <strong>{submittedChildName.nome} {submittedChildName.cognome}</strong> nel gruppo <strong>{groupName}</strong>. 
                                        I capi ti contatteranno all'apertura delle iscrizioni!
                                    </>
                                )}
                            </p>
                        </div>
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                Powered by <span className="font-bold text-scout-green">Orme</span> — Il sentiero dei capi scout
                            </p>
                        </div>
                    </div>
                ) : hasDynamicSchema ? (
                    /* ─── DYNAMIC GOOGLE FORMS-STYLE RENDERING ─────────────── */
                    <form onSubmit={handleSubmitDynamic} className="space-y-4">
                        
                        {/* Header Intro Card (Only shown on section 0) */}
                        {currentSectionIndex === 0 && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-800 border-t-8 border-t-scout-green space-y-4">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
                                    {settings?.formTitle || 'Modulo Iscrizione Scout'}
                                </h1>
                                {settings?.welcomeTitle && (
                                    <h2 className="text-base font-bold text-scout-green dark:text-emerald-400">
                                        {settings.welcomeTitle}
                                    </h2>
                                )}
                                {settings?.descriptionText && (
                                    <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                        {settings.descriptionText}
                                    </div>
                                )}
                                {settings?.footerText && (
                                    <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                        {settings.footerText}
                                    </div>
                                )}
                                <div className="text-[11px] text-red-500 font-bold pt-1">
                                    * Indica una domanda obbligatoria
                                </div>
                            </div>
                        )}

                        {/* Section Card (if multi-section) */}
                        {activeSection?.sectionBlock && (
                            <div className="bg-emerald-800 text-white rounded-2xl p-6 md:p-7 shadow-sm space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-250">
                                    Sezione {currentSectionIndex + 1} di {sections.length}
                                </div>
                                <h2 className="text-xl md:text-2xl font-black">
                                    {activeSection.sectionBlock.title}
                                </h2>
                                {activeSection.sectionBlock.description && (
                                    <p className="text-xs md:text-sm text-emerald-100 leading-relaxed">
                                        {activeSection.sectionBlock.description}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Global Error Banner */}
                        {errorMsg && (
                            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-2xl flex items-center gap-2.5 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Render active section blocks */}
                        {activeSection?.blocks.map((block) => {
                            if (block.type === 'title_desc') {
                                return (
                                    <div key={block.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 space-y-2">
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                            {block.title}
                                        </h3>
                                        {block.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                                {block.description}
                                            </p>
                                        )}
                                    </div>
                                );
                            }

                            if (block.type === 'image') {
                                return (
                                    <div key={block.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 space-y-3">
                                        {block.title && (
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                {block.title}
                                            </h4>
                                        )}
                                        {block.imageUrl && (
                                            <div className="max-w-lg mx-auto rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                                                <img src={block.imageUrl} alt={block.title || 'Immagine'} className="w-full max-h-80 object-cover" />
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            if (block.type === 'question') {
                                const question = block as FormQuestion;
                                const error = fieldErrors[question.id];
                                const currentVal = formAnswers[question.id];

                                return (
                                    <div 
                                        key={question.id} 
                                        className={`bg-white dark:bg-gray-900 rounded-2xl p-5 md:p-6 shadow-sm border transition-all space-y-4 ${
                                            error 
                                                ? 'border-red-400 dark:border-red-600' 
                                                : 'border-gray-200 dark:border-gray-800'
                                        }`}
                                    >
                                        {/* Question Header */}
                                        <div className="space-y-1">
                                            <label className="block text-sm md:text-base font-bold text-gray-900 dark:text-white leading-snug">
                                                {question.title}
                                                {question.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                                            </label>
                                            {question.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                                    {question.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Question Image (if attached) */}
                                        {question.imageUrl && (
                                            <div className="max-w-md rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                                                <img src={question.imageUrl} alt={question.title} className="w-full max-h-60 object-cover" />
                                            </div>
                                        )}

                                        {/* Input Types */}
                                        <div>
                                            {/* 1. Short Text */}
                                            {question.questionType === 'short_text' && (
                                                <input
                                                    type={question.coreMapping === 'telefonoGenitore' ? 'tel' : 'text'}
                                                    value={currentVal || ''}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    placeholder="La tua risposta"
                                                    className="w-full max-w-md px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-250 dark:border-gray-700 rounded-xl text-xs md:text-sm text-gray-900 dark:text-white focus:border-scout-green focus:ring-1 focus:ring-scout-green focus:outline-hidden transition-all"
                                                />
                                            )}

                                            {/* 2. Paragraph */}
                                            {question.questionType === 'paragraph' && (
                                                <textarea
                                                    rows={3}
                                                    value={currentVal || ''}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    placeholder="La tua risposta"
                                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-250 dark:border-gray-700 rounded-xl text-xs md:text-sm text-gray-900 dark:text-white focus:border-scout-green focus:ring-1 focus:ring-scout-green focus:outline-hidden transition-all resize-y"
                                                />
                                            )}

                                            {/* 3. Multiple Choice (Radio) */}
                                            {question.questionType === 'multiple_choice' && (
                                                <div className="space-y-2.5 pt-1">
                                                    {(question.options || []).map((opt, oIdx) => (
                                                        <label key={oIdx} className="flex items-center gap-3 cursor-pointer group">
                                                            <input
                                                                type="radio"
                                                                name={`question-${question.id}`}
                                                                checked={currentVal === opt}
                                                                onChange={() => handleAnswerChange(question.id, opt)}
                                                                className="w-4 h-4 accent-scout-green cursor-pointer"
                                                            />
                                                            <span className="text-xs md:text-sm text-gray-800 dark:text-gray-200 group-hover:text-scout-green transition-colors">
                                                                {opt}
                                                            </span>
                                                        </label>
                                                    ))}

                                                    {question.hasOtherOption && (
                                                        <div className="flex items-center gap-3 pt-1">
                                                            <input
                                                                type="radio"
                                                                name={`question-${question.id}`}
                                                                checked={currentVal === '__other__'}
                                                                onChange={() => handleAnswerChange(question.id, '__other__')}
                                                                className="w-4 h-4 accent-scout-green cursor-pointer"
                                                            />
                                                            <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 shrink-0">
                                                                Altro:
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={otherAnswers[question.id] || ''}
                                                                onFocus={() => handleAnswerChange(question.id, '__other__')}
                                                                onChange={(e) => {
                                                                    handleAnswerChange(question.id, '__other__');
                                                                    handleOtherAnswerChange(question.id, e.target.value);
                                                                }}
                                                                placeholder="Specifica..."
                                                                className="flex-1 max-w-xs px-2.5 py-1 text-xs bg-gray-50 dark:bg-gray-800/60 border-b border-gray-300 dark:border-gray-700 focus:border-scout-green focus:outline-hidden"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 4. Checkboxes */}
                                            {question.questionType === 'checkboxes' && (
                                                <div className="space-y-2.5 pt-1">
                                                    {(question.options || []).map((opt, oIdx) => {
                                                        const isChecked = Array.isArray(currentVal) && currentVal.includes(opt);
                                                        return (
                                                            <label key={oIdx} className="flex items-center gap-3 cursor-pointer group">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => handleCheckboxToggle(question.id, opt)}
                                                                    className="w-4 h-4 accent-scout-green rounded cursor-pointer"
                                                                />
                                                                <span className="text-xs md:text-sm text-gray-800 dark:text-gray-200 group-hover:text-scout-green transition-colors">
                                                                    {opt}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}

                                                    {question.hasOtherOption && (
                                                        <div className="flex items-center gap-3 pt-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(otherAnswers[question.id])}
                                                                onChange={(e) => {
                                                                    if (!e.target.checked) handleOtherAnswerChange(question.id, '');
                                                                }}
                                                                className="w-4 h-4 accent-scout-green rounded cursor-pointer"
                                                            />
                                                            <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 shrink-0">
                                                                Altro:
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={otherAnswers[question.id] || ''}
                                                                onChange={(e) => handleOtherAnswerChange(question.id, e.target.value)}
                                                                placeholder="Specifica..."
                                                                className="flex-1 max-w-xs px-2.5 py-1 text-xs bg-gray-50 dark:bg-gray-800/60 border-b border-gray-300 dark:border-gray-700 focus:border-scout-green focus:outline-hidden"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 5. Dropdown */}
                                            {question.questionType === 'dropdown' && (
                                                <select
                                                    value={currentVal || ''}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    className="w-full max-w-xs px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-250 dark:border-gray-700 rounded-xl text-xs md:text-sm text-gray-900 dark:text-white focus:border-scout-green focus:outline-hidden cursor-pointer"
                                                >
                                                    <option value="">Seleziona un'opzione...</option>
                                                    {(question.options && question.options.length > 0 ? question.options : CLASSI).map((opt, oIdx) => (
                                                        <option key={oIdx} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}

                                            {/* 6. Date Picker */}
                                            {question.questionType === 'date' && (
                                                <input
                                                    type="date"
                                                    value={currentVal || ''}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    className="px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-250 dark:border-gray-700 rounded-xl text-xs md:text-sm text-gray-900 dark:text-white focus:border-scout-green focus:outline-hidden cursor-pointer"
                                                />
                                            )}
                                        </div>

                                        {/* Field Error Message */}
                                        {error && (
                                            <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold pt-1">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                <span>{error}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return null;
                        })}

                        {/* ─── Multi-Section Stepper / Bottom Controls ─────── */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {isMultiSection && currentSectionIndex > 0 && (
                                    <button
                                        type="button"
                                        onClick={handlePrevSection}
                                        className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Indietro
                                    </button>
                                )}

                                {isMultiSection && !isLastSection && (
                                    <button
                                        type="button"
                                        onClick={handleNextSection}
                                        className="px-6 py-2.5 bg-scout-green hover:bg-scout-green-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ml-auto sm:ml-0"
                                    >
                                        Avanti
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Submit Button on Final Step */}
                            {(!isMultiSection || isLastSection) && (
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full sm:w-auto px-8 py-3 bg-scout-green hover:bg-scout-green-dark text-white rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                    <span>{submitting ? 'Invio in corso...' : 'Invia Iscrizione'}</span>
                                </button>
                            )}
                        </div>

                        {/* Multi-Section Progress Indicator */}
                        {isMultiSection && (
                            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold pt-2">
                                <span>Pagina {currentSectionIndex + 1} di {sections.length}</span>
                                <div className="w-32 bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-scout-green h-full transition-all duration-300"
                                        style={{ width: `${((currentSectionIndex + 1) / sections.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                ) : (
                    /* ─── FALLBACK STATIC FORM (Backward Compatible) ───────── */
                    <form onSubmit={handleSubmitStatic} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-800 space-y-6">
                        <div className="text-center border-b border-gray-100 dark:border-gray-800 pb-4">
                            <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight text-gray-950 dark:text-white">
                                {settings?.formTitle || 'Modulo richiesta inserimento negli scout'}
                            </h1>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base md:text-lg font-black text-emerald-700 dark:text-emerald-300">
                                {settings?.welcomeTitle || '🎉 Benvenuti nel grande gioco dello scoutismo! 🌲⛺'}
                            </h2>
                            <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                {settings?.descriptionText || (
                                    <>
                                        Ciao! Siamo felici che tu stia pensando di far vivere a tuo/a figlio/a l’avventura più bella di tutte: quella scout! 🐾
                                        {"\n\n"}
                                        Compilando questo modulo ci aiuterai a raccogliere le informazioni necessarie per organizzare al meglio le iscrizioni.
                                        {"\n\n"}
                                        Pronti a partire? 👉 Compila il modulo e... Buona Caccia! 🦊
                                    </>
                                )}
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-gray-800" />

                        {errorMsg && (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-2xl flex items-start gap-2.5 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <User className="w-4 h-4 text-scout-green" />
                                1. Riferimento Genitore / Tutore
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nome e Cognome Genitore *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="es. Mario Rossi"
                                        value={staticNomeGenitore}
                                        onChange={(e) => setStaticNomeGenitore(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 focus:outline-hidden focus:ring-2 focus:ring-scout-green text-xs md:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Numero di Telefono *</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="es. 3331234567"
                                        value={staticTelefonoGenitore}
                                        onChange={(e) => setStaticTelefonoGenitore(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 focus:outline-hidden focus:ring-2 focus:ring-scout-green text-xs md:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-gray-800" />

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-scout-green" />
                                2. Dati del Bambino / Ragazzo
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nome Figlio/a *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nome del ragazzo/a"
                                        value={staticNomeRagazzo}
                                        onChange={(e) => setStaticNomeRagazzo(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 focus:outline-hidden focus:ring-2 focus:ring-scout-green text-xs md:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Cognome Figlio/a *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Cognome del ragazzo/a"
                                        value={staticCognomeRagazzo}
                                        onChange={(e) => setStaticCognomeRagazzo(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 focus:outline-hidden focus:ring-2 focus:ring-scout-green text-xs md:text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Data di Nascita *</label>
                                    <input
                                        type="date"
                                        required
                                        value={staticDataNascita}
                                        onChange={(e) => setStaticDataNascita(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 focus:outline-hidden focus:ring-2 focus:ring-scout-green text-xs md:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Classe (scolastica frequentata) *</label>
                                    <select
                                        required
                                        value={staticClasse}
                                        onChange={(e) => setStaticClasse(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 focus:outline-hidden focus:ring-2 focus:ring-scout-green text-xs md:text-sm cursor-pointer"
                                    >
                                        <option value="">Seleziona classe...</option>
                                        {CLASSI.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-gray-800" />

                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Note o Informazioni Aggiuntive (Opzionale)</label>
                            <textarea
                                placeholder="Segnala qui eventuali fratelli già in gruppo, preferenze di contatto o altre note utili..."
                                value={staticNote}
                                onChange={(e) => setStaticNote(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 focus:outline-hidden focus:ring-2 focus:ring-scout-green text-xs md:text-sm resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-scout-green hover:bg-scout-green-dark text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs md:text-sm"
                        >
                            <Send className="w-4 h-4" />
                            {submitting ? 'Invio in corso...' : 'Invia Iscrizione'}
                        </button>
                    </form>
                )}
            </div>

            {/* ─── Footer with Privacy Disclaimer ──────────────────────────── */}
            <footer className="w-full text-center py-6 text-[10px] text-gray-400 dark:text-gray-600 max-w-xl md:max-w-2xl lg:max-w-[62vw] mx-auto px-4 leading-relaxed">
                {settings?.disclaimerText || 'Inviando questo modulo, acconsenti al trattamento dei dati personali forniti al fine di gestire l\'inserimento del minore nella lista d\'attesa del gruppo scout indicato, in conformità con le policy di privacy vigenti.'}
            </footer>
        </div>
    );
}
