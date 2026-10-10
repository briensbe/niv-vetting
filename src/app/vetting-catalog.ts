export interface VettingRule {
  readonly key: string;
  readonly moduleId: string;
  readonly moduleLabel: string;
  readonly operationKey?: string;
  readonly familyId: string;
  readonly familyLabel: string;
  readonly familyKey?: string;
  readonly packageName: string;
  readonly id: string;
  readonly label: string;
  readonly description: string | null;
  readonly messageVariants: readonly RuleMessageVariant[];
  readonly active: boolean;
  readonly profiles: Readonly<Record<string, string>>;
  readonly sourceId?: string;
  readonly sourceName?: string;
  readonly adherent?: string;
  readonly offer?: string;
}

export interface RuleMessageVariant {
  readonly context: string;
  readonly message: string;
}

export interface RuleFamily {
  readonly id: string;
  readonly key?: string;
  readonly hasDeclaredId: boolean;
  readonly label: string;
  readonly packageName: string;
  readonly rules: readonly VettingRule[];
}

export interface VettingOperation {
  readonly id: string;
  readonly key?: string;
  readonly label: string;
  readonly families: readonly RuleFamily[];
  readonly ruleCount: number;
  readonly sourceId?: string;
  readonly sourceName?: string;
  readonly adherent?: string;
  readonly offer?: string;
}

export interface VettingCatalog {
  readonly operations: readonly VettingOperation[];
  readonly rules: readonly VettingRule[];
  readonly profiles: readonly string[];
  readonly behaviors: readonly string[];
}

export interface VettingSourceMetadata {
  readonly id: string;
  readonly fileName: string;
  readonly adherent: string;
  readonly offer: string;
}

function localElements(parent: Element, localName: string): Element[] {
  return Array.from(parent.children).filter((element) => element.localName === localName);
}

function requiredAttribute(element: Element, name: string): string {
  const value = element.getAttribute(name)?.trim();
  if (!value) {
    throw new Error(`Attribut XML requis manquant : ${name} sur <${element.localName}>.`);
  }
  return value;
}

export function parseVettingXml(xmlText: string): VettingOperation[] {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) {
    throw new Error(
      `Le fichier XML est invalide : ${parserError.textContent?.trim() ?? 'erreur inconnue'}`,
    );
  }

  const root = document.documentElement;
  if (root.localName !== 'vetting-configuration') {
    throw new Error(`Élément racine XML inattendu : <${root.localName}>.`);
  }

  const operations = localElements(root, 'module').map((moduleElement) => {
    const id = requiredAttribute(moduleElement, 'id');
    const families = localElements(moduleElement, 'rule-set').map((familyElement, familyIndex) => {
      const packageElement = localElements(familyElement, 'package')[0];
      if (!packageElement?.textContent?.trim()) {
        throw new Error(`Package absent pour une famille de l’opération « ${id} ».`);
      }
      const packageName = packageElement.textContent.trim();
      const declaredFamilyId = familyElement.getAttribute('id')?.trim();
      const familyId = declaredFamilyId || `package-family-${familyIndex + 1}`;
      const familyLabel = declaredFamilyId || deriveFamilyLabel(packageName);

      const rules = localElements(familyElement, 'rule-def').map((ruleElement, index) => {
        const ruleId = requiredAttribute(ruleElement, 'id');
        const activeValue = requiredAttribute(ruleElement, 'active').toLowerCase();
        if (activeValue !== 'true' && activeValue !== 'false') {
          throw new Error(`État « active » invalide pour la règle « ${ruleId} ».`);
        }

        const profiles: Record<string, string> = {};
        for (const profileElement of localElements(ruleElement, 'profile')) {
          const profileId = requiredAttribute(profileElement, 'id');
          profiles[profileId] = profileElement.textContent?.trim() ?? '';
        }

        return {
          key: `${id}::${familyId}::${familyIndex}::${ruleId}::${index}`,
          moduleId: id,
          moduleLabel: id,
          familyId,
          familyLabel,
          packageName,
          id: ruleId,
          label: ruleId,
          description: null,
          messageVariants: [],
          active: activeValue === 'true',
          profiles,
        } satisfies VettingRule;
      });

      return {
        id: familyId,
        key: `${id}::${familyId}`,
        hasDeclaredId: Boolean(declaredFamilyId),
        label: familyLabel,
        packageName,
        rules,
      } satisfies RuleFamily;
    });

    return {
      id,
      key: id,
      label: id,
      families,
      ruleCount: families.reduce((count, family) => count + family.rules.length, 0),
    } satisfies VettingOperation;
  });

  if (operations.length === 0) {
    throw new Error('Le fichier XML ne contient aucune opération.');
  }
  if (!operations.some((operation) => operation.ruleCount > 0)) {
    throw new Error('Le fichier XML ne contient aucune occurrence de règle.');
  }

  return operations;
}

function deriveFamilyLabel(packageName: string): string {
  const familyPath = packageName
    .replace(/^com\.netfinca\.vetting\./, '')
    .replace(/(?:\.rules)?\.Rule$/, '');
  return (
    familyPath
      .split('.')
      .filter(Boolean)
      .map((part) => part.replace(/([a-z])([A-Z])/g, '$1 $2'))
      .join(' / ') || packageName
  );
}

function unescapeProperty(value: string, lineNumber: number): string {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== '\\') {
      result += character;
      continue;
    }

    index += 1;
    if (index >= value.length) {
      result += '\\';
      break;
    }

    const escaped = value[index];
    switch (escaped) {
      case 't':
        result += '\t';
        break;
      case 'n':
        result += '\n';
        break;
      case 'r':
        result += '\r';
        break;
      case 'f':
        result += '\f';
        break;
      case 'u': {
        const code = value.slice(index + 1, index + 5);
        if (!/^[\da-fA-F]{4}$/.test(code)) {
          throw new Error(`Échappement Unicode invalide dans les propriétés, ligne ${lineNumber}.`);
        }
        result += String.fromCharCode(Number.parseInt(code, 16));
        index += 4;
        break;
      }
      default:
        result += escaped;
    }
  }
  return result;
}

