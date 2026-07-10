import { getLocations, getAllLocationHistory, getAllUsers } from './data';
import * as XLSX from 'xlsx';

// ─── TYPES ───────────────────────────────────────────
type Cadenza = 'giornaliera' | 'settimanale' | 'mensile' | 'trimestrale' | 'semestrale' | 'annuale';

// ─── INDEXEDDB DIRECTORY HANDLE STORAGE ───────────────
const DB_NAME = 'orme_backup_db';
const STORE_NAME = 'handles';

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function storeFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(handle, 'export_folder');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function getFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
    try {
        const db = await getDB();
        return new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get('export_folder');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return null;
    }
}

// ─── FLATTENING FUNCTIONS FOR EXCEL ──────────────────
export function flattenResource(key: string, rawData: any[]): any[] {
    if (!rawData || rawData.length === 0) return [];
    
    switch (key) {
        case 'luoghi':
            return rawData.map((loc: any) => ({
                Nome: loc.name,
                Regione: loc.region,
                Provincia: loc.province,
                Comune: loc.commune,
                Indirizzo: loc.address,
                PostiLetto: loc.beds || 0,
                Bagni: loc.bathrooms || 0,
                Tende: loc.hasTents ? 'Sì' : 'No',
                Refettorio: loc.hasRefectory ? 'Sì' : 'No',
                ServizioRover: loc.hasRoverService ? 'Sì' : 'No',
                CucinaAttrezzata: loc.hasEquippedKitchen ? 'Sì' : 'No',
                PrezzoBase: loc.pricing?.basePrice || '',
                UnitaPrezzo: loc.pricing?.unit === 'per_night' ? 'Notte' : 'Giorno',
                NotePrezzo: loc.pricing?.description || '',
                Contatti: (loc.contacts || []).map((c: any) => c.value).join(', '),
                Attivita: (loc.activities || []).join(', '),
                NotaRapida: loc.quickNote || '',
                StatoDisponibilita: loc.availabilityStatus || 'disponibile'
            }));
            
        case 'verbali':
            return rawData.map((v: any) => ({
                Numero: v.numero,
                Data: v.data ? new Date(v.data).toLocaleDateString('it-IT') : '',
                OraInizio: v.oraInizio || '',
                OraFine: v.oraFine || '',
                Titolo: v.titolo || '',
                ODG: (v.odg || []).map((o: any) => o.titolo).join('\n'),
                Varie: v.varie || ''
            }));
            
        case 'membri':
            return rawData.map((m: any) => ({
                Nome: m.nome,
                Branca: m.branca,
                Ruolo: (m.ruoli || []).join(', '),
                Stato: m.attivo ? 'Attivo' : 'Inattivo'
            }));
            
        case 'presenze':
            // Flatten verbali attendance
            const presenzeRows: any[] = [];
            rawData.forEach((v: any) => {
                const dataStr = v.data ? new Date(v.data).toLocaleDateString('it-IT') : '';
                const presenti = (v.presenti || []).length;
                const assenti = (v.assenti || []).length;
                presenzeRows.push({
                    VerbaleNumero: v.numero,
                    Data: dataStr,
                    Titolo: v.titolo || '',
                    Presenti: presenti,
                    Assenti: assenti,
                    PercentualePresenza: (presenti + assenti) > 0 ? `${Math.round((presenti / (presenti + assenti)) * 100)}%` : '0%'
                });
            });
            return presenzeRows;
            
        case 'storico':
            return rawData.map((h: any) => ({
                Data: h.created_at ? new Date(h.created_at).toLocaleString('it-IT') : '',
                Autore: h.changed_by_username || '',
                Modifica: h.description || ''
            }));
            
        case 'classifica':
            return rawData.map((u: any, idx: number) => ({
                Posizione: idx + 1,
                Nome: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
                Nickname: u.nickname || '',
                Punti: u.points || 0,
                Livello: u.level || 1,
                LuoghiAggiunti: u.locationsAdded || 0
            }));
            
        case 'lista_attesa':
            return rawData.map((l: any) => ({
                'Nome Ragazzo': l.nomeRagazzo || '',
                'Cognome Ragazzo': l.cognomeRagazzo || '',
                'Data Nascita': l.dataNascita ? new Date(l.dataNascita).toLocaleDateString('it-IT') : '',
                'Classe Scolastica': l.classe || '',
                'Genitore Referente': l.nomeGenitore || '',
                'Telefono Genitore': l.telefonoGenitore || '',
                'Note': l.note || '',
                'Data Iscrizione': l.dataIscrizione ? new Date(l.dataIscrizione).toLocaleDateString('it-IT') : (l.createdAt ? new Date(l.createdAt).toLocaleDateString('it-IT') : '')
            }));
            
        case 'trasporti':
            return rawData.map((t: any) => ({
                NomeDitta: t.companyName,
                Referente: t.contactName || '',
                Telefono: t.phone || '',
                Email: t.email || '',
                RegionePartenza: t.departureRegion,
                ComuneSede: t.departureCommune,
                Indirizzo: t.departureAddress || '',
                CapacitaBus: t.capacity || 50,
                PrezzoPersonaIndicativo: t.pricePerPerson || '',
                PrezzoBasePreventivo: t.basePrice || '',
                KmPreventivo: t.km || '',
                PasseggeriPreventivo: t.numeroPersone || '',
                NotePreventivo: t.notes || ''
            }));
            
        default:
            return rawData;
    }
}

