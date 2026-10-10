import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import {
  buildVettingCatalog,
  parseJavaProperties,
  VettingCatalog,
  VettingSourceMetadata,
} from './vetting-catalog';
import { StoredVettingSource, VettingCatalogStorage } from './vetting-catalog-storage';

export interface VettingCatalogWorkspace {
  readonly catalog: VettingCatalog;
  readonly sources: readonly StoredVettingSource[];
  readonly bundledUpdateAvailable: boolean;
}

const bundledSourceId = 'builtin-crca-initial';
const bundledXmlName = 'crca_initial_vetting_rules.xml';
const bundledPropertiesName = 'Vetting_fr_FR.properties';
const initializedMetadataKey = 'bundled-catalog-initialized';

export function inferVettingFileMetadata(
  fileName: string,
): Pick<VettingSourceMetadata, 'adherent' | 'offer'> {
  const match = fileName.match(/^([^_]+)_([^_]+)_vetting_rules\.xml$/i);
  return {
    adherent: match?.[1] ?? '',
    offer: match?.[2] ?? '',
  };
}

export function readPropertiesFile(file: File): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let text: string;

    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      text = new TextDecoder('utf-16le', { fatal: true }).decode(bytes);
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      text = new TextDecoder('utf-16be', { fatal: true }).decode(bytes);
    } else {
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch (utf8Error: unknown) {
        try {
          text = new TextDecoder('windows-1252', { fatal: true }).decode(bytes);
        } catch (legacyError: unknown) {
          throw new Error('Le fichier de libellés ne peut pas être décodé.', {
            cause: legacyError ?? utf8Error,
          });
        }
      }
    }

    if (text.includes('\uFFFD')) {
      throw new Error(
        'Le fichier de libellés contient déjà des caractères de remplacement (�). Vérifiez son encodage et réexportez-le avant import.',
      );
    }
    return text;
  });
}

@Injectable({ providedIn: 'root' })
export class VettingCatalogService {
  private readonly http = inject(HttpClient);
  private readonly storage = new VettingCatalogStorage();
  private bundledFilesPromise: Promise<{ xmlText: string; propertiesText: string }> | undefined;

  async load(): Promise<VettingCatalogWorkspace> {
    const bundledFiles = await this.loadBundledFiles();
    const sources = await this.storage.getSources();
    const initialized = await this.storage.getMetadata<boolean>(initializedMetadataKey);

    if (!initialized) {
      const initialSource: StoredVettingSource = {
        id: bundledSourceId,
        fileName: bundledXmlName,
        ...inferVettingFileMetadata(bundledXmlName),
        origin: 'bundled',
        xmlText: bundledFiles.xmlText,
        propertiesText: bundledFiles.propertiesText,
        propertiesFileName: bundledPropertiesName,
      };
      buildVettingCatalog(
        initialSource.xmlText,
        initialSource.propertiesText,
        this.sourceMetadata(initialSource),
      );
      await this.storage.putSource(initialSource);
      await this.storage.putMetadata(initializedMetadataKey, true);
      sources.push(initialSource);
    }

    const bundledSource = sources.find((source) => source.origin === 'bundled');
    const bundledUpdateAvailable =
      !bundledSource ||
      bundledSource.xmlText !== bundledFiles.xmlText ||
      bundledSource.propertiesText !== bundledFiles.propertiesText;

    return this.createWorkspace(sources, bundledUpdateAvailable);
  }

