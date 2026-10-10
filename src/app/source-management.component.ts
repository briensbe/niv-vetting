import { Component, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { StoredVettingSource } from './vetting-catalog-storage';
import { VettingRule } from './vetting-catalog';
import { VettingCatalogService } from './vetting-catalog.service';
import { formatCount } from './rule-comparison';

@Component({
  selector: 'app-source-management',
  standalone: true,
  templateUrl: './source-management.component.html',
  styleUrl: './source-management.component.css',
})
export class SourceManagementComponent {
  private readonly catalogService = inject(VettingCatalogService);

  readonly sources = input<readonly StoredVettingSource[]>([]);
  readonly rules = input<readonly VettingRule[]>([]);
  readonly bundledUpdateAvailable = input<boolean>(false);

  readonly workspaceUpdated = output<void>();

  protected readonly managementMessage = signal('');
  protected readonly managementError = signal('');

  protected sourceRuleCount(sourceId: string): number {
    return this.rules().filter((rule) => rule.sourceId === sourceId).length;
  }

  protected formatCount(value: number): string {
    return formatCount(value);
  }

  protected async onXmlFilesChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.managementError.set('');
    this.managementMessage.set('');
    const imported: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const duplicate = this.sources().find(
          (source) =>
            source.fileName.toLocaleLowerCase('fr-FR') === file.name.toLocaleLowerCase('fr-FR'),
        );
        let replaceSourceId: string | undefined;
        if (duplicate) {
          const shouldReplace = window.confirm(
            `Un jeu de règles nommé « ${file.name} » existe déjà. Voulez-vous le remplacer ?`,
          );
          if (!shouldReplace) {
            continue;
          }
          replaceSourceId = duplicate.id;
        }
        await this.catalogService.importXmlFile(file, replaceSourceId);
        imported.push(file.name);
      } catch (error: unknown) {
        errors.push(`${file.name} : ${this.describeError(error)}`);
      }
    }

    if (imported.length > 0) {
      this.managementMessage.set(
        `${imported.length} fichier${imported.length > 1 ? 's' : ''} XML importé${imported.length > 1 ? 's' : ''}.`,
      );
      this.workspaceUpdated.emit();
    }
    this.managementError.set(errors.join('\n'));
  }

  protected async onSourceMetadataChange(
    source: StoredVettingSource,
    field: 'adherent' | 'offer',
    event: Event,
  ): Promise<void> {
    const value = (event.target as HTMLInputElement).value;
    const adherent = field === 'adherent' ? value : source.adherent;
    const offer = field === 'offer' ? value : source.offer;
    try {
      await this.catalogService.updateSourceMetadata(source.id, adherent, offer);
      this.workspaceUpdated.emit();
    } catch (error: unknown) {
      this.managementError.set(this.describeError(error));
    }
  }

  protected async onPropertiesFileChange(
    source: StoredVettingSource,
    event: Event,
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.managementError.set('');
    this.managementMessage.set('');
    try {
      await this.catalogService.attachPropertiesFile(source.id, file);
      this.managementMessage.set(`Libellés associés à « ${source.fileName} ».`);
      this.workspaceUpdated.emit();
    } catch (error: unknown) {
      this.managementError.set(`${file.name} : ${this.describeError(error)}`);
    }
  }

  protected async removeSource(source: StoredVettingSource): Promise<void> {
    if (!window.confirm(`Supprimer « ${source.fileName} » du stockage local de ce navigateur ?`)) {
      return;
    }
    this.managementError.set('');
    this.managementMessage.set('');
    try {
      await this.catalogService.removeSource(source.id);
      this.managementMessage.set(`« ${source.fileName} » a été supprimé du stockage local.`);
      this.workspaceUpdated.emit();
    } catch (error: unknown) {
      this.managementError.set(this.describeError(error));
    }
  }

  protected async updateBundledSource(): Promise<void> {
    this.managementError.set('');
    this.managementMessage.set('');
    try {
      await this.catalogService.updateBundledSource();
      this.managementMessage.set('Le jeu de règles intégré a été mis à jour.');
      this.workspaceUpdated.emit();
    } catch (error: unknown) {
      this.managementError.set(this.describeError(error));
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return `Chargement impossible (HTTP ${error.status}). Vérifiez les ressources du catalogue.`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Une erreur inconnue empêche le chargement du catalogue.';
  }
}