// ─── FILE WRITER & BROWSER DOWNLOAD HELPERS ───────────
export function triggerFileDownload(filename: string, content: any, type: 'json' | 'xlsx' = 'json') {
    if (type === 'json') {
        const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        // XLSX
        const wb = XLSX.utils.book_new();
        // If content is already a book object, use it directly. Otherwise construct sheet.
        if (content.Sheets) {
            XLSX.writeFile(content, filename);
        } else {
            const ws = XLSX.utils.json_to_sheet(content);
            XLSX.utils.book_append_sheet(wb, ws, "Dati");
            XLSX.writeFile(wb, filename);
        }
    }
}

async function writeToFolder(
    directoryHandle: FileSystemDirectoryHandle,
    filename: string,
    content: any,
    type: 'json' | 'xlsx'
): Promise<boolean> {
    try {
        const options = { mode: 'readwrite' as const };
        if ((await (directoryHandle as any).queryPermission(options)) !== 'granted') {
            // Cannot request permission asynchronously in some browsers without user interaction
            if ((await (directoryHandle as any).requestPermission(options)) !== 'granted') {
                return false;
            }
        }
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        
        if (type === 'json') {
            await writable.write(JSON.stringify(content, null, 2));
        } else {
            // Write binary XLSX
            const wb = XLSX.utils.book_new();
            if (content.Sheets) {
                const u8out = XLSX.write(content, { bookType: 'xlsx', type: 'array' });
                await writable.write(u8out);
            } else {
                const ws = XLSX.utils.json_to_sheet(content);
                XLSX.utils.book_append_sheet(wb, ws, "Dati");
                const u8out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                await writable.write(u8out);
            }
        }
        await writable.close();
        return true;
    } catch (e) {
        console.warn('Scrittura diretta nella cartella fallita:', e);
        return false;
    }
}