function decodeNumericHtmlEntities(value: string): string {
  return value.replace(/&#(x[\da-f]+|\d+);/gi, (entity, encodedCode: string) => {
    const codePoint =
      encodedCode[0].toLowerCase() === 'x'
        ? Number.parseInt(encodedCode.slice(1), 16)
        : Number.parseInt(encodedCode, 10);
    if (
      !Number.isInteger(codePoint) ||
      codePoint < 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      return entity;
    }
    return String.fromCodePoint(codePoint);
  });
}

function parsePropertyLine(line: string, lineNumber: number): [string, string] | null {
  let start = 0;
  while (start < line.length && /[\t\f ]/.test(line[start])) {
    start += 1;
  }
  if (start === line.length || line[start] === '#' || line[start] === '!') {
    return null;
  }

  let separator = start;
  let escaped = false;
  while (separator < line.length) {
    const character = line[separator];
    if (!escaped && (character === '=' || character === ':' || /[\t\f ]/.test(character))) {
      break;
    }
    if (character === '\\' && !escaped) {
      escaped = true;
    } else {
      escaped = false;
    }
    separator += 1;
  }

  const rawKey = line.slice(start, separator);
  let valueStart = separator;
  while (valueStart < line.length && /[\t\f ]/.test(line[valueStart])) {
    valueStart += 1;
  }
  if (line[valueStart] === '=' || line[valueStart] === ':') {
    valueStart += 1;
  }
  while (valueStart < line.length && /[\t\f ]/.test(line[valueStart])) {
    valueStart += 1;
  }

  return [
    unescapeProperty(rawKey, lineNumber),
    decodeNumericHtmlEntities(unescapeProperty(line.slice(valueStart), lineNumber)),
  ];
}

export function parseJavaProperties(source: string): Map<string, string> {
  const physicalLines = source.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  const properties = new Map<string, string>();
  let logicalLine = '';
  let logicalStartLine = 1;
  let continuing = false;

  physicalLines.forEach((physicalLine, index) => {
    if (!continuing) {
      logicalStartLine = index + 1;
      logicalLine = physicalLine;
    } else {
      logicalLine += physicalLine.replace(/^[\t\f ]+/, '');
    }

    let trailingSlashes = 0;
    for (
      let cursor = logicalLine.length - 1;
      cursor >= 0 && logicalLine[cursor] === '\\';
      cursor -= 1
    ) {
      trailingSlashes += 1;
    }
    continuing = trailingSlashes % 2 === 1;
    if (continuing) {
      logicalLine = logicalLine.slice(0, -1);
      return;
    }

    const property = parsePropertyLine(logicalLine, logicalStartLine);
    if (property) {
      properties.set(property[0], property[1]);
    }
    logicalLine = '';
  });

  if (continuing) {
    const property = parsePropertyLine(logicalLine, logicalStartLine);
    if (property) {
      properties.set(property[0], property[1]);
    }
  }

  if (properties.size === 0) {
    throw new Error('Le fichier de libellés ne contient aucune propriété exploitable.');
  }
  return properties;
}

export function buildVettingCatalog(
  xmlText: string,
  propertiesText = '',
  source?: VettingSourceMetadata,
): VettingCatalog {
  const properties: Map<string, string> = propertiesText.trim()
    ? parseJavaProperties(propertiesText)
    : new Map<string, string>();
  const sourceId = source?.id ?? 'catalog';
  const operations = parseVettingXml(xmlText).map((operation) => {
    const operationLabel = properties.get(`module.${operation.id}`) ?? operation.id;
    const operationKey = `${sourceId}::${operation.id}`;
    const families = operation.families.map((family) => ({
      ...family,
      key: `${operationKey}::${family.id}`,
      rules: family.rules.map((rule) => ({
        ...rule,
        key: `${sourceId}::${rule.key}`,
        operationKey,
        familyKey: `${operationKey}::${family.id}`,
        sourceId,
        sourceName: source?.fileName ?? '',
        adherent: source?.adherent ?? '',
        offer: source?.offer ?? '',
        moduleLabel: operationLabel,
        label: properties.get(rule.id) ?? rule.id,
        description: properties.get(`${rule.id}.description`) ?? null,
        messageVariants: [...properties.entries()]
          .filter(
            ([key, value]) =>
              (key === rule.id || key.startsWith(`${rule.id}.`)) &&
              key !== `${rule.id}.description` &&
              value.trim().length > 0,
          )
          .map(([key, message]) => ({
            context: key === rule.id ? 'Libellé par défaut' : key.slice(rule.id.length + 1),
            message,
          })),
      })),
    }));

    return {
      ...operation,
      key: operationKey,
      label: operationLabel,
      sourceId,
      sourceName: source?.fileName ?? '',
      adherent: source?.adherent ?? '',
      offer: source?.offer ?? '',
      families,
      ruleCount: families.reduce((count, family) => count + family.rules.length, 0),
    };
  });
  const rules = operations.flatMap((operation) =>
    operation.families.flatMap((family) => family.rules),
  );
  const profiles = [...new Set(rules.flatMap((rule) => Object.keys(rule.profiles)))].sort();
  const behaviors = [...new Set(rules.flatMap((rule) => Object.values(rule.profiles)))].sort();

  return { operations, rules, profiles, behaviors };
}
