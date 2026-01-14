import Dexie, { type Table } from 'dexie';

export interface Document {
    id?: number;
    title: string;
    content: string;
    dateAdded: string;
}

export interface HeroCard {
    id?: number;
    entityName: string;
    bullets: string[];
    docId: number;
}

/**
 * Enterprise Metadata Vault
 * Local-first persistence using Dexie for privacy-compliant storage.
 */
export class MeetingDatabase extends Dexie {
    documents!: Table<Document>;
    heroCards!: Table<HeroCard>;

    constructor() {
        super('MeetMe_v3_Vault');
        this.version(1).stores({
            documents: '++id, title, dateAdded',
            heroCards: '++id, entityName, docId'
        });
    }
}

export const db = new MeetingDatabase();