// ─── CORE AUTO EXPORT CHECKER & RUNNER ────────────────
export async function checkAndRunAutoExport(force: boolean = false): Promise<void> {
    try {
        const saved = localStorage.getItem('orme_settings');
        if (!saved) return;

        const prefs = JSON.parse(saved);
        if (!prefs.autoExport) return;

        const configs = prefs.autoExportConfigs || {};
        const now = Date.now();

        // Map configs to look at due resources
        const keysToRun: string[] = [];

        Object.entries(configs).forEach(([key, conf]: [string, any]) => {
            if (!conf.enabled) return;

            if (force) {
                keysToRun.push(key);
                return;
            }

            const lastRunKey = `orme_last_export_${key}`;
            const lastRun = Number(localStorage.getItem(lastRunKey) || '0');
            const cadenza: Cadenza = conf.cadenza || 'mensile';

            let thresholdMs = 30 * 24 * 60 * 60 * 1000; // default 30 days
            if (cadenza === 'giornaliera') thresholdMs = 24 * 60 * 60 * 1000;
            else if (cadenza === 'settimanale') thresholdMs = 7 * 24 * 60 * 60 * 1000;
            else if (cadenza === 'mensile') thresholdMs = 30 * 24 * 60 * 60 * 1000;
            else if (cadenza === 'trimestrale') thresholdMs = 90 * 24 * 60 * 60 * 1000;
            else if (cadenza === 'semestrale') thresholdMs = 180 * 24 * 60 * 60 * 1000;
            else if (cadenza === 'annuale') thresholdMs = 365 * 24 * 60 * 60 * 1000;

            if (now - lastRun >= thresholdMs) {
                keysToRun.push(key);
            }
        });

        if (keysToRun.length === 0) return;

        console.log('Avvio estrazione automatica per risorse:', keysToRun);

        // Fetch data
        const dataBundle: Record<string, any> = {};
        
        if (keysToRun.includes('luoghi')) {
            dataBundle.luoghi = await getLocations();
        }
        if (keysToRun.includes('verbali')) {
            const { getVerbali } = await import('./verbali');
            dataBundle.verbali = await getVerbali();
        }
        if (keysToRun.includes('membri')) {
            const { getMembriCoCa } = await import('./verbali');
            dataBundle.membri = await getMembriCoCa();
        }
        if (keysToRun.includes('presenze')) {
            const { getVerbali } = await import('./verbali');
            dataBundle.presenze = await getVerbali(); // Verbali contains attendance info
        }
        if (keysToRun.includes('storico')) {
            dataBundle.storico = await getAllLocationHistory();
        }
        if (keysToRun.includes('classifica')) {
            const users = await getAllUsers();
            dataBundle.classifica = users.sort((a, b) => b.points - a.points);
        }
        if (keysToRun.includes('lista_attesa')) {
            const { getListaAttesa } = await import('./listaAttesa');
            dataBundle.lista_attesa = await getListaAttesa();
        }
        if (keysToRun.includes('trasporti')) {
            const { getServiziTrasporto } = await import('./trasporti');
            dataBundle.trasporti = await getServiziTrasporto();
        }

        // Try getting the folder handle from IndexedDB
        const folderHandle = await getFolderHandle();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
        const prefix = (prefs.exportFileName || 'orme_backup_automatico').trim();
        const filename = `${prefix}_${dateStr}.xlsx`;
        const formato = 'xlsx';

        // Construct XLSX Workbook
        const wb = XLSX.utils.book_new();
        Object.entries(dataBundle).forEach(([key, rawList]) => {
            const sheetRows = flattenResource(key, rawList);
            const ws = XLSX.utils.json_to_sheet(sheetRows);
            // Sheet names limited to 31 chars in Excel
            const sheetName = key.slice(0, 30).toUpperCase();
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        const contentToWrite = wb;

        let writtenSuccessfully = false;
        if (folderHandle) {
            writtenSuccessfully = await writeToFolder(folderHandle, filename, contentToWrite, formato);
        }

        if (!writtenSuccessfully) {
            // Fallback: Silent download through anchor element
            console.log('Fallito salvataggio diretto in cartella. Eseguo download di fallback.');
            triggerFileDownload(filename, contentToWrite, formato);
        }

        // Mark success times in local storage
        keysToRun.forEach(key => {
            localStorage.setItem(`orme_last_export_${key}`, String(Date.now()));
        });

    } catch (err) {
        console.error('Errore durante estrazione automatica:', err);
    }
}
