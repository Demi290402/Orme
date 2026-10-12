import type { EventoCalendario } from './calendario';
import { getColorByBranca } from './constants';

export interface ParsedIcsEvent {
    id?: string;
    titolo: string;
    dataInizio: string;   // YYYY-MM-DD
    dataFine?: string;    // YYYY-MM-DD
    oraInizio?: string;   // HH:MM
    oraFine?: string;     // HH:MM
    luogo?: string;
    note?: string;
    branca: string;
    colore: string;
    selected?: boolean;
    isDuplicate?: boolean;
}

export interface GenerateIcsOptions {
    calendarName?: string;
    includeNotes?: boolean;
    includeLocation?: boolean;
    includeBranchPrefix?: boolean;
}

/**
 * Converte HTML (da RichTextEditor) in testo semplice formattato.
 */
export function htmlToPlainText(html?: string): string {
    if (!html) return '';
    return html
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
}

/**
 * Esegue l'escape dei caratteri speciali per campi di testo RFC 5545.
 */
function escapeIcsText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n|\n|\r/g, '\\n');
}

/**
 * Esegue l'unescape dei caratteri speciali RFC 5545.
 */
function unescapeIcsText(text: string): string {
    return text
        .replace(/\\n/gi, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}

/**
 * Esegue il line-folding RFC 5545 (max 75 ottetti per riga).
 */
function foldLine(line: string): string {
    if (line.length <= 75) return line;
    const chunks: string[] = [];
    let remaining = line;
    chunks.push(remaining.slice(0, 75));
    remaining = remaining.slice(75);
    while (remaining.length > 0) {
        chunks.push(' ' + remaining.slice(0, 74));
        remaining = remaining.slice(74);
    }
    return chunks.join('\r\n');
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function formatDateToIcsDate(dateStr: string): string {
    return dateStr.replace(/-/g, '');
}

/**
 * Aggiunge un giorno a una data YYYY-MM-DD (per DTEND all-day non inclusivo RFC 5545).
 */
function addOneDay(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + 1);
    return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`;
}

/**
 * Sottrae un giorno da una data YYYYMMDD (per calcolare dataFine inclusiva da DTEND non inclusivo).
 */
function subtractOneDay(icsDateStr: string): string {
    const y = parseInt(icsDateStr.slice(0, 4), 10);
    const m = parseInt(icsDateStr.slice(4, 6), 10);
    const d = parseInt(icsDateStr.slice(6, 8), 10);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() - 1);
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * Formatta un orario HH:MM o HH:MM:SS in HHMM00.
 */
function formatTimeToIcsTime(timeStr: string): string {
    const parts = timeStr.split(':');
    const h = parts[0] || '00';
    const m = parts[1] || '00';
    return `${pad2(parseInt(h, 10))}${pad2(parseInt(m, 10))}00`;
}

/**
 * Calcola un'ora dopo rispetto all'orario di inizio (se oraFine è mancante).
 */
function addOneHourToTime(timeStr: string): string {
    const parts = timeStr.split(':');
    const h = (parseInt(parts[0] || '0', 10) + 1) % 24;
    const m = parts[1] || '00';
    return `${pad2(h)}${pad2(parseInt(m, 10))}00`;
}

/**
 * Rileva intelligentemente la branca scout in base al titolo, descrizione o categorie.
 */
export function detectBranca(text: string, categories?: string[]): string {
    const combined = `${categories?.join(' ') || ''} ${text}`.toLowerCase();

    // Verifiche per parola intera / pattern tipici scout
    if (/\b(l\/c|lc|lupett[ioae]|coccinell[ae]|cerchio|branco|akela|bagheera|baloo|kaa|tana|caccia)\b/i.test(combined)) {
        return 'L/C';
    }
    if (/\b(e\/g|eg|esplorator[ei]|guid[ae]|reparto|alta\s*sq|squadrigli[ae]|san\s*giorgio|bivacco|campetto)\b/i.test(combined)) {
        return 'E/G';
    }
    if (/\b(r\/s|rs|rover|scolt[ae]|clan|noviziat[io]|fuoco|route|strada|veglia|hike)\b/i.test(combined)) {
        return 'R/S';
    }
    if (/\b(gruppo|apertura|chiusura|festa\s*di\s*gruppo|genitori|assemblea\s*di\s*gruppo)\b/i.test(combined)) {
        return 'Gruppo';
    }
    if (/\b(coca|co\.ca|comunit[aà]\s*capi|consiglio|staff|capi|pattuglia)\b/i.test(combined)) {
        return 'CoCa';
    }

    return 'CoCa';
}

/**
 * Genera una stringa ICS completa conforme allo standard RFC 5545 a partire da un array di eventi.
 */
export function generateIcs(
    eventi: EventoCalendario[],
    options: GenerateIcsOptions = {}
): string {
    const calName = options.calendarName || 'Calendario CoCa - Orme';
    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Orme Scout App//Calendario CoCa//IT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeIcsText(calName)}`,
        'X-WR-TIMEZONE:Europe/Rome',
    ];

    for (const ev of eventi) {
        if (!ev.dataInizio || !ev.titolo) continue;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${ev.id || crypto.randomUUID()}@orme.app`);
        lines.push(`DTSTAMP:${dtstamp}`);

        // Titolo con eventuale prefisso branca o pulito
        const summary = options.includeBranchPrefix && ev.branca
            ? `[${ev.branca}] ${ev.titolo}`
            : ev.titolo;
        lines.push(`SUMMARY:${escapeIcsText(summary)}`);

        // Gestione data/ora inizio e fine
        const isAllDay = !ev.oraInizio;
        const startDateFormatted = formatDateToIcsDate(ev.dataInizio);

        if (isAllDay) {
            lines.push(`DTSTART;VALUE=DATE:${startDateFormatted}`);
            // Per eventi tutto il giorno RFC 5545, DTEND è esclusivo (giorno successivo all'ultimo giorno dell'evento)
            const endDateFormatted = addOneDay(ev.dataFine || ev.dataInizio);
            lines.push(`DTEND;VALUE=DATE:${endDateFormatted}`);
        } else {
            const startTimeFormatted = formatTimeToIcsTime(ev.oraInizio!);
            lines.push(`DTSTART:${startDateFormatted}T${startTimeFormatted}`);

            const endDate = ev.dataFine ? formatDateToIcsDate(ev.dataFine) : startDateFormatted;
            const endTimeFormatted = ev.oraFine
                ? formatTimeToIcsTime(ev.oraFine)
                : addOneHourToTime(ev.oraInizio!);
            lines.push(`DTEND:${endDate}T${endTimeFormatted}`);
        }

        // Descrizione / note
        if (options.includeNotes !== false && ev.note) {
            const plainNote = htmlToPlainText(ev.note);
            if (plainNote) {
                const desc = `Branca: ${ev.branca}\n\n${plainNote}`;
                lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
            }
        } else if (ev.branca) {
            lines.push(`DESCRIPTION:${escapeIcsText(`Branca: ${ev.branca}`)}`);
        }

        // Luogo
        if (options.includeLocation !== false && ev.luogo) {
            lines.push(`LOCATION:${escapeIcsText(ev.luogo)}`);
        }

        // Categorie / Branca
        if (ev.branca) {
            lines.push(`CATEGORIES:${escapeIcsText(ev.branca)}`);
        }

        lines.push('STATUS:CONFIRMED');
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    // Applica line-folding e join con CRLF
    return lines.map(foldLine).join('\r\n') + '\r\n';
}

/**
 * Esegue il parsing di una stringa ICS ed estrae gli eventi in oggetti pronti per Orme.
 */
export function parseIcs(icsText: string): ParsedIcsEvent[] {
    if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) {
        throw new Error('Il file fornito non sembra essere un calendario iCalendar (.ics) valido.');
    }

    // 1. Normalizza i ritorni a capo
    const normalized = icsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. Unfold delle righe continuate (qualsiasi riga che comincia con spazio o tab)
    const unfolded = normalized.replace(/\n[ \t]/g, '');

    // 3. Estrai i blocchi VEVENT
    const eventBlocks: string[] = [];
    const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
    let match: RegExpExecArray | null;

    while ((match = veventRegex.exec(unfolded)) !== null) {
        eventBlocks.push(match[1]);
    }

    const parsedEvents: ParsedIcsEvent[] = [];

    for (const block of eventBlocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

        let uid: string | undefined;
        let summary = '';
        let description = '';
        let location = '';
        const categories: string[] = [];

        let dtStartRaw = '';
        let dtEndRaw = '';

        for (const line of lines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) continue;

            const propHeader = line.slice(0, colonIdx);
            const propValue = line.slice(colonIdx + 1);

            const propName = propHeader.split(';')[0].toUpperCase();

            switch (propName) {
                case 'UID':
                    uid = propValue;
                    break;
                case 'SUMMARY':
                    summary = unescapeIcsText(propValue);
                    break;
                case 'DESCRIPTION':
                    description = unescapeIcsText(propValue);
                    break;
                case 'LOCATION':
                    location = unescapeIcsText(propValue);
                    break;
                case 'CATEGORIES': {
                    const rawCats = unescapeIcsText(propValue);
                    categories.push(...rawCats.split(/[,;]/).map(c => c.trim()).filter(Boolean));
                    break;
                }
                case 'DTSTART':
                    dtStartRaw = line; // conserva l'intera riga per leggere i parametri (es. VALUE=DATE o TZID)
                    break;
                case 'DTEND':
                    dtEndRaw = line;
                    break;
            }
        }

        if (!summary && !dtStartRaw) continue;

        // Estrazione DTSTART
        const parsedStart = parseIcsDateTime(dtStartRaw);
        if (!parsedStart.date) continue; // senza data inizio non è valido

        // Estrazione DTEND
        const parsedEnd = dtEndRaw ? parseIcsDateTime(dtEndRaw) : null;

        let dataInizio = parsedStart.date;
        let oraInizio = parsedStart.time;
        let dataFine: string | undefined = undefined;
        let oraFine = parsedEnd?.time;

        if (parsedEnd?.date) {
            if (parsedStart.isAllDay && parsedEnd.isAllDay) {
                // Per all-day RFC 5545, DTEND è esclusivo: sottraiamo 1 giorno
                const inclusiveEndDate = subtractOneDay(parsedEnd.rawDate);
                if (inclusiveEndDate > dataInizio) {
                    dataFine = inclusiveEndDate;
                }
            } else {
                if (parsedEnd.date !== dataInizio || oraFine) {
                    dataFine = parsedEnd.date;
                }
            }
        }

        // Auto-rilevamento della branca
        const branca = detectBranca(`${summary} ${description}`, categories);
        const colore = getColorByBranca(branca);

        parsedEvents.push({
            id: uid,
            titolo: summary || 'Evento senza titolo',
            dataInizio,
            dataFine,
            oraInizio,
            oraFine,
            luogo: location,
            note: description,
            branca,
            colore,
            selected: true,
        });
    }

    return parsedEvents;
}

interface ParsedDateTime {
    date: string;       // YYYY-MM-DD
    time?: string;      // HH:MM
    rawDate: string;    // YYYYMMDD
    isAllDay: boolean;
}

function parseIcsDateTime(line: string): ParsedDateTime {
    const colonIdx = line.indexOf(':');
    const header = colonIdx !== -1 ? line.slice(0, colonIdx) : '';
    const val = colonIdx !== -1 ? line.slice(colonIdx + 1).trim() : line.trim();

    const isAllDayHeader = header.toUpperCase().includes('VALUE=DATE');

    // Valore può essere:
    // 20261017
    // 20261017T093000
    // 20261017T093000Z
    const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(val);
    if (!match) {
        return { date: '', rawDate: '', isAllDay: false };
    }

    const [, year, month, day, hour, min] = match;
    const rawDate = `${year}${month}${day}`;
    const date = `${year}-${month}-${day}`;

    if (hour !== undefined && min !== undefined && !isAllDayHeader) {
        return {
            date,
            time: `${hour}:${min}`,
            rawDate,
            isAllDay: false,
        };
    }

    return {
        date,
        rawDate,
        isAllDay: true,
    };
}

/**
 * Scarica un file .ics nel browser in modo nativo.
 */
export function downloadIcsFile(icsContent: string, filename: string): void {
    const cleanFilename = filename.endsWith('.ics') ? filename : `${filename}.ics`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = cleanFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

/**
 * Condivide il file .ics nativamente su mobile (WhatsApp, Calendario, Drive, ecc.)
 * se supportato, altrimenti avvia il download diretto.
 */
export async function shareOrDownloadIcsFile(
    icsContent: string,
    filename: string,
    title = 'Calendario CoCa'
): Promise<'shared' | 'downloaded'> {
    const cleanFilename = filename.endsWith('.ics') ? filename : `${filename}.ics`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const file = new File([blob], cleanFilename, { type: 'text/calendar' });

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title,
                text: `Ecco il calendario di CoCa (${cleanFilename}) per aggiungere gli eventi al tuo smartphone.`,
                files: [file],
            });
            return 'shared';
        } catch (err: any) {
            // Se l'utente annulla la condivisione, non facciamo fallback a download
            if (err.name === 'AbortError') {
                return 'shared';
            }
            console.warn('Errore condivisione nativa, fallback a download:', err);
        }
    }

    downloadIcsFile(icsContent, cleanFilename);
    return 'downloaded';
}

/**
 * Esporta un singolo evento in un file .ics e ne avvia il download.
 */
export function exportSingleEventoIcs(evento: EventoCalendario): void {
    const ics = generateIcs([evento], {
        calendarName: evento.titolo,
        includeNotes: true,
        includeLocation: true,
    });
    const safeTitle = evento.titolo.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'evento';
    downloadIcsFile(ics, `${safeTitle}_${evento.dataInizio}.ics`);
}