  async importXmlFile(file: File, replaceSourceId?: string): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.xml')) {
      throw new Error(`« ${file.name} » n’est pas un fichier XML.`);
    }

    const xmlText = await file.text();
    buildVettingCatalog(xmlText);

    const sources = await this.storage.getSources();
    const duplicate = sources.find(
      (source) =>
        source.fileName.toLocaleLowerCase('fr-FR') === file.name.toLocaleLowerCase('fr-FR'),
    );
    if (duplicate && duplicate.id !== replaceSourceId) {
      throw new Error(`Un jeu de règles nommé « ${file.name} » existe déjà.`);
    }
    if (replaceSourceId && duplicate?.id !== replaceSourceId) {
      throw new Error(`Le jeu de règles à remplacer pour « ${file.name} » n’existe plus.`);
    }

    const previous = duplicate;
    const metadata = inferVettingFileMetadata(file.name);
    const source: StoredVettingSource = {
      id: previous?.id ?? crypto.randomUUID(),
      fileName: file.name,
      adherent: previous?.adherent ?? metadata.adherent,
      offer: previous?.offer ?? metadata.offer,
      origin: previous?.origin ?? 'imported',
      xmlText,
      propertiesText: previous?.propertiesText ?? '',
      propertiesFileName: previous?.propertiesFileName ?? null,
    };
    buildVettingCatalog(source.xmlText, source.propertiesText, this.sourceMetadata(source));
    await this.storage.putSource(source);
  }

  async updateSourceMetadata(id: string, adherent: string, offer: string): Promise<void> {
    const source = await this.getSource(id);
    await this.storage.putSource({
      ...source,
      adherent: adherent.trim(),
      offer: offer.trim(),
    });
  }

  async attachPropertiesFile(id: string, file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.properties')) {
      throw new Error(`« ${file.name} » n’est pas un fichier .properties.`);
    }
    const propertiesText = await readPropertiesFile(file);
    parseJavaProperties(propertiesText);
    const source = await this.getSource(id);
    buildVettingCatalog(source.xmlText, propertiesText, this.sourceMetadata(source));
    await this.storage.putSource({
      ...source,
      propertiesText,
      propertiesFileName: file.name,
    });
  }

  async removeSource(id: string): Promise<void> {
    await this.getSource(id);
    await this.storage.deleteSource(id);
  }

  async updateBundledSource(): Promise<void> {
    const bundledFiles = await this.loadBundledFiles();
    const sources = await this.storage.getSources();
    const previous =
      sources.find((source) => source.origin === 'bundled') ??
      sources.find(
        (source) => source.fileName.toLocaleLowerCase('fr-FR') === bundledXmlName.toLowerCase(),
      );
    const source: StoredVettingSource = {
      id: previous?.id ?? bundledSourceId,
      fileName: bundledXmlName,
      adherent: previous?.adherent ?? inferVettingFileMetadata(bundledXmlName).adherent,
      offer: previous?.offer ?? inferVettingFileMetadata(bundledXmlName).offer,
      origin: 'bundled',
      xmlText: bundledFiles.xmlText,
      propertiesText: bundledFiles.propertiesText,
      propertiesFileName: bundledPropertiesName,
    };
    buildVettingCatalog(source.xmlText, source.propertiesText, this.sourceMetadata(source));
    await this.storage.putSource(source);
    await this.storage.putMetadata(initializedMetadataKey, true);
  }

  private async getSource(id: string): Promise<StoredVettingSource> {
    const source = (await this.storage.getSources()).find((item) => item.id === id);
    if (!source) {
      throw new Error('Le jeu de règles demandé n’existe plus dans le stockage local.');
    }
    return source;
  }

  private async loadBundledFiles(): Promise<{ xmlText: string; propertiesText: string }> {
    this.bundledFilesPromise ??= firstValueFrom(
      forkJoin({
        xmlText: this.http.get(`/vetting-data/${bundledXmlName}`, { responseType: 'text' }),
        propertiesText: this.http.get(`/vetting-data/${bundledPropertiesName}`, {
          responseType: 'text',
        }),
      }),
    );
    return this.bundledFilesPromise;
  }

  private sourceMetadata(source: StoredVettingSource): VettingSourceMetadata {
    return {
      id: source.id,
      fileName: source.fileName,
      adherent: source.adherent,
      offer: source.offer,
    };
  }

  private createWorkspace(
    sources: readonly StoredVettingSource[],
    bundledUpdateAvailable: boolean,
  ): VettingCatalogWorkspace {
    const orderedSources = [...sources].sort((left, right) =>
      left.fileName.localeCompare(right.fileName, 'fr-FR'),
    );
    const catalogs = orderedSources.map((source) =>
      buildVettingCatalog(source.xmlText, source.propertiesText, this.sourceMetadata(source)),
    );
    const operations = catalogs.flatMap((catalog) => catalog.operations);
    const rules = catalogs.flatMap((catalog) => catalog.rules);

    return {
      catalog: {
        operations,
        rules,
        profiles: [...new Set(rules.flatMap((rule) => Object.keys(rule.profiles)))].sort(),
        behaviors: [...new Set(rules.flatMap((rule) => Object.values(rule.profiles)))].sort(),
      },
      sources: orderedSources,
      bundledUpdateAvailable,
    };
  }
}
